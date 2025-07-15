/**
 * Audio Monitoring Feature Module
 * 
 * This module handles audio monitoring and violation logging.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - API service
 * 
 * Usage:
 *   import { useAudioMonitoring, AudioWarning } from './features/proctoring/audio_monitoring';
 *   
 *   // Use the hook in a component
 *   const { audioLevel, audioType, logViolation } = useAudioMonitoring(sessionId);
 *   
 *   // Display warning component
 *   <AudioWarning audioType={audioType} />
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/api';

/**
 * Hook for monitoring audio analysis
 * @param {number} sessionId - The test session ID
 * @returns {object} - Audio monitoring state and functions
 */
export const useAudioMonitoring = (sessionId) => {
    const [audioLevel, setAudioLevel] = useState(null);
    const [audioType, setAudioType] = useState('silence');
    const [confidenceLevel, setConfidenceLevel] = useState(null);
    const [violations, setViolations] = useState([]);
    const [lastViolation, setLastViolation] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Log an audio violation
    const logViolation = useCallback(async (level, type, duration, confidence, audioFilePath = null, additionalInfo = null) => {
        try {
            const response = await api.post('/api/proctoring/audio-monitoring/violation', {
                session_id: sessionId,
                audio_level: level,
                audio_type: type,
                duration_seconds: duration,
                is_suspicious: type === 'voice' || type === 'noise',
                confidence_level: confidence,
                audio_file_path: audioFilePath,
                additional_info: additionalInfo
            });
            
            setLastViolation(response.data);
            setViolations(prev => [response.data, ...prev]);
            
            console.warn('Audio violation logged:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error logging audio violation:', error);
            throw error;
        }
    }, [sessionId]);

    // Get session violations
    const getViolations = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/audio-monitoring/session/${sessionId}/violations`);
            setViolations(response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting audio violations:', error);
            throw error;
        }
    }, [sessionId]);

    // Get audio status
    const getStatus = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/audio-monitoring/session/${sessionId}/status`);
            setAudioLevel(response.data.current_audio_level);
            setAudioType(response.data.current_audio_type);
            setLastViolation(response.data.last_violation);
            return response.data;
        } catch (error) {
            console.error('Error getting audio status:', error);
            throw error;
        }
    }, [sessionId]);

    // Analyze audio pattern
    const analyzeAudio = useCallback(async (audioLevel, confidenceLevel, audioData) => {
        try {
            const response = await api.post('/api/proctoring/audio-monitoring/analyze', {
                audio_level: audioLevel,
                confidence_level: confidenceLevel,
                audio_data: audioData
            });
            
            setAudioType(response.data.audio_type);
            setAudioLevel(audioLevel);
            setConfidenceLevel(confidenceLevel);
            
            if (response.data.is_violation) {
                logViolation(audioLevel, response.data.audio_type, null, confidenceLevel);
            }
            
            return response.data;
        } catch (error) {
            console.error('Error analyzing audio:', error);
            throw error;
        }
    }, [logViolation]);

    // Start monitoring audio
    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
        
        // Simulate audio monitoring (in real implementation, this would use microphone API)
        const analyzeAudioFromMicrophone = () => {
            // This would typically analyze microphone input for audio patterns
            // For demo purposes, we'll simulate audio monitoring
            const simulatedAudioLevel = 30 + Math.random() * 50; // 30-80 dB
            const simulatedConfidence = 0.6 + Math.random() * 0.4; // 0.6-1.0
            const simulatedAudioData = {
                is_voice: Math.random() > 0.7, // 30% chance of voice
                frequency_analysis: { low: Math.random(), mid: Math.random(), high: Math.random() }
            };
            
            analyzeAudio(simulatedAudioLevel, simulatedConfidence, simulatedAudioData);
        };
        
        // Set up periodic audio analysis
        const interval = setInterval(analyzeAudioFromMicrophone, 2000); // Every 2 seconds
        
        return () => {
            clearInterval(interval);
            setIsMonitoring(false);
        };
    }, [analyzeAudio]);

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
        audioLevel,
        audioType,
        confidenceLevel,
        violations,
        lastViolation,
        isMonitoring,
        logViolation,
        getViolations,
        getStatus,
        analyzeAudio,
        startMonitoring,
        stopMonitoring
    };
};

/**
 * Audio Warning Component
 * @param {object} props - Component props
 * @param {string} props.audioType - Current audio type
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Warning component
 */
export const AudioWarning = ({ audioType, className = '' }) => {
    if (audioType === 'silence' || audioType === 'unknown') return null;

    const getWarningMessage = () => {
        switch (audioType) {
            case 'voice':
                return 'Voice detected! Please remain silent during the test.';
            case 'noise':
                return 'Unusual noise detected! Please maintain a quiet environment.';
            default:
                return 'Audio issue detected. Please check your environment.';
        }
    };

    const getWarningColor = () => {
        switch (audioType) {
            case 'voice':
                return 'bg-red-500';
            case 'noise':
                return 'bg-yellow-500';
            default:
                return 'bg-orange-500';
        }
    };

    return (
        <div className={`fixed bottom-4 left-1/4 ${getWarningColor()} text-white px-4 py-2 rounded-lg shadow-lg z-50 ${className}`}>
            <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Audio Issue Detected!</span>
            </div>
            <p className="text-sm mt-1">{getWarningMessage()}</p>
        </div>
    );
};

/**
 * Audio Status Component
 * @param {object} props - Component props
 * @param {string} props.audioType - Current audio type
 * @param {number} props.audioLevel - Current audio level in dB
 * @param {number} props.confidenceLevel - Confidence level of detection
 * @param {number} props.violationCount - Number of violations
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Status component
 */
export const AudioStatus = ({ audioType, audioLevel, confidenceLevel, violationCount = 0, className = '' }) => {
    const getStatusColor = () => {
        switch (audioType) {
            case 'silence':
                return 'bg-green-500';
            case 'voice':
                return 'bg-red-500';
            case 'noise':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm font-medium">
                Audio: {audioType.charAt(0).toUpperCase() + audioType.slice(1)}
            </span>
            {audioLevel !== null && (
                <span className="text-xs text-gray-600">
                    ({Math.round(audioLevel)}dB)
                </span>
            )}
            {confidenceLevel !== null && (
                <span className="text-xs text-gray-600">
                    ({Math.round(confidenceLevel * 100)}% conf.)
                </span>
            )}
            {violationCount > 0 && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    {violationCount} issue{violationCount !== 1 ? 's' : ''}
                </span>
            )}
        </div>
    );
};

// Export all components and hooks
export default {
    useAudioMonitoring,
    AudioWarning,
    AudioStatus
}; 