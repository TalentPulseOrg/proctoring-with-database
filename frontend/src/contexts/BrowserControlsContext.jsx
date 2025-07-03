import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { useScreenMonitor } from './ScreenMonitorContext';
import { recordViolation } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { useWarning } from './WarningContext';

const BrowserControlsContext = createContext();

export const useBrowserControls = () => {
  const context = useContext(BrowserControlsContext);
  if (!context) {
    throw new Error('useBrowserControls must be used within a BrowserControlsProvider');
  }
  return context;
};

export const BrowserControlsProvider = ({ children }) => {
  const { handleViolation: screenMonitorHandleViolation, isTestActive } = useScreenMonitor() || {};
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const screenMonitorHandleViolationRef = useRef(null);
  const navigate = useNavigate();
  const { handleViolation: handleWarning } = useWarning();

  // Create a safe version of handleViolation that won't crash if undefined
  const handleViolation = useCallback((violationType, details = {}) => {
    if (!isTestActive) {
      return;
    }

    if (screenMonitorHandleViolationRef.current) {
      screenMonitorHandleViolationRef.current(violationType, details);
    }
    
    // Record violation if session ID is available
    if (sessionId) {
      recordViolation({
        session_id: sessionId,
        violation_type: violationType,
        details: {
          ...details,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }).catch(err => console.error(`Failed to record ${violationType} violation:`, err));
    }
    
    // Handle warning
    handleWarning(violationType, details);
  }, [isTestActive, sessionId, handleWarning]);

  // Block copy/paste
  const preventCopyPaste = useCallback((e) => {
    if (!isTestActive) return;
    
    e.preventDefault();
    const action = e.type === 'copy' ? 'Copy' : 'Paste';
    handleViolation('copy_paste_attempt', { action });
  }, [handleViolation, isTestActive]);

  // Block keyboard shortcuts
  const preventKeyboardShortcuts = useCallback((e) => {
    if (!isTestActive) return;
    
    // Check for common keyboard shortcuts
    if (
      (e.ctrlKey || e.metaKey) && (
        e.key === 'c' || // Copy
        e.key === 'v' || // Paste
        e.key === 'x' || // Cut
        e.key === 'a' || // Select all
        e.key === 'f' || // Find
        e.key === 'p' || // Print
        e.key === 's' || // Save
        e.key === 'u'    // View source
      )
    ) {
      e.preventDefault();
      handleViolation('keyboard_shortcut', { key: e.key });
    }
  }, [handleViolation, isTestActive]);

  // Block context menu
  const preventContextMenu = useCallback((e) => {
    if (!isTestActive) return;
    
    e.preventDefault();
    handleViolation('context_menu_attempt');
  }, [handleViolation, isTestActive]);

  // Handle fullscreen changes
  const handleFullscreenChange = useCallback(() => {
    if (!isTestActive) return;
    
    const isFullscreen = document.fullscreenElement !== null;
    setIsFullScreen(isFullscreen);
    
    if (!isFullscreen) {
      handleViolation('fullscreen_exit');
    }
  }, [isTestActive, handleViolation]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (!isTestActive) return;
    
    if (document.hidden) {
      handleViolation('tab_switch');
    }
  }, [isTestActive, handleViolation]);

  // Handle window blur
  const handleWindowBlur = useCallback(() => {
    if (!isTestActive) return;
    
    handleViolation('window_blur');
  }, [isTestActive, handleViolation]);

  // Handle escape key
  const handleEscapeKey = useCallback((e) => {
    if (!isTestActive) return;
    
    if (e.key === 'Escape') {
      e.preventDefault();
      handleViolation('escape_key_pressed');
    }
  }, [isTestActive, handleViolation]);

  // Set up event listeners
  useEffect(() => {
    if (!isTestActive) return;

    // Note: fullscreenchange, visibilitychange, window blur, and escape key are handled by ScreenMonitorContext
    // to avoid double warning decrements
    document.addEventListener('copy', preventCopyPaste, true);
    document.addEventListener('paste', preventCopyPaste, true);
    document.addEventListener('cut', preventCopyPaste, true);
    document.addEventListener('keydown', preventKeyboardShortcuts, true);
    document.addEventListener('contextmenu', preventContextMenu, true);
    
    return () => {
      document.removeEventListener('copy', preventCopyPaste, true);
      document.removeEventListener('paste', preventCopyPaste, true);
      document.removeEventListener('cut', preventCopyPaste, true);
      document.removeEventListener('keydown', preventKeyboardShortcuts, true);
      document.removeEventListener('contextmenu', preventContextMenu, true);
    };
  }, [
    isTestActive, 
    preventCopyPaste, 
    preventKeyboardShortcuts, 
    preventContextMenu
  ]);

  // Initialize or update session ID
  const setTestSession = useCallback((id) => {
    setSessionId(id);
  }, []);

  // Start test
  const startTest = useCallback(() => {
    setIsFullScreen(true);
  }, []);

  // End test
  const endTest = useCallback(() => {
    setIsFullScreen(false);
  }, []);

  const value = {
    isFullScreen,
    isTestActive,
    startTest,
    endTest,
    setTestSession
  };

  return (
    <BrowserControlsContext.Provider value={value}>
      {children}
    </BrowserControlsContext.Provider>
  );
}; 