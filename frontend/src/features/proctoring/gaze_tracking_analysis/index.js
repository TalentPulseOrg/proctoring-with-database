/**
 * Gaze Tracking Analysis Feature Module
 * 
 * This module handles gaze tracking analysis and violation logging.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - API service
 * 
 * Usage:
 *   import { useGazeTracking, GazeWarning } from './features/proctoring/gaze_tracking_analysis';
 *   
 *   // Use the hook in a component
 *   const { isLookingAtScreen, gazeDirection, logViolation } = useGazeTracking(sessionId);
 *   
 *   // Display warning component
 *   <GazeWarning isLookingAtScreen={isLookingAtScreen} />
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/api';

/**
 * Hook for monitoring gaze tracking analysis
 * @param {number} sessionId - The test session ID
 * @returns {object} - Gaze tracking monitoring state and functions
 */
export const useGazeTracking = (sessionId) => {
    const [isLookingAtScreen, setIsLookingAtScreen] = useState(true);
    const [gazeDirection, setGazeDirection] = useState('towards');
    const [confidenceLevel, setConfidenceLevel] = useState(null);
    const [violations, setViolations] = useState([]);
    const [lastViolation, setLastViolation] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Log a gaze violation
    const logViolation = useCallback(async (direction, duration, confidence, screenshotPath = null, additionalInfo = null) => {
        try {
            const response = await api.post('/api/proctoring/gaze-tracking/violation', {
                session_id: sessionId,
                gaze_direction: direction,
                duration_seconds: duration,
                confidence_level: confidence,
                is_looking_away: direction === 'away',
                screenshot_path: screenshotPath,
                additional_info: additionalInfo
            });
            
            setLastViolation(response.data);
            setViolations(prev => [response.data, ...prev]);
            
            console.warn('Gaze violation logged:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error logging gaze violation:', error);
            throw error;
        }
    }, [sessionId]);

    // Get session violations
    const getViolations = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/gaze-tracking/session/${sessionId}/violations`);
            setViolations(response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting gaze violations:', error);
            throw error;
        }
    }, [sessionId]);

    // Get gaze status
    const getStatus = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/gaze-tracking/session/${sessionId}/status`);
            setIsLookingAtScreen(response.data.is_looking_at_screen);
            setGazeDirection(response.data.current_gaze_direction);
            setLastViolation(response.data.last_violation);
            return response.data;
        } catch (error) {
            console.error('Error getting gaze status:', error);
            throw error;
        }
    }, [sessionId]);

    // Analyze gaze direction
    const analyzeGaze = useCallback(async (confidenceLevel, gazeData) => {
        try {
            const response = await api.post('/api/proctoring/gaze-tracking/analyze', {
                confidence_level: confidenceLevel,
                gaze_data: gazeData
            });
            
            setGazeDirection(response.data.gaze_direction);
            setConfidenceLevel(confidenceLevel);
            setIsLookingAtScreen(response.data.gaze_direction === 'towards');
            
            if (response.data.is_violation) {
                logViolation(response.data.gaze_direction, null, confidenceLevel);
            }
            
            return response.data;
        } catch (error) {
            console.error('Error analyzing gaze:', error);
            throw error;
        }
    }, [logViolation]);

    // Start monitoring gaze
    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
        
        // Simulate gaze tracking (in real implementation, this would use eye tracking API)
        const analyzeGazeFromCamera = () => {
            // This would typically analyze camera feed for eye position
            // For demo purposes, we'll simulate gaze tracking
            const simulatedConfidence = 0.7 + Math.random() * 0.3; // 0.7-1.0
            const simulatedGazeData = {
                is_looking_away: Math.random() > 0.8, // 20% chance of looking away
                eye_position: { x: Math.random(), y: Math.random() }
            };
            
            analyzeGaze(simulatedConfidence, simulatedGazeData);
        };
        
        // Set up periodic gaze analysis
        const interval = setInterval(analyzeGazeFromCamera, 3000); // Every 3 seconds
        
        return () => {
            clearInterval(interval);
            setIsMonitoring(false);
        };
    }, [analyzeGaze]);

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
        isLookingAtScreen,
        gazeDirection,
        confidenceLevel,
        violations,
        lastViolation,
        isMonitoring,
        logViolation,
        getViolations,
        getStatus,
        analyzeGaze,
        startMonitoring,
        stopMonitoring
    };
};

/**
 * Gaze Warning Component
 * @param {object} props - Component props
 * @param {boolean} props.isLookingAtScreen - Whether user is looking at screen
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Warning component
 */
export const GazeWarning = ({ isLookingAtScreen, className = '' }) => {
    if (isLookingAtScreen) return null;

    return (
        <div className={`fixed top-4 right-1/4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 ${className}`}>
            <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Gaze Away Detected!</span>
            </div>
            <p className="text-sm mt-1">Please look at the screen to continue the test.</p>
        </div>
    );
};

/**
 * Gaze Status Component
 * @param {object} props - Component props
 * @param {boolean} props.isLookingAtScreen - Whether user is looking at screen
 * @param {string} props.gazeDirection - Current gaze direction
 * @param {number} props.confidenceLevel - Confidence level of detection
 * @param {number} props.violationCount - Number of violations
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Status component
 */
export const GazeStatus = ({ isLookingAtScreen, gazeDirection, confidenceLevel, violationCount = 0, className = '' }) => {
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`w-3 h-3 rounded-full ${isLookingAtScreen ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
                Gaze: {isLookingAtScreen ? 'On Screen' : 'Away'}
            </span>
            {confidenceLevel !== null && (
                <span className="text-xs text-gray-600">
                    ({Math.round(confidenceLevel * 100)}% conf.)
                </span>
            )}
            {violationCount > 0 && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    {violationCount} away
                </span>
            )}
        </div>
    );
};

// Export all components and hooks
export default {
    useGazeTracking,
    GazeWarning,
    GazeStatus
}; 