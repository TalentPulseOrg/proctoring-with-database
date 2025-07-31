/**
 * Browser Compatibility Check Feature Module
 * 
 * This module handles browser compatibility checking and violation detection.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - React hooks
 * - API service
 * 
 * Usage:
 *     import { useBrowserCompatibilityCheck } from './features/proctoring/browser_compatibility_check';
 *     
 *     // Use in component
 *     const { isCompatible, browserInfo, checkCompatibility } = useBrowserCompatibilityCheck(sessionId, isActive);
 */

import { useState, useEffect, useCallback } from 'react';
import { logBrowserCompatibilityViolationModular, checkBrowserCompatibility } from '../../../api/api';

/**
 * Hook for browser compatibility checking
 * @param {number} sessionId - The test session ID
 * @param {boolean} isActive - Whether checking is active
 * @returns {object} Browser compatibility checking state and functions
 */
export const useBrowserCompatibilityCheck = (sessionId, isActive = false) => {
  const [isCompatible, setIsCompatible] = useState(null);
  const [browserInfo, setBrowserInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  // Get browser information
  const getBrowserInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    // Detect browser
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      const match = userAgent.match(/Edge\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari';
      const match = userAgent.match(/Safari\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    return {
      name: browserName,
      version: browserVersion,
      userAgent: userAgent
    };
  }, []);

  // Check browser compatibility
  const checkCompatibility = useCallback(async () => {
    try {
      const info = getBrowserInfo();
      setBrowserInfo(info);
      setIsChecking(true);

      // Send to backend for compatibility check
      const response = await checkBrowserCompatibility({
        session_id: sessionId,
        browser_name: info.name,
        browser_version: info.version,
        user_agent: info.userAgent
      });

      const compatible = response.is_compatible;
      setIsCompatible(compatible);
      setLastCheck(new Date());

      // Log violation if incompatible
      if (!compatible && sessionId) {
        await logBrowserCompatibilityViolationModular({
          session_id: sessionId,
          browser_name: info.name,
          browser_version: info.version,
          user_agent: info.userAgent
        });
      }

      return compatible;
    } catch (error) {
      console.error('Browser compatibility check failed:', error);
      setIsCompatible(false);
      setLastCheck(new Date());
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [sessionId, getBrowserInfo]);

  // Start compatibility checking
  const startChecking = useCallback(() => {
    if (!isActive) return;

    // Initial check
    checkCompatibility();

    // Set up periodic checks
    const interval = setInterval(() => {
      if (isActive) {
        checkCompatibility();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isActive, checkCompatibility]);

  // Stop compatibility checking
  const stopChecking = useCallback(() => {
    setIsChecking(false);
  }, []);

  // Start checking when component mounts or dependencies change
  useEffect(() => {
    if (isActive) {
      const cleanup = startChecking();
      return cleanup;
    } else {
      stopChecking();
    }
  }, [isActive, startChecking, stopChecking]);

  return {
    isCompatible,
    browserInfo,
    isChecking,
    lastCheck,
    checkCompatibility,
    startChecking,
    stopChecking
  };
};

/**
 * Component for browser compatibility warning
 * @param {object} props - Component props
 * @param {boolean} props.isCompatible - Whether browser is compatible
 * @param {object} props.browserInfo - Browser information
 * @returns {JSX.Element} Warning component
 */
export const BrowserCompatibilityWarning = ({ isCompatible, browserInfo }) => {
  if (isCompatible) return null;

  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
      <strong className="font-bold">Unsupported Browser!</strong>
      <span className="block sm:inline">
        {' '}Your browser ({browserInfo?.name} {browserInfo?.version}) is not supported.
        Please use Chrome, Firefox, or Edge to continue with the test.
      </span>
    </div>
  );
};

/**
 * Component for browser compatibility status display
 * @param {object} props - Component props
 * @param {boolean} props.isCompatible - Whether browser is compatible
 * @param {object} props.browserInfo - Browser information
 * @param {boolean} props.isChecking - Whether checking is active
 * @returns {JSX.Element} Status component
 */
export const BrowserCompatibilityStatus = ({ isCompatible, browserInfo, isChecking }) => {
  const getStatusColor = () => {
    if (isCompatible === null) return 'text-gray-600';
    return isCompatible ? 'text-green-600' : 'text-red-600';
  };

  const getStatusText = () => {
    if (isCompatible === null) return 'Checking Browser...';
    if (isCompatible) return `Compatible Browser (${browserInfo?.name} ${browserInfo?.version})`;
    return `Incompatible Browser (${browserInfo?.name} ${browserInfo?.version})`;
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${
        isCompatible === null ? 'bg-gray-500' :
        isCompatible ? 'bg-green-500' : 'bg-red-500'
      }`}></div>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {isChecking && (
        <span className="text-xs text-gray-500">(Checking)</span>
      )}
    </div>
  );
};

/**
 * Component for browser information display
 * @param {object} props - Component props
 * @param {object} props.browserInfo - Browser information
 * @returns {JSX.Element} Browser info component
 */
export const BrowserInfo = ({ browserInfo }) => {
  if (!browserInfo) return null;

  return (
    <div className="bg-gray-100 p-3 rounded-lg">
      <h4 className="font-semibold text-sm mb-2">Browser Information</h4>
      <div className="text-xs space-y-1">
        <div><strong>Browser:</strong> {browserInfo.name}</div>
        <div><strong>Version:</strong> {browserInfo.version}</div>
        <div><strong>User Agent:</strong> <span className="text-gray-600">{browserInfo.userAgent}</span></div>
      </div>
    </div>
  );
};

// Export all components and hooks
export default {
  useBrowserCompatibilityCheck,
  BrowserCompatibilityWarning,
  BrowserCompatibilityStatus,
  BrowserInfo
}; 