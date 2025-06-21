import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordViolation, saveScreenCapture, getProctoringData } from '../api/api';
import { useWarning } from './WarningContext';

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
    const [warningCount, setWarningCount] = useState(3);
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

    // Get the correct fullscreen method for the browser
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

    // Global key handler to prevent Escape key
    const preventEscapeKey = useCallback((e) => {
      // Prevent function keys (F1-F12)
      if (e.key.startsWith('F') && e.key.length <= 3) {
        e.preventDefault();
        e.stopPropagation();
        handleWarning('keyboard_shortcut');
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
        handleWarning('inspect_element_attempt');
        return false;
      }

      // Prevent Escape key
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        handleWarning('escape_key_pressed');
        return false;
      }
    }, [handleWarning]);

    // Initialize proctoring session
    const initSession = async (testId) => {
        try {
            setLoading(true);
            setError(null);
            // Here we would use a proper session initialization API
            // For now, we'll just set a session ID directly
            const sid = `test_${testId}_${Date.now()}`;
            setSessionId(sid);
            return sid;
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
            const isCurrentlyFullscreen = getFullscreenElement() !== null;
            setIsFullScreen(isCurrentlyFullscreen);

            if (!isCurrentlyFullscreen && isTestActive) {
                handleWarning('fullscreen_exit');
                
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
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
            if (fullscreenRetryRef.current) {
                clearInterval(fullscreenRetryRef.current);
                fullscreenRetryRef.current = null;
            }
        };
    }, [isTestActive, handleWarning]);

    // Handle visibility change (tab switch)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isTestActive) {
                handleWarning('tab_switch');
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
    }, [isTestActive]);

    // Handle window blur
    useEffect(() => {
        const handleBlur = () => {
            if (isTestActive) {
                handleWarning('window_blur');
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
    }, [isTestActive]);

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
            stopScreenshotService().catch(error => {
                console.error('Error stopping screenshot service:', error);
            });
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
        warningCount,
        isTestActive,
        showWarning,
        warningMessage,
        sessionId,
        loading,
        requestFullscreen,
        exitFullscreen,
        startMonitoring,
        stopMonitoring,
        getProctoringData: getProctoringDataForSession
    };

    return (
        <ScreenMonitorContext.Provider value={value}>
            {children}
        </ScreenMonitorContext.Provider>
    );
} 