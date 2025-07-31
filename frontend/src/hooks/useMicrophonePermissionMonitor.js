import { useState, useEffect, useRef, useCallback } from 'react';
import { logMicrophonePermissionViolationModular } from '../api/api';
import { logMicrophonePermission } from '../api/api';

/**
 * Hook to monitor microphone permissions during test session
 * Detects microphone permission changes and logs violations
 */
export const useMicrophonePermissionMonitor = (sessionId, isTestActive = false, shouldLogPermissions = true) => {
    const [hasMicrophonePermission, setHasMicrophonePermission] = useState(true);
    const [microphoneStatus, setMicrophoneStatus] = useState('checking');
    const [stream, setStream] = useState(null);
    const monitorIntervalRef = useRef(null);
    const lastPermissionState = useRef(true);
    const violationLogged = useRef(false);

    // Check microphone permission status
    const checkMicrophonePermission = useCallback(async () => {
        try {
            // Try to get microphone stream
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true 
            });
            
            // If successful, microphone permission is granted
            setHasMicrophonePermission(true);
            setMicrophoneStatus('granted');
            
            // Stop the stream immediately as we're just checking permission
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            
            // Reset violation flag if permission is restored
            if (!lastPermissionState.current) {
                violationLogged.current = false;
                console.log('Microphone permission restored');
                
                // Log permission restoration to proctorpermissionlog only if shouldLogPermissions is true
                if (sessionId && shouldLogPermissions) {
                    await logMicrophonePermission(sessionId, true);
                    console.log('Microphone permission restoration logged');
                }
            }
            
            lastPermissionState.current = true;
            return true;
            
        } catch (error) {
            // Microphone permission denied or microphone not available
            setHasMicrophonePermission(false);
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                setMicrophoneStatus('denied');
                
                // Log violation only if permission was previously granted and we haven't already logged
                if (lastPermissionState.current && !violationLogged.current && sessionId) {
                    const violationData = {
                        session_id: sessionId,
                        error_message: error.message
                    };
                    await logMicrophonePermissionViolationModular(violationData);
                    
                    // Also log to proctorpermissionlog only if shouldLogPermissions is true
                    if (shouldLogPermissions) {
                        await logMicrophonePermission(sessionId, false, error.message);
                    }
                    
                    violationLogged.current = true;
                    console.log('Microphone permission violation logged');
                }
                
            } else if (error.name === 'NotFoundError') {
                setMicrophoneStatus('not_found');
            } else {
                setMicrophoneStatus('error');
            }
            
            lastPermissionState.current = false;
            return false;
        }
    }, [sessionId, shouldLogPermissions]);

    // Start monitoring microphone permissions
    const startMonitoring = useCallback(() => {
        if (monitorIntervalRef.current) {
            clearInterval(monitorIntervalRef.current);
        }

        // Check immediately
        checkMicrophonePermission();

        // Set up periodic checking every 3 seconds
        monitorIntervalRef.current = setInterval(() => {
            checkMicrophonePermission();
        }, 3000);

        console.log('Started microphone permission monitoring');
    }, [checkMicrophonePermission]);

    // Stop monitoring microphone permissions
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

        console.log('Stopped microphone permission monitoring');
    }, [stream]);

    // Force check microphone permission (useful for manual triggers)
    const recheckPermission = useCallback(async () => {
        return await checkMicrophonePermission();
    }, [checkMicrophonePermission]);

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
            await checkMicrophonePermission();
        };

        navigator.permissions.query({ name: 'microphone' })
            .then(permissionStatus => {
                permissionStatus.addEventListener('change', handlePermissionChange);
                
                return () => {
                    permissionStatus.removeEventListener('change', handlePermissionChange);
                };
            })
            .catch(err => {
                console.log('Permission API not fully supported:', err);
            });
    }, [checkMicrophonePermission]);

    return {
        hasMicrophonePermission,
        microphoneStatus,
        startMonitoring,
        stopMonitoring,
        recheckPermission,
        isMonitoring: monitorIntervalRef.current !== null
    };
};

export default useMicrophonePermissionMonitor;
