import { useState, useEffect, useRef, useCallback } from 'react';
import { logCameraPermissionViolationModular } from '../api/api';
import { logCameraPermission } from '../api/api';

/**
 * Hook to monitor camera permissions during test session
 * Detects camera permission changes and logs violations
 */
export const useCameraPermissionMonitor = (sessionId, isTestActive = false, shouldLogPermissions = true) => {
    const [hasCameraPermission, setHasCameraPermission] = useState(true);
    const [cameraStatus, setCameraStatus] = useState('checking');
    const [stream, setStream] = useState(null);
    const monitorIntervalRef = useRef(null);
    const lastPermissionState = useRef(true);
    const violationLogged = useRef(false);

    // Check camera permission status
    const checkCameraPermission = useCallback(async () => {
        try {
            // Try to get camera stream
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            // If successful, camera permission is granted
            setHasCameraPermission(true);
            setCameraStatus('granted');
            
            // Stop the stream immediately as we're just checking permission
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            
            // Reset violation flag if permission is restored
            if (!lastPermissionState.current) {
                violationLogged.current = false;
                console.log('Camera permission restored');
                
                // Log permission restoration to proctorpermissionlog only if shouldLogPermissions is true
                if (sessionId && shouldLogPermissions) {
                    await logCameraPermission(sessionId, true);
                    console.log('Camera permission restoration logged');
                }
            }
            
            lastPermissionState.current = true;
            return true;
            
        } catch (error) {
            // Camera permission denied or camera not available
            setHasCameraPermission(false);
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                setCameraStatus('denied');
                
                // Log violation only if permission was previously granted and we haven't already logged
                if (lastPermissionState.current && !violationLogged.current && sessionId) {
                    const violationData = {
                        session_id: sessionId,
                        error_message: error.message
                    };
                    await logCameraPermissionViolationModular(violationData);
                    
                    // Also log to proctorpermissionlog only if shouldLogPermissions is true
                    if (shouldLogPermissions) {
                        await logCameraPermission(sessionId, false, error.message);
                    }
                    
                    violationLogged.current = true;
                    console.log('Camera permission violation logged');
                }
                
            } else if (error.name === 'NotFoundError') {
                setCameraStatus('not_found');
            } else {
                setCameraStatus('error');
            }
            
            lastPermissionState.current = false;
            return false;
        }
    }, [sessionId, shouldLogPermissions]);

    // Start monitoring camera permissions
    const startMonitoring = useCallback(() => {
        if (monitorIntervalRef.current) {
            clearInterval(monitorIntervalRef.current);
        }

        // Check immediately
        checkCameraPermission();

        // Set up periodic checking every 3 seconds
        monitorIntervalRef.current = setInterval(() => {
            checkCameraPermission();
        }, 3000);

        console.log('Started camera permission monitoring');
    }, [checkCameraPermission]);

    // Stop monitoring camera permissions
    const stopMonitoring = useCallback(() => {
        if (monitorIntervalRef.current) {
            clearInterval(monitorIntervalRef.current);
            monitorIntervalRef.current = null;
        }

        // Clean up stream if exists
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        console.log('Stopped camera permission monitoring');
    }, [stream]);

    // Force check camera permission (useful for manual triggers)
    const recheckPermission = useCallback(async () => {
        return await checkCameraPermission();
    }, [checkCameraPermission]);

    // Auto start/stop monitoring based on test activity
    useEffect(() => {
        if (isTestActive && sessionId) {
            startMonitoring();
        } else {
            stopMonitoring();
        }

        // Cleanup on unmount
        return () => {
            stopMonitoring();
        };
    }, [isTestActive, sessionId, startMonitoring, stopMonitoring]);

    // Listen for permission changes via navigator.permissions API (if supported)
    useEffect(() => {
        if (!navigator.permissions || !navigator.permissions.query) {
            return;
        }

        const handlePermissionChange = async () => {
            await checkCameraPermission();
        };

        navigator.permissions.query({ name: 'camera' })
            .then(permissionStatus => {
                permissionStatus.addEventListener('change', handlePermissionChange);
                
                return () => {
                    permissionStatus.removeEventListener('change', handlePermissionChange);
                };
            })
            .catch(err => {
                console.log('Permission API not fully supported:', err);
            });
    }, [checkCameraPermission]);

    return {
        hasCameraPermission,
        cameraStatus,
        startMonitoring,
        stopMonitoring,
        recheckPermission,
        isMonitoring: monitorIntervalRef.current !== null
    };
};

export default useCameraPermissionMonitor;
