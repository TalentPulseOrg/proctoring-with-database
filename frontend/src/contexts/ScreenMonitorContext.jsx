import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordViolation, saveScreenCapture, getProctoringData, startTestSession } from '../api/api';
import { useWarning } from './WarningContext';
import { useEnhancedViolationLogger } from '../hooks/useEnhancedViolationLogger';

const ScreenMonitorContext = createContext();

export const useScreenMonitor = () => {
    const context = useContext(ScreenMonitorContext);
    if (!context) {
        throw new Error('useScreenMonitor must be used within a ScreenMonitorProvider');
    }
    return context;
};

export const ScreenMonitorProvider = ({ children }) => {
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [error, setError] = useState(null);
    // Removed unused warningCount state - using WarningContext instead
    const [isTestActive, setIsTestActive] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const violationTimeoutRef = useRef(null);
    const isHandlingViolationRef = useRef(false);
    const fullscreenRetryRef = useRef(null);
    const keyHandlerRef = useRef(null);
    const captureIntervalRef = useRef(null);
    const { handleViolation: handleWarning } = useWarning();
    
    // Initialize enhanced violation logger
    const violationLogger = useEnhancedViolationLogger(sessionId);

    // Ref to prevent multiple logs for a single fullscreen exit
    const fullscreenExitHandledRef = useRef(false);

    // Helper: Log all fullscreen element properties for debugging
    const logFullscreenState = () => {
        console.log('[DEBUG][ScreenMonitorContext] document.fullscreenElement:', document.fullscreenElement);
        console.log('[DEBUG][ScreenMonitorContext] document.webkitFullscreenElement:', document.webkitFullscreenElement);
        console.log('[DEBUG][ScreenMonitorContext] document.mozFullScreenElement:', document.mozFullScreenElement);
        console.log('[DEBUG][ScreenMonitorContext] document.msFullscreenElement:', document.msFullscreenElement);
    };

    // Get the correct fullscreen element for the browser
    const getFullscreenElement = () => {
        return document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement;
    };

    // Get the correct requestFullscreen method for the browser
    const getRequestFullscreenMethod = (element) => {
        return element.requestFullscreen ||
            element.webkitRequestFullscreen ||
            element.mozRequestFullScreen ||
            element.msRequestFullscreen;
    };

    // Enhanced violation logging when session ID changes
    useEffect(() => {
        console.log('Session ID changed to:', sessionId, 'violationLogger available:', !!violationLogger);
        if (sessionId && violationLogger) {
            console.log('Starting violation logging for session:', sessionId);
            const started = violationLogger.startLogging();
            console.log('Violation logging started:', started);
        }
        return () => {
            if (violationLogger) {
                console.log('Stopping violation logging');
                violationLogger.stopLogging();
            }
        };
    }, [sessionId]); // Removed violationLogger from dependencies to prevent infinite loop

    // Global key handler to prevent Escape key
    const preventEscapeKey = useCallback((e) => {
        let violationType = null;
        let keyDescription = '';
        
        // Prevent function keys (F1-F12)
        if (e.key.startsWith('F') && e.key.length <= 3) {
            e.preventDefault();
            e.stopPropagation();
            violationType = 'function_key';
            keyDescription = e.key;
            handleWarning('keyboard_shortcut');
            // Log keyboard shortcut violation
            if (violationLogger) {
                violationLogger.logKeyboardShortcut(keyDescription);
            }
            return false;
        }

        // Prevent inspect element shortcuts
        if (e.ctrlKey && e.shiftKey && 
            (e.key === 'I' || e.key === 'i' || 
             e.key === 'C' || e.key === 'c' || 
             e.key === 'J' || e.key === 'j' || 
             e.key === 'K' || e.key === 'k')) {
            e.preventDefault();
            e.stopPropagation();
            violationType = 'inspect_element';
            keyDescription = `Ctrl+Shift+${e.key.toUpperCase()}`;
            handleWarning('inspect_element_attempt');
            // Log keyboard shortcut violation
            if (violationLogger) {
                violationLogger.logKeyboardShortcut(keyDescription);
            }
            return false;
        }
        
        // Note: BrowserControlsContext handles Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+F, Ctrl+P, Ctrl+S, Ctrl+U
        // Skip those to avoid double warning decrements
        if (e.ctrlKey && !e.shiftKey && !e.altKey && 
            (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V' || e.key === 'x' || e.key === 'X' ||
             e.key === 'a' || e.key === 'A' || e.key === 'f' || e.key === 'F' || e.key === 'p' || e.key === 'P' ||
             e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) {
            // Let BrowserControlsContext handle these shortcuts completely
            return true; 
        }
        
        // Prevent Alt+Tab (though this is harder to catch)
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            violationType = 'alt_tab';
            keyDescription = 'Alt+Tab';
            handleWarning('keyboard_shortcut');
            // Log keyboard shortcut violation
            if (violationLogger) {
                violationLogger.logKeyboardShortcut(keyDescription);
            }
            return false;
        }

        // Prevent Escape key
        if (e.key === 'Escape' || e.keyCode === 27) {
            e.preventDefault();
            e.stopPropagation();
            violationType = 'escape_key';
            keyDescription = 'Escape';
            handleWarning('escape_key_pressed');
            // Log keyboard shortcut violation
            if (violationLogger) {
                violationLogger.logKeyboardShortcut(keyDescription);
            }
            return false;
        }
    }, [handleWarning]); // Removed violationLogger from dependencies

    // Initialize proctoring session
    const initSession = async (testId) => {
        try {
            setLoading(true);
            setError(null);
            
            // Get user info from localStorage or use defaults for testing
            const storedUser = localStorage.getItem('user_data');
            let userEmail = 'test@example.com'; // Default for testing
            let userName = 'Test User'; // Default for testing
            let userId = 1; // Default for testing
            
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    userEmail = userData.email || userEmail;
                    userName = userData.name || userData.username || userName;
                    userId = userData.id || userData.user_id || userId;
                } catch (e) {
                    console.warn('Failed to parse stored user data:', e);
                }
            }
            
            // Create a proper test session using the API
            const sessionData = {
                test_id: testId,
                user_id: userId,
                user_email: userEmail,
                user_name: userName,
                start_time: new Date().toISOString()
            };
            
            console.log('Creating test session with data:', sessionData);
            const response = await startTestSession(sessionData);
            
            if (response.error) {
                console.error('Failed to create test session:', response.message);
                setError('Failed to start proctoring session: ' + response.message);
                return null;
            }
            
            const sessionId = response.session_id || response.id;
            console.log('Test session created with ID:', sessionId);
            setSessionId(sessionId);
            return sessionId;
        } catch (err) {
            console.error('Failed to initialize proctoring session:', err);
            setError('Failed to start proctoring session');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Handle fullscreen change with retry mechanism
    useEffect(() => {
        const handleFullscreenChange = () => {
            logFullscreenState();
            const isCurrentlyFullscreen = !!getFullscreenElement();
            setIsFullScreen(isCurrentlyFullscreen);
            console.log('[DEBUG][ScreenMonitorContext] fullscreenchange: isCurrentlyFullscreen:', isCurrentlyFullscreen, 'isTestActive:', isTestActive);

            if (!isCurrentlyFullscreen && isTestActive) {
                if (!fullscreenExitHandledRef.current) {
                    fullscreenExitHandledRef.current = true;
                    console.log('[DEBUG][ScreenMonitorContext] Fullscreen exited during test. Logging violation and warning.');
                    handleWarning('fullscreen_exit');
                    // Log fullscreen exit violation
                    if (violationLogger) {
                        violationLogger.logFullscreenExit();
                    } else {
                        console.log('[DEBUG][ScreenMonitorContext] No violationLogger available');
                    }
                } else {
                    console.log('[DEBUG][ScreenMonitorContext] Fullscreen exit already handled for this instance.');
                }
                // Only retry if we're not already trying
                if (!fullscreenRetryRef.current) {
                    fullscreenRetryRef.current = setInterval(() => {
                        if (!getFullscreenElement() && isTestActive) {
                            const element = document.documentElement;
                            const requestFullscreen = getRequestFullscreenMethod(element);
                            if (requestFullscreen) {
                                requestFullscreen.call(element).catch(error => {
                                    console.error('Error retrying fullscreen:', error);
                                    // Clear the retry interval if we get an error
                                    if (fullscreenRetryRef.current) {
                                        clearInterval(fullscreenRetryRef.current);
                                        fullscreenRetryRef.current = null;
                                    }
                                });
                            }
                        } else {
                            // Clear the retry interval if we're in fullscreen
                            if (fullscreenRetryRef.current) {
                                clearInterval(fullscreenRetryRef.current);
                                fullscreenRetryRef.current = null;
                            }
                        }
                    }, 1000); // Increased interval to 1 second to reduce conflicts
                }
            } else if (isCurrentlyFullscreen) {
                // Reset the handled ref when user re-enters fullscreen
                fullscreenExitHandledRef.current = false;
            }
        };

        // Listen for fullscreenchange events on both document and document.documentElement
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        if (document.documentElement !== document) {
            document.documentElement.addEventListener('fullscreenchange', handleFullscreenChange);
            document.documentElement.addEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.documentElement.addEventListener('mozfullscreenchange', handleFullscreenChange);
            document.documentElement.addEventListener('MSFullscreenChange', handleFullscreenChange);
        }

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
            if (document.documentElement !== document) {
                document.documentElement.removeEventListener('fullscreenchange', handleFullscreenChange);
                document.documentElement.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
                document.documentElement.removeEventListener('mozfullscreenchange', handleFullscreenChange);
                document.documentElement.removeEventListener('MSFullscreenChange', handleFullscreenChange);
            }
            if (fullscreenRetryRef.current) {
                clearInterval(fullscreenRetryRef.current);
                fullscreenRetryRef.current = null;
            }
        };
    }, [isTestActive, handleWarning]);

    // Ref to prevent double warning decrement on tab switch (blur + visibilitychange)
    const lastViolationRef = useRef({ type: null, timestamp: 0 });
    const VIOLATION_DEBOUNCE_MS = 300;

    // Handle visibility change (tab switch)
    useEffect(() => {
        console.log('ScreenMonitorContext: Setting up visibility change handler, isTestActive:', isTestActive);
        const handleVisibilityChange = () => {
            if (document.hidden && isTestActive) {
                const now = Date.now();
                // If last violation was a blur within debounce window, skip this
                if (lastViolationRef.current.type === 'blur' && (now - lastViolationRef.current.timestamp) < VIOLATION_DEBOUNCE_MS) {
                    console.log('Skipping tab_switch warning due to recent blur event');
                } else {
                    console.log('ScreenMonitorContext: Calling handleWarning for tab_switch');
                    handleWarning('tab_switch');
                    lastViolationRef.current = { type: 'tab_switch', timestamp: now };
                    console.log('Warning decremented for tab switch');
                }
                // Log tab switch violation
                if (violationLogger) {
                    console.log('Calling violationLogger.logTabSwitch()');
                    violationLogger.logTabSwitch();
                } else {
                    console.log('violationLogger is not available');
                }
                // Force fullscreen when tab becomes visible again
                if (!document.hidden) {
                    const element = document.documentElement;
                    const requestFullscreen = getRequestFullscreenMethod(element);
                    if (requestFullscreen) {
                        requestFullscreen.call(element);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isTestActive, handleWarning]);

    // Handle window blur
    useEffect(() => {
        console.log('ScreenMonitorContext: Setting up window blur handler, isTestActive:', isTestActive);
        const handleBlur = () => {
            if (isTestActive) {
                const now = Date.now();
                // If last violation was a tab_switch within debounce window, skip this
                if (lastViolationRef.current.type === 'tab_switch' && (now - lastViolationRef.current.timestamp) < VIOLATION_DEBOUNCE_MS) {
                    console.log('Skipping window_blur warning due to recent tab_switch event');
                } else {
                    console.log('ScreenMonitorContext: Calling handleWarning for window_blur');
                    handleWarning('window_blur');
                    lastViolationRef.current = { type: 'blur', timestamp: now };
                    console.log('Warning decremented for window blur');
                }
                // Log window blur violation
                if (violationLogger) {
                    violationLogger.logWindowBlur();
                }
                // Force fullscreen when window regains focus
                window.addEventListener('focus', () => {
                    if (isTestActive && !getFullscreenElement()) {
                        const element = document.documentElement;
                        const requestFullscreen = getRequestFullscreenMethod(element);
                        if (requestFullscreen) {
                            requestFullscreen.call(element);
                        }
                    }
                }, { once: true });
            }
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [isTestActive, handleWarning]);

    // Record violation to API
    const recordViolationToAPI = async (violationType) => {
        if (!sessionId) return;
        
        try {
            const violationData = {
                session_id: sessionId,
                violation_type: violationType,
                details: { timestamp: new Date().toISOString() },
                timestamp: new Date().toISOString()
            };
            
            const response = await recordViolation(violationData);
            
            // Check if the response indicates an error
            if (response.error) {
                console.error(`Error recording violation: ${response.message}`);
            }
        } catch (error) {
            console.error('Error recording violation:', error);
        }
    };

    // Handle keyboard shortcut violations from BrowserControlsContext
    const handleKeyboardShortcutViolation = useCallback((keyCombination) => {
        if (violationLogger) {
            console.log('Logging keyboard shortcut violation from BrowserControlsContext:', keyCombination);
            violationLogger.logKeyboardShortcut(keyCombination);
        } else {
            console.warn('Violation logger not available for keyboard shortcut:', keyCombination);
        }
    }, [violationLogger]);

    // Handle violation with timeout and warning
    const handleScreenViolation = useCallback((violationType) => {
        if (isHandlingViolationRef.current) return;
        isHandlingViolationRef.current = true;

        // Handle warning
        handleWarning(violationType);
        
        // Reset handling flag after a short delay
        setTimeout(() => {
                isHandlingViolationRef.current = false;
        }, 1000);
    }, [handleWarning]);

    // Start periodic screen capture
    const startScreenCapture = useCallback((sid) => {
        if (!sid) return;
        
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
        }
        
        captureIntervalRef.current = setInterval(() => {
            recordScreenCapture(sid);
        }, 10000); // Capture every 10 seconds
    }, []);

    // Record screen capture to API
    const recordScreenCapture = async (sid) => {
        if (!isTestActive || !sid) return;
        
        try {
            // Capture the screen
            const canvas = document.createElement('canvas');
            const video = document.createElement('video');
            
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: { displaySurface: 'monitor' } 
                });
                
                // Set up video with stream
                video.srcObject = stream;
                video.onloadedmetadata = async () => {
                    try {
                        // Start playing the video
                        await video.play();
                        
                        // Set canvas dimensions
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        
                        // Draw video frame to canvas
                        const context = canvas.getContext('2d');
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // Convert to blob
                        canvas.toBlob(async (blob) => {
                            try {
                                // Stop all tracks
                                stream.getTracks().forEach(track => track.stop());
                                
                                if (blob) {
                                    // Send to API
                                    const response = await saveScreenCapture(sid, blob);
                                    
                                    // Check if the response indicates an error
                                    if (response.error) {
                                        console.error(`Error saving screen capture: ${response.message}`);
                                    }
                                }
                            } catch (error) {
                                console.error('Error sending screen capture:', error);
                            }
                        }, 'image/jpeg', 0.7); // Compressed JPEG
                    } catch (error) {
                        console.error('Error playing video:', error);
                        stream.getTracks().forEach(track => track.stop());
                    }
                };
            } catch (error) {
                console.error('Error accessing display media:', error);
            }
        } catch (error) {
            console.error('Error in screen capture:', error);
        }
    };

    // Terminate test and cleanup
    const terminateTest = useCallback(() => {
        // Clean up intervals
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
        }
        if (violationTimeoutRef.current) {
            clearTimeout(violationTimeoutRef.current);
        }
        if (fullscreenRetryRef.current) {
            clearInterval(fullscreenRetryRef.current);
        }
        
        // Remove event listeners
        if (keyHandlerRef.current) {
            document.removeEventListener('keydown', keyHandlerRef.current, true);
        }
        
        // Reset state
        setIsTestActive(false);
        setShowWarning(false);
        
        // Navigate to results page
        navigate('/test-results', { 
            state: { 
                terminated: true, 
                reason: 'Too many proctoring violations' 
            } 
        });
    }, [navigate]);

    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            if (captureIntervalRef.current) {
                clearInterval(captureIntervalRef.current);
            }
            if (violationTimeoutRef.current) {
                clearTimeout(violationTimeoutRef.current);
            }
        if (fullscreenRetryRef.current) {
            clearInterval(fullscreenRetryRef.current);
        }
        if (keyHandlerRef.current) {
            document.removeEventListener('keydown', keyHandlerRef.current, true);
        }
        };
    }, []);

    // Get proctoring data for a session
    const getProctoringDataForSession = async (sid) => {
        try {
            const data = await getProctoringData(sid);
            return data;
        } catch (error) {
            console.error('Error getting proctoring data:', error);
            return null;
        }
    };

    // Stop monitoring
    const stopMonitoring = useCallback(() => {
        // Clean up intervals
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
        }
        if (violationTimeoutRef.current) {
            clearTimeout(violationTimeoutRef.current);
        }
        if (fullscreenRetryRef.current) {
            clearInterval(fullscreenRetryRef.current);
        }
        
        // Remove event listeners
        if (keyHandlerRef.current) {
            document.removeEventListener('keydown', keyHandlerRef.current, true);
        }

        // Stop screenshot service
        if (sessionId) {
            // Assuming stopScreenshotService is defined elsewhere or will be added
            // For now, we'll just log if it's not available
            console.warn('stopScreenshotService is not defined in this context.');
        }
        
        // Reset state
        setIsTestActive(false);
        setShowWarning(false);
        setSessionId(null);
        setIsFullScreen(false);
    }, [sessionId]);

    // Check if fullscreen is supported
    const isFullscreenSupported = () => {
        return !!(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled
        );
    };

    // Request fullscreen
    const requestFullscreen = useCallback(async (element = document.documentElement) => {
        if (!isFullscreenSupported()) {
            throw new Error('Fullscreen is not supported in this browser');
        }

        try {
            // First, ensure we're not already in fullscreen
            if (getFullscreenElement()) {
                await exitFullscreen();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Now enter fullscreen
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                await element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }
            
            // Wait a moment to ensure fullscreen is active
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify fullscreen state
            if (!getFullscreenElement()) {
                throw new Error('Failed to enter fullscreen mode');
            }
            
            setIsFullScreen(true);
            return true;
        } catch (error) {
            console.error('Error entering fullscreen:', error);
            setError(error.message);
            setIsFullScreen(false);
            return false;
        }
    }, []);

    // Exit fullscreen
    const exitFullscreen = useCallback(async () => {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                await document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
            
            setIsFullScreen(false);
            return true;
        } catch (error) {
            console.error('Error exiting fullscreen:', error);
            setError(error.message);
            return false;
        }
    }, []);

    // Initialize fullscreen and monitoring
    const startMonitoring = useCallback(async (testId) => {
        // Initialize the session first
        const sid = await initSession(testId);
        if (!sid) {
            console.error('Failed to initialize proctoring session');
            return false;
        }

        // Set up global key handler immediately
        if (keyHandlerRef.current) {
            document.removeEventListener('keydown', keyHandlerRef.current, true);
        }
        keyHandlerRef.current = preventEscapeKey;
        document.addEventListener('keydown', keyHandlerRef.current, true);

        // Force fullscreen immediately
        const success = await requestFullscreen();
        if (!success) {
            console.error('Failed to enter fullscreen mode');
            handleWarning('fullscreen_error');
            return false;
        }

        setIsTestActive(true);
        startScreenCapture(sid);
        return true;
    }, [preventEscapeKey, handleWarning, requestFullscreen]);

    // Add keyboard event listener
    useEffect(() => {
      if (isTestActive) {
        document.addEventListener('keydown', preventEscapeKey, true);
        keyHandlerRef.current = preventEscapeKey;
      }
      return () => {
        if (keyHandlerRef.current) {
          document.removeEventListener('keydown', keyHandlerRef.current, true);
        }
      };
    }, [isTestActive, preventEscapeKey]);

    const value = {
        isMonitoring,
        isFullScreen,
        error,
        // Removed unused warningCount from value
        isTestActive,
        setIsTestActive,
        showWarning,
        warningMessage,
        sessionId,
        loading,
        requestFullscreen,
        exitFullscreen,
        startMonitoring,
        stopMonitoring,
        getProctoringData: getProctoringDataForSession,
        handleKeyboardShortcutViolation // Expose the new function
    };

    return (
        <ScreenMonitorContext.Provider value={value}>
            {children}
        </ScreenMonitorContext.Provider>
    );
} 