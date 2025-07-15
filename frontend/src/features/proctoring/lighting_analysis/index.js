/**
 * Lighting Analysis Feature Module
 * 
 * This module handles lighting analysis and violation logging.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - API service
 * 
 * Usage:
 *   import { useLightingAnalysis, LightingWarning } from './features/proctoring/lighting_analysis';
 *   
 *   // Use the hook in a component
 *   const { currentBrightness, lightingCondition, logViolation } = useLightingAnalysis(sessionId);
 *   
 *   // Display warning component
 *   <LightingWarning lightingCondition={lightingCondition} />
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/api';

/**
 * Hook for monitoring lighting analysis
 * @param {number} sessionId - The test session ID
 * @returns {object} - Lighting analysis monitoring state and functions
 */
export const useLightingAnalysis = (sessionId) => {
    const [currentBrightness, setCurrentBrightness] = useState(null);
    const [lightingCondition, setLightingCondition] = useState('normal');
    const [violations, setViolations] = useState([]);
    const [lastViolation, setLastViolation] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Log a lighting violation
    const logViolation = useCallback(async (brightnessLevel, condition, screenshotPath = null, additionalInfo = null) => {
        try {
            const response = await api.post('/api/proctoring/lighting-analysis/violation', {
                session_id: sessionId,
                brightness_level: brightnessLevel,
                lighting_condition: condition,
                screenshot_path: screenshotPath,
                additional_info: additionalInfo
            });
            
            setLastViolation(response.data);
            setViolations(prev => [response.data, ...prev]);
            
            console.warn('Lighting violation logged:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error logging lighting violation:', error);
            throw error;
        }
    }, [sessionId]);

    // Get session violations
    const getViolations = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/lighting-analysis/session/${sessionId}/violations`);
            setViolations(response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting lighting violations:', error);
            throw error;
        }
    }, [sessionId]);

    // Get lighting status
    const getStatus = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/lighting-analysis/session/${sessionId}/status`);
            setCurrentBrightness(response.data.current_brightness);
            setLightingCondition(response.data.lighting_condition);
            setLastViolation(response.data.last_violation);
            return response.data;
        } catch (error) {
            console.error('Error getting lighting status:', error);
            throw error;
        }
    }, [sessionId]);

    // Analyze lighting condition
    const analyzeLighting = useCallback(async (brightnessLevel, previousBrightness = null) => {
        try {
            const response = await api.post('/api/proctoring/lighting-analysis/analyze', {
                brightness_level: brightnessLevel,
                previous_brightness: previousBrightness
            });
            
            setLightingCondition(response.data.lighting_condition);
            setCurrentBrightness(brightnessLevel);
            
            if (response.data.is_violation) {
                logViolation(brightnessLevel, response.data.lighting_condition);
            }
            
            return response.data;
        } catch (error) {
            console.error('Error analyzing lighting:', error);
            throw error;
        }
    }, [logViolation]);

    // Start monitoring lighting
    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
        
        // Simulate lighting analysis (in real implementation, this would use camera API)
        const analyzeLightingFromCamera = () => {
            // This would typically analyze camera feed for brightness
            // For demo purposes, we'll simulate brightness levels
            const simulatedBrightness = Math.random() * 1.0; // 0-1 scale
            analyzeLighting(simulatedBrightness);
        };
        
        // Set up periodic lighting analysis
        const interval = setInterval(analyzeLightingFromCamera, 5000); // Every 5 seconds
        
        return () => {
            clearInterval(interval);
            setIsMonitoring(false);
        };
    }, [analyzeLighting]);

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
        currentBrightness,
        lightingCondition,
        violations,
        lastViolation,
        isMonitoring,
        logViolation,
        getViolations,
        getStatus,
        analyzeLighting,
        startMonitoring,
        stopMonitoring
    };
};

/**
 * Lighting Warning Component
 * @param {object} props - Component props
 * @param {string} props.lightingCondition - Current lighting condition
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Warning component
 */
export const LightingWarning = ({ lightingCondition, className = '' }) => {
    if (lightingCondition === 'normal') return null;

    const getWarningMessage = () => {
        switch (lightingCondition) {
            case 'dark':
                return 'Lighting is too dark. Please improve lighting conditions.';
            case 'bright':
                return 'Lighting is too bright. Please reduce brightness.';
            case 'sudden_change':
                return 'Sudden lighting change detected. Please maintain consistent lighting.';
            default:
                return 'Lighting issue detected. Please check your environment.';
        }
    };

    return (
        <div className={`fixed top-4 left-1/4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 ${className}`}>
            <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Lighting Issue Detected!</span>
            </div>
            <p className="text-sm mt-1">{getWarningMessage()}</p>
        </div>
    );
};

/**
 * Lighting Status Component
 * @param {object} props - Component props
 * @param {string} props.lightingCondition - Current lighting condition
 * @param {number} props.brightnessLevel - Current brightness level
 * @param {number} props.violationCount - Number of violations
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Status component
 */
export const LightingStatus = ({ lightingCondition, brightnessLevel, violationCount = 0, className = '' }) => {
    const getStatusColor = () => {
        switch (lightingCondition) {
            case 'normal':
                return 'bg-green-500';
            case 'dark':
            case 'bright':
            case 'sudden_change':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm font-medium">
                Lighting: {lightingCondition.charAt(0).toUpperCase() + lightingCondition.slice(1)}
            </span>
            {brightnessLevel !== null && (
                <span className="text-xs text-gray-600">
                    ({Math.round(brightnessLevel * 100)}%)
                </span>
            )}
            {violationCount > 0 && (
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                    {violationCount} issue{violationCount !== 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
};

// Export all components and hooks
export default {
    useLightingAnalysis,
    LightingWarning,
    LightingStatus
}; 