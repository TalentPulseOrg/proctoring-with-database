/**
 * Permission Logging Feature Module
 * 
 * This module handles permission enable logging and tracking.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - API service
 * 
 * Usage:
 *   import { usePermissionLogging, PermissionStatus } from './features/proctoring/permission_logging';
 *   
 *   // Use the hook in a component
 *   const { permissions, logPermission } = usePermissionLogging(sessionId);
 *   
 *   // Display status component
 *   <PermissionStatus permissions={permissions} />
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/api';

/**
 * Hook for monitoring permission logging
 * @param {number} sessionId - The test session ID
 * @returns {object} - Permission logging state and functions
 */
export const usePermissionLogging = (sessionId) => {
    const [permissions, setPermissions] = useState([]);
    const [permissionStatus, setPermissionStatus] = useState({
        camera_granted: false,
        microphone_granted: false,
        screen_granted: false,
        location_granted: false
    });
    const [totalPermissions, setTotalPermissions] = useState(0);
    const [lastPermissionCheck, setLastPermissionCheck] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Log a permission event
    const logPermission = useCallback(async (permissionType, granted, deviceInfo = null, errorMessage = null, additionalInfo = null) => {
        try {
            const response = await api.post('/api/proctoring/permission-logging/log', {
                session_id: sessionId,
                permission_type: permissionType,
                granted: granted,
                device_info: deviceInfo,
                error_message: errorMessage,
                additional_info: additionalInfo
            });
            
            setPermissions(prev => [response.data, ...prev]);
            
            // Update permission status
            setPermissionStatus(prev => ({
                ...prev,
                [`${permissionType}_granted`]: granted
            }));
            
            console.info('Permission event logged:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error logging permission event:', error);
            throw error;
        }
    }, [sessionId]);

    // Get session permissions
    const getPermissions = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/permission-logging/session/${sessionId}/permissions`);
            setPermissions(response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting session permissions:', error);
            throw error;
        }
    }, [sessionId]);

    // Get permission status
    const getStatus = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/permission-logging/session/${sessionId}/status`);
            setPermissionStatus({
                camera_granted: response.data.camera_granted,
                microphone_granted: response.data.microphone_granted,
                screen_granted: response.data.screen_granted,
                location_granted: response.data.location_granted
            });
            setTotalPermissions(response.data.total_permissions_requested);
            setLastPermissionCheck(response.data.last_permission_check);
            return response.data;
        } catch (error) {
            console.error('Error getting permission status:', error);
            throw error;
        }
    }, [sessionId]);

    // Get valid permission types
    const getValidPermissionTypes = useCallback(async () => {
        try {
            const response = await api.get('/api/proctoring/permission-logging/valid-permission-types');
            return response.data.valid_permission_types;
        } catch (error) {
            console.error('Error getting valid permission types:', error);
            throw error;
        }
    }, []);

    // Check and log camera permission
    const checkCameraPermission = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            
            await logPermission('camera', true, JSON.stringify({
                deviceId: stream.getVideoTracks()[0]?.getSettings()?.deviceId,
                width: stream.getVideoTracks()[0]?.getSettings()?.width,
                height: stream.getVideoTracks()[0]?.getSettings()?.height
            }));
            
            return true;
        } catch (error) {
            await logPermission('camera', false, null, error.message);
            return false;
        }
    }, [logPermission]);

    // Check and log microphone permission
    const checkMicrophonePermission = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            await logPermission('microphone', true, JSON.stringify({
                deviceId: stream.getAudioTracks()[0]?.getSettings()?.deviceId,
                sampleRate: stream.getAudioTracks()[0]?.getSettings()?.sampleRate
            }));
            
            return true;
        } catch (error) {
            await logPermission('microphone', false, null, error.message);
            return false;
        }
    }, [logPermission]);

    // Check and log screen sharing permission
    const checkScreenPermission = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            
            await logPermission('screen', true, JSON.stringify({
                displaySurface: stream.getVideoTracks()[0]?.getSettings()?.displaySurface
            }));
            
            return true;
        } catch (error) {
            await logPermission('screen', false, null, error.message);
            return false;
        }
    }, [logPermission]);

    // Check and log location permission
    const checkLocationPermission = useCallback(async () => {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000,
                    enableHighAccuracy: false
                });
            });
            
            await logPermission('location', true, JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            }));
            
            return true;
        } catch (error) {
            await logPermission('location', false, null, error.message);
            return false;
        }
    }, [logPermission]);

    // Start monitoring permissions
    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
        
        // Check all permissions on start
        const checkAllPermissions = async () => {
            await checkCameraPermission();
            await checkMicrophonePermission();
            await checkScreenPermission();
            await checkLocationPermission();
        };
        
        checkAllPermissions();
    }, [checkCameraPermission, checkMicrophonePermission, checkScreenPermission, checkLocationPermission]);

    // Stop monitoring
    const stopMonitoring = useCallback(() => {
        setIsMonitoring(false);
    }, []);

    // Initialize monitoring when sessionId changes
    useEffect(() => {
        if (sessionId && !isMonitoring) {
            startMonitoring();
        }
    }, [sessionId, isMonitoring, startMonitoring]);

    // Get initial status
    useEffect(() => {
        if (sessionId) {
            getStatus();
            getPermissions();
        }
    }, [sessionId, getStatus, getPermissions]);

    return {
        permissions,
        permissionStatus,
        totalPermissions,
        lastPermissionCheck,
        isMonitoring,
        logPermission,
        getPermissions,
        getStatus,
        getValidPermissionTypes,
        checkCameraPermission,
        checkMicrophonePermission,
        checkScreenPermission,
        checkLocationPermission,
        startMonitoring,
        stopMonitoring
    };
};

/**
 * Permission Status Component
 * @param {object} props - Component props
 * @param {object} props.permissions - Permission status object
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Status component
 */
export const PermissionStatus = ({ permissions, className = '' }) => {
    const permissionTypes = [
        { key: 'camera_granted', label: 'Camera', icon: '📷' },
        { key: 'microphone_granted', label: 'Microphone', icon: '🎤' },
        { key: 'screen_granted', label: 'Screen', icon: '🖥️' },
        { key: 'location_granted', label: 'Location', icon: '📍' }
    ];

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {permissionTypes.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center space-x-1">
                    <span className="text-sm">{icon}</span>
                    <span className="text-xs font-medium">{label}</span>
                    <div className={`w-2 h-2 rounded-full ${permissions[key] ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
            ))}
        </div>
    );
};

/**
 * Permission Request Component
 * @param {object} props - Component props
 * @param {function} props.onPermissionGranted - Callback when permission is granted
 * @param {function} props.onPermissionDenied - Callback when permission is denied
 * @param {string} props.permissionType - Type of permission to request
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Request component
 */
export const PermissionRequest = ({ onPermissionGranted, onPermissionDenied, permissionType, className = '' }) => {
    const getPermissionMessage = () => {
        switch (permissionType) {
            case 'camera':
                return 'Camera access is required for proctoring.';
            case 'microphone':
                return 'Microphone access is required for audio monitoring.';
            case 'screen':
                return 'Screen sharing is required for monitoring.';
            case 'location':
                return 'Location access is required for verification.';
            default:
                return 'Permission is required to continue.';
        }
    };

    return (
        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
            <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                    <h3 className="text-sm font-medium text-blue-800">Permission Required</h3>
                    <p className="text-sm text-blue-600">{getPermissionMessage()}</p>
                </div>
            </div>
            <div className="mt-3 flex space-x-2">
                <button
                    onClick={onPermissionGranted}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                    Grant Permission
                </button>
                <button
                    onClick={onPermissionDenied}
                    className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                >
                    Deny
                </button>
            </div>
        </div>
    );
};

// Export all components and hooks
export default {
    usePermissionLogging,
    PermissionStatus,
    PermissionRequest
}; 