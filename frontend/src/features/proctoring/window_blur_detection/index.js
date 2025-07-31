/**
 * Window Blur Detection Feature Module
 * 
 * This module handles window blur detection and violation logging.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - API service
 * 
 * Usage:
 *   import { useWindowBlurMonitor, WindowBlurWarning } from './features/proctoring/window_blur_detection';
 *   
 *   // Use the hook in a component
 *   const { isFocused, violations, logViolation } = useWindowBlurMonitor(sessionId);
 *   
 *   // Display warning component
 *   <WindowBlurWarning isFocused={isFocused} />
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/api';

/**
 * Hook for monitoring window blur violations
 * @param {number} sessionId - The test session ID
 * @returns {object} - Window blur monitoring state and functions
 */
export const useWindowBlurMonitor = (sessionId) => {
    const [isFocused, setIsFocused] = useState(true);
    const [violations, setViolations] = useState([]);
    const [lastViolation, setLastViolation] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Log a window blur violation
    const logViolation = useCallback(async (durationSeconds = null, screenshotPath = null, additionalInfo = null) => {
        try {
            const response = await api.post('/api/proctoring/window-blur/violation', {
                session_id: sessionId,
                duration_seconds: durationSeconds,
                screenshot_path: screenshotPath,
                additional_info: additionalInfo
            });
            
            setLastViolation(response.data);
            setViolations(prev => [response.data, ...prev]);
            
            console.warn('Window blur violation logged:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error logging window blur violation:', error);
            throw error;
        }
    }, [sessionId]);

    // Get session violations
    const getViolations = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/window-blur/session/${sessionId}/violations`);
            setViolations(response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting window blur violations:', error);
            throw error;
        }
    }, [sessionId]);

    // Get window blur status
    const getStatus = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/window-blur/session/${sessionId}/status`);
            setIsFocused(response.data.is_focused);
            setLastViolation(response.data.last_violation);
            return response.data;
        } catch (error) {
            console.error('Error getting window blur status:', error);
            throw error;
        }
    }, [sessionId]);

    // Start monitoring window blur
    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
        
        // Track when window loses focus
        const handleBlur = () => {
            setIsFocused(false);
            logViolation(null, null, 'Window lost focus');
        };

        const handleFocus = () => {
            setIsFocused(true);
        };

        // Add event listeners
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        // Return cleanup function
        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [logViolation]);

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
        isFocused,
        violations,
        lastViolation,
        isMonitoring,
        logViolation,
        getViolations,
        getStatus,
        startMonitoring,
        stopMonitoring
    };
};

/**
 * Window Blur Warning Component
 * @param {object} props - Component props
 * @param {boolean} props.isFocused - Whether the window is currently focused
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Warning component
 */
export const WindowBlurWarning = ({ isFocused, className = '' }) => {
    if (isFocused) return null;

    return (
        <div className={`fixed top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 ${className}`}>
            <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Window Focus Lost!</span>
            </div>
            <p className="text-sm mt-1">Please return focus to the test window immediately.</p>
        </div>
    );
};

/**
 * Window Blur Status Component
 * @param {object} props - Component props
 * @param {boolean} props.isFocused - Whether the window is currently focused
 * @param {number} props.violationCount - Number of violations
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Status component
 */
export const WindowBlurStatus = ({ isFocused, violationCount = 0, className = '' }) => {
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`w-3 h-3 rounded-full ${isFocused ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
                Window Focus: {isFocused ? 'Focused' : 'Unfocused'}
            </span>
            {violationCount > 0 && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    {violationCount} violation{violationCount !== 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
};

// Export all components and hooks
export default {
    useWindowBlurMonitor,
    WindowBlurWarning,
    WindowBlurStatus
}; 