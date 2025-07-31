/**
 * Full Screen Enforcement Feature Module
 * 
 * This module handles fullscreen enforcement and violation logging.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - API service
 * 
 * Usage:
 *   import { useFullscreenEnforcement, FullscreenWarning } from './features/proctoring/fullscreen_enforcement';
 *   
 *   // Use the hook in a component
 *   const { isFullscreen, violations, logViolation } = useFullscreenEnforcement(sessionId);
 *   
 *   // Display warning component
 *   <FullscreenWarning isFullscreen={isFullscreen} />
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/api';

/**
 * Hook for monitoring fullscreen enforcement
 * @param {number} sessionId - The test session ID
 * @returns {object} - Fullscreen enforcement monitoring state and functions
 */
export const useFullscreenEnforcement = (sessionId) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [violations, setViolations] = useState([]);
    const [lastViolation, setLastViolation] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Check if currently in fullscreen
    const checkFullscreen = useCallback(() => {
        return !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement || 
                 document.msFullscreenElement);
    }, []);

    // Request fullscreen
    const requestFullscreen = useCallback(async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                await document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.msRequestFullscreen) {
                await document.documentElement.msRequestFullscreen();
            }
            setIsFullscreen(true);
        } catch (error) {
            console.error('Error requesting fullscreen:', error);
            throw error;
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
            setIsFullscreen(false);
        } catch (error) {
            console.error('Error exiting fullscreen:', error);
            throw error;
        }
    }, []);

    // Log a fullscreen exit violation
    const logViolation = useCallback(async (screenshotPath = null, additionalInfo = null) => {
        try {
            const response = await api.post('/api/proctoring/fullscreen-enforcement/violation', {
                session_id: sessionId,
                screenshot_path: screenshotPath,
                additional_info: additionalInfo
            });
            
            setLastViolation(response.data);
            setViolations(prev => [response.data, ...prev]);
            
            console.warn('Fullscreen exit violation logged:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error logging fullscreen exit violation:', error);
            throw error;
        }
    }, [sessionId]);

    // Get session violations
    const getViolations = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/fullscreen-enforcement/session/${sessionId}/violations`);
            setViolations(response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting fullscreen violations:', error);
            throw error;
        }
    }, [sessionId]);

    // Get fullscreen status
    const getStatus = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/fullscreen-enforcement/session/${sessionId}/status`);
            setIsFullscreen(response.data.is_fullscreen);
            setLastViolation(response.data.last_violation);
            return response.data;
        } catch (error) {
            console.error('Error getting fullscreen status:', error);
            throw error;
        }
    }, [sessionId]);

    // Start monitoring fullscreen
    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
        
        // Set initial fullscreen state
        setIsFullscreen(checkFullscreen());
        
        // Track fullscreen changes
        const handleFullscreenChange = () => {
            const fullscreen = checkFullscreen();
            setIsFullscreen(fullscreen);
            
            if (!fullscreen) {
                logViolation(null, 'Fullscreen exited');
            }
        };

        // Add event listeners
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        // Return cleanup function
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [checkFullscreen, logViolation]);

    // Stop monitoring
    const stopMonitoring = useCallback(() => {
        setIsMonitoring(false);
    }, []);

    // Initialize monitoring when sessionId changes
    useEffect(() => {
        if (sessionId && !isMonitoring) {
            const cleanup = startMonitoring();
            return cleanup;
        }
    }, [sessionId, isMonitoring, startMonitoring]);

    // Get initial status
    useEffect(() => {
        if (sessionId) {
            getStatus();
            getViolations();
        }
    }, [sessionId, getStatus, getViolations]);

    return {
        isFullscreen,
        violations,
        lastViolation,
        isMonitoring,
        logViolation,
        getViolations,
        getStatus,
        requestFullscreen,
        exitFullscreen,
        startMonitoring,
        stopMonitoring
    };
};

/**
 * Fullscreen Warning Component
 * @param {object} props - Component props
 * @param {boolean} props.isFullscreen - Whether the window is currently in fullscreen
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Warning component
 */
export const FullscreenWarning = ({ isFullscreen, className = '' }) => {
    if (isFullscreen) return null;

    return (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 ${className}`}>
            <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Fullscreen Required!</span>
            </div>
            <p className="text-sm mt-1">Please enter fullscreen mode to continue the test.</p>
        </div>
    );
};

/**
 * Fullscreen Status Component
 * @param {object} props - Component props
 * @param {boolean} props.isFullscreen - Whether the window is currently in fullscreen
 * @param {number} props.violationCount - Number of violations
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Status component
 */
export const FullscreenStatus = ({ isFullscreen, violationCount = 0, className = '' }) => {
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`w-3 h-3 rounded-full ${isFullscreen ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
                Fullscreen: {isFullscreen ? 'Active' : 'Inactive'}
            </span>
            {violationCount > 0 && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    {violationCount} exit{violationCount !== 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
};

// Export all components and hooks
export default {
    useFullscreenEnforcement,
    FullscreenWarning,
    FullscreenStatus
}; 