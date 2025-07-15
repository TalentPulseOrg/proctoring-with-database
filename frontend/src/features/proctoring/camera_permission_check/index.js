/**
 * Camera Permission Check Feature Module
 * 
 * This module handles camera permission monitoring and violation detection.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - React hooks
 * - API service
 * 
 * Usage:
 *     import { useCameraPermissionMonitor } from './features/proctoring/camera_permission_check';
 *     
 *     // Use in component
 *     const { hasPermission, status, recheckPermission } = useCameraPermissionMonitor(sessionId, isActive);
 */

import { useState, useEffect, useCallback } from 'react';
import { logCameraPermissionViolationModular, logCameraPermissionGrant } from '../../../api/api';

/**
 * Hook for monitoring camera permission status
 * @param {number} sessionId - The test session ID
 * @param {boolean} isActive - Whether monitoring is active
 * @returns {object} Camera permission monitoring state and functions
 */
export const useCameraPermissionMonitor = (sessionId, isActive = false) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [status, setStatus] = useState('unknown'); // 'granted', 'denied', 'prompt', 'unknown'
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  // Check camera permission status
  const checkPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setStatus('granted');
      setLastCheck(new Date());
      
      // Log permission grant
      if (sessionId) {
        await logCameraPermissionGrant(sessionId);
      }
      
      return true;
    } catch (error) {
      console.error('Camera permission check failed:', error);
      
      setHasPermission(false);
      setStatus('denied');
      setLastCheck(new Date());
      
      // Log permission violation
      if (sessionId) {
        await logCameraPermissionViolationModular({
          session_id: sessionId,
          error_message: error.message,
          device_info: navigator.userAgent
        });
      }
      
      return false;
    }
  }, [sessionId]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!isActive) return;
    
    setIsMonitoring(true);
    
    // Initial check
    checkPermission();
    
    // Set up periodic checks
    const interval = setInterval(() => {
      if (isActive) {
        checkPermission();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [isActive, checkPermission]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Recheck permission manually
  const recheckPermission = useCallback(() => {
    return checkPermission();
  }, [checkPermission]);

  // Start monitoring when component mounts or dependencies change
  useEffect(() => {
    if (isActive) {
      const cleanup = startMonitoring();
      return cleanup;
    } else {
      stopMonitoring();
    }
  }, [isActive, startMonitoring, stopMonitoring]);

  return {
    hasPermission,
    status,
    isMonitoring,
    lastCheck,
    recheckPermission,
    startMonitoring,
    stopMonitoring
  };
};

/**
 * Component for camera permission warning
 * @param {object} props - Component props
 * @param {boolean} props.hasPermission - Whether camera permission is granted
 * @param {string} props.status - Permission status
 * @param {function} props.onRecheck - Function to recheck permission
 * @returns {JSX.Element} Warning component
 */
export const CameraPermissionWarning = ({ hasPermission, status, onRecheck }) => {
  if (hasPermission) return null;

  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
      <strong className="font-bold">Camera Access Required!</strong>
      <span className="block sm:inline">
        {' '}Please enable camera access to continue with the test.
      </span>
      <button
        onClick={onRecheck}
        className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
      >
        Recheck
      </button>
    </div>
  );
};

/**
 * Component for camera permission status display
 * @param {object} props - Component props
 * @param {boolean} props.hasPermission - Whether camera permission is granted
 * @param {string} props.status - Permission status
 * @param {boolean} props.isMonitoring - Whether monitoring is active
 * @returns {JSX.Element} Status component
 */
export const CameraPermissionStatus = ({ hasPermission, status, isMonitoring }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'granted':
        return 'text-green-600';
      case 'denied':
        return 'text-red-600';
      case 'prompt':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'granted':
        return 'Camera Access Granted';
      case 'denied':
        return 'Camera Access Denied';
      case 'prompt':
        return 'Camera Access Pending';
      default:
        return 'Camera Access Unknown';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${hasPermission ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {isMonitoring && (
        <span className="text-xs text-gray-500">(Monitoring)</span>
      )}
    </div>
  );
};

// Export all components and hooks
export default {
  useCameraPermissionMonitor,
  CameraPermissionWarning,
  CameraPermissionStatus
}; 