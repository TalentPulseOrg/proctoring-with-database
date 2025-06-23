import { useState, useCallback, useEffect, useRef } from 'react';
import {
  logCameraPermissionViolation,
  logMicrophonePermissionViolation,
  logBrowserCompatibilityViolation,
  logTabSwitchViolation,
  logWindowBlurViolation,
  logFullscreenExitViolation,
  logKeyboardShortcutViolation,
  logLightingIssueViolation,
  logGazeAwayViolation,
  logMultipleFacesViolation,
  logAudioSuspiciousViolation,
  getSessionViolationsSummary
} from '../api/api';

/**
 * Enhanced hook for logging specific proctoring violations
 * @param {number} sessionId - The test session ID
 * @returns {Object} - Functions and state for violation logging
 */
export const useEnhancedViolationLogger = (sessionId) => {
  const [violations, setViolations] = useState([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isLogging, setIsLogging] = useState(false);
  const [cooldowns, setCooldowns] = useState({});
  
  // Cooldown periods for different violation types (in milliseconds)
  const COOLDOWN_PERIODS = {
    camera_permission: 10000, // 10 seconds
    microphone_permission: 10000,
    browser_compatibility: 60000, // 1 minute
    tab_switch: 5000, // 5 seconds
    window_blur: 5000,
    fullscreen_exit: 3000, // 3 seconds
    keyboard_shortcut: 2000, // 2 seconds
    lighting_issue: 15000, // 15 seconds
    gaze_away: 3000, // 3 seconds
    multiple_faces: 5000, // 5 seconds
    audio_suspicious: 10000 // 10 seconds
  };
  
  // Initialize violation logging
  const startLogging = useCallback(() => {
    if (!sessionId) {
      console.error('Cannot start violation logging: Missing session ID');
      return false;
    }
    
    setIsLogging(true);
    return true;
  }, [sessionId]);
  
  // Stop violation logging
  const stopLogging = useCallback(() => {
    setIsLogging(false);
    setCooldowns({});
  }, []);
  
  // Check if violation type is in cooldown
  const isInCooldown = useCallback((violationType) => {
    const cooldownEnd = cooldowns[violationType];
    if (!cooldownEnd) return false;
    
    const now = Date.now();
    if (now < cooldownEnd) {
      return true;
    }
    
    // Remove expired cooldown
    setCooldowns(prev => {
      const updated = { ...prev };
      delete updated[violationType];
      return updated;
    });
    
    return false;
  }, [cooldowns]);
  
  // Set cooldown for violation type
  const setCooldown = useCallback((violationType) => {
    const duration = COOLDOWN_PERIODS[violationType] || 5000;
    const cooldownEnd = Date.now() + duration;
    
    setCooldowns(prev => ({
      ...prev,
      [violationType]: cooldownEnd
    }));
  }, []);
  
  // Add violation to local state
  const addViolationToState = useCallback((type, details = {}) => {
    const violation = {
      type,
      timestamp: new Date().toISOString(),
      details
    };
    
    setViolations(prev => [...prev, violation]);
    setViolationCount(prev => prev + 1);
  }, []);
  
  // Camera permission violation
  const logCameraPermission = useCallback(async (errorMessage = null) => {
    if (!isLogging || !sessionId || isInCooldown('camera_permission')) return false;
    
    try {
      const result = await logCameraPermissionViolation(sessionId, errorMessage);
      if (result.success) {
        addViolationToState('camera_permission', { errorMessage });
        setCooldown('camera_permission');
        console.log('Camera permission violation logged');
        return true;
      }
    } catch (error) {
      console.error('Failed to log camera permission violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Microphone permission violation
  const logMicrophonePermission = useCallback(async (errorMessage = null) => {
    if (!isLogging || !sessionId || isInCooldown('microphone_permission')) return false;
    
    try {
      const result = await logMicrophonePermissionViolation(sessionId, errorMessage);
      if (result.success) {
        addViolationToState('microphone_permission', { errorMessage });
        setCooldown('microphone_permission');
        console.log('Microphone permission violation logged');
        return true;
      }
    } catch (error) {
      console.error('Failed to log microphone permission violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Browser compatibility violation
  const logBrowserCompatibility = useCallback(async (browserInfo = {}) => {
    if (!isLogging || !sessionId || isInCooldown('browser_compatibility')) return false;
    
    try {
      const result = await logBrowserCompatibilityViolation(sessionId, browserInfo);
      if (result.success) {
        addViolationToState('browser_compatibility', { browserInfo });
        setCooldown('browser_compatibility');
        console.log('Browser compatibility violation logged');
        return true;
      }
    } catch (error) {
      console.error('Failed to log browser compatibility violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
    // Tab switch violation
  const logTabSwitch = useCallback(async (filepath = null) => {
    console.log('logTabSwitch called with:', { isLogging, sessionId, filepath });
    
    if (!isLogging) {
      console.log('Not logging - logging is disabled');
      return false;
    }
    
    if (!sessionId) {
      console.log('Not logging - no session ID');
      return false;
    }
    
    if (isInCooldown('tab_switch')) {
      console.log('Not logging - in cooldown');
      return false;
    }
    
    try {
      console.log('Calling logTabSwitchViolation API with sessionId:', sessionId);
      const result = await logTabSwitchViolation(sessionId, filepath);
      console.log('API response:', result);
      
      if (result.success) {
        addViolationToState('tab_switch', { filepath });
        setCooldown('tab_switch');
        console.log('Tab switch violation logged successfully');
        return true;
      } else {
        console.log('API call succeeded but result.success is false:', result);
      }
    } catch (error) {
      console.error('Failed to log tab switch violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Window blur violation
  const logWindowBlur = useCallback(async (filepath = null) => {
    if (!isLogging || !sessionId || isInCooldown('window_blur')) return false;
    
    try {
      const result = await logWindowBlurViolation(sessionId, filepath);
      if (result.success) {
        addViolationToState('window_blur', { filepath });
        setCooldown('window_blur');
        console.log('Window blur violation logged');
        return true;
      }
    } catch (error) {
      console.error('Failed to log window blur violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Fullscreen exit violation
  const logFullscreenExit = useCallback(async (filepath = null) => {
    if (!isLogging || !sessionId || isInCooldown('fullscreen_exit')) return false;
    
    try {
      const result = await logFullscreenExitViolation(sessionId, filepath);
      if (result.success) {
        addViolationToState('fullscreen_exit', { filepath });
        setCooldown('fullscreen_exit');
        console.log('Fullscreen exit violation logged');
        return true;
      }
    } catch (error) {
      console.error('Failed to log fullscreen exit violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
    // Keyboard shortcut violation
  const logKeyboardShortcut = useCallback(async (keyCombination, filepath = null) => {
    console.log('logKeyboardShortcut called with:', { isLogging, sessionId, keyCombination, filepath });
    
    if (!isLogging) {
      console.log('Not logging - logging is disabled');
      return false;
    }
    
    if (!sessionId) {
      console.log('Not logging - no session ID');
      return false;
    }
    
    if (isInCooldown('keyboard_shortcut')) {
      console.log('Not logging - in cooldown');
      return false;
    }
    
    try {
      console.log('Calling logKeyboardShortcutViolation API with sessionId:', sessionId, 'keyCombination:', keyCombination);
      const result = await logKeyboardShortcutViolation(sessionId, keyCombination, filepath);
      console.log('API response:', result);
      
      if (result.success) {
        addViolationToState('keyboard_shortcut', { keyCombination, filepath });
        setCooldown('keyboard_shortcut');
        console.log('Keyboard shortcut violation logged successfully:', keyCombination);
        return true;
      } else {
        console.log('API call succeeded but result.success is false:', result);
      }
    } catch (error) {
      console.error('Failed to log keyboard shortcut violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Lighting issue violation
  const logLightingIssue = useCallback(async (lightingData = {}, filepath = null) => {
    if (!isLogging || !sessionId || isInCooldown('lighting_issue')) return false;
    
    try {
      const result = await logLightingIssueViolation(sessionId, lightingData, filepath);
      if (result.success) {
        addViolationToState('lighting_issue', { lightingData, filepath });
        setCooldown('lighting_issue');
        console.log('Lighting issue violation logged');
        return true;
      }
    } catch (error) {
      console.error('Failed to log lighting issue violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Gaze away violation
  const logGazeAway = useCallback(async (gazeData = {}, filepath = null) => {
    if (!isLogging || !sessionId || isInCooldown('gaze_away')) return false;
    
    try {
      const result = await logGazeAwayViolation(sessionId, gazeData, filepath);
      if (result.success) {
        addViolationToState('gaze_away', { gazeData, filepath });
        setCooldown('gaze_away');
        console.log('Gaze away violation logged');
        return true;
      }
    } catch (error) {
      console.error('Failed to log gaze away violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Multiple faces violation
  const logMultipleFaces = useCallback(async (faceCount, filepath = null) => {
    if (!isLogging || !sessionId || isInCooldown('multiple_faces')) return false;
    
    try {
      const result = await logMultipleFacesViolation(sessionId, faceCount, filepath);
      if (result.success) {
        addViolationToState('multiple_faces', { faceCount, filepath });
        setCooldown('multiple_faces');
        console.log('Multiple faces violation logged:', faceCount);
        return true;
      }
    } catch (error) {
      console.error('Failed to log multiple faces violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Audio suspicious violation
  const logAudioSuspicious = useCallback(async (audioData = {}, filepath = null) => {
    if (!isLogging || !sessionId || isInCooldown('audio_suspicious')) return false;
    
    try {
      const result = await logAudioSuspiciousViolation(sessionId, audioData, filepath);
      if (result.success) {
        addViolationToState('audio_suspicious', { audioData, filepath });
        setCooldown('audio_suspicious');
        console.log('Suspicious audio violation logged');
        return true;
      }
    } catch (error) {
      console.error('Failed to log suspicious audio violation:', error);
    }
    return false;
  }, [isLogging, sessionId, isInCooldown, addViolationToState, setCooldown]);
  
  // Get violations summary from server
  const getViolationsSummary = useCallback(async () => {
    if (!sessionId) return null;
    
    try {
      return await getSessionViolationsSummary(sessionId);
    } catch (error) {
      console.error('Failed to get violations summary:', error);
      return null;
    }
  }, [sessionId]);
  
  // Get violation summary
  const getViolationSummary = useCallback(() => {
    const summary = {};
    
    violations.forEach(violation => {
      if (!summary[violation.type]) {
        summary[violation.type] = 0;
      }
      summary[violation.type]++;
    });
    
    return summary;
  }, [violations]);
  
  return {
    violations,
    violationCount,
    isLogging,
    startLogging,
    stopLogging,
    getViolationSummary,
    getViolationsSummary,
    // Specific violation logging functions
    logCameraPermission,
    logMicrophonePermission,
    logBrowserCompatibility,
    logTabSwitch,
    logWindowBlur,
    logFullscreenExit,
    logKeyboardShortcut,
    logLightingIssue,
    logGazeAway,
    logMultipleFaces,
    logAudioSuspicious,
    // Cooldown state
    cooldowns,
    isInCooldown
  };
};
