import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useBrowserControls } from '../contexts/BrowserControlsContext';
import { useViolationLogger } from '../hooks/useViolationLogger';
import { startScreenshotService, stopScreenshotService } from '../api/api';
import { Toast } from './Toast';
import ProctoringStatus from './ProctoringStatus';
import { FaVideo, FaMicrophone, FaEye } from 'react-icons/fa';
import { Box, Typography } from '@mui/material';
import { useWarning } from '../contexts/WarningContext';
import useAudioMonitor from '../hooks/useAudioMonitor';
import AudioAlert from './AudioAlert';

export default function ProctoringSuite({ sessionId, testId, isTestActive }) {
  const videoRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [isScreenshotServiceActive, setIsScreenshotServiceActive] = useState(false);
  const [isFaceDetectionActive, setIsFaceDetectionActive] = useState(false);
  const [isFullscreenEnforced, setIsFullscreenEnforced] = useState(false);
  const [isKeyboardShortcutsDisabled, setIsKeyboardShortcutsDisabled] = useState(false);
  const [isTabSwitchingBlocked, setIsTabSwitchingBlocked] = useState(false);
  const [isCopyPasteDisabled, setIsCopyPasteDisabled] = useState(false);
  const [isContextMenuDisabled, setIsContextMenuDisabled] = useState(false);
  const [isDeveloperToolsBlocked, setIsDeveloperToolsBlocked] = useState(false);
  const [isEscapeKeyBlocked, setIsEscapeKeyBlocked] = useState(false);
  const [isWindowBlurBlocked, setIsWindowBlurBlocked] = useState(false);
  const [isMultipleFacesDetected, setIsMultipleFacesDetected] = useState(false);
  const [isNoFaceDetected, setIsNoFaceDetected] = useState(false);
  const [isGazeAway, setIsGazeAway] = useState(false);
  const [isContinuousNoise, setIsContinuousNoise] = useState(false);

  // Hooks for proctoring features
  const faceDetection = useFaceDetection();
  const browserControls = useBrowserControls();
  const enterFullScreen = browserControls?.enterFullScreen;
  const isFullScreen = browserControls?.isFullScreen;
  const setTestSession = browserControls?.setTestSession;
  const { logViolation } = useViolationLogger();
  const { handleViolation } = useWarning();

  // Audio monitoring
  const { alert: audioAlert, monitoring: isAudioActive, sessionEvents: audioSessionEvents } = useAudioMonitor(isTestActive);
  const isAudioSuspicious = !!audioAlert;

  // Add toast notification
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  // Remove toast notification
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Initialize all monitoring services when component mounts
  useEffect(() => {
    if (sessionId && setTestSession) {
      setTestSession(sessionId);
    }
  }, [sessionId, setTestSession]);

  // Remove the enforceFullscreen function and its usage
  const startAllServices = useCallback(async () => {
    try {
      // Start screenshot service
      if (!isScreenshotServiceActive) {
        await startScreenshotService({
          session_id: sessionId,
          test_id: testId
        });
        setIsScreenshotServiceActive(true);
      }

      // Start face detection
      if (!isFaceDetectionActive && videoRef.current) {
        faceDetection.startDetection(videoRef.current, sessionId, (faces) => {
          setFaceCount(faces.length);
          if (faces.length > 1) {
            setIsMultipleFacesDetected(true);
            addToast('Multiple faces detected', 'warning');
            handleViolation('multiple_faces');
          } else if (faces.length === 0) {
            setIsNoFaceDetected(true);
            addToast('No face detected', 'warning');
            handleViolation('no_face');
          } else {
            setIsMultipleFacesDetected(false);
            setIsNoFaceDetected(false);
          }
        });
        setIsFaceDetectionActive(true);
      }

      // Start gaze tracking
      if (!isGazeTrackingActive && videoRef.current) {
        gazeTracking.startTracking(videoRef.current, (direction) => {
          if (direction === 'away') {
            setIsGazeAway(true);
            addToast('Looking away from screen', 'warning');
            handleViolation('gaze_away');
          } else {
            setIsGazeAway(false);
          }
        });
        setIsGazeTrackingActive(true);
      }
    } catch (error) {
      console.error('Error starting monitoring services:', error);
      addToast('Failed to start some monitoring services', 'error');
    }
  }, [
    sessionId,
    testId,
    isScreenshotServiceActive,
    isFaceDetectionActive,
    isGazeTrackingActive,
    faceDetection,
    gazeTracking,
    addToast,
    handleViolation
  ]);

  // Function to stop all monitoring services
  const stopAllServices = () => {
    faceDetection.stopDetection();
    gazeTracking.stopTracking();
    stopScreenshotService().catch(err => 
      console.error('Error stopping screenshot service:', err)
    );
    
    // Reset all indicators
    setIsFaceDetectionActive(false);
    setIsGazeTrackingActive(false);
    setIsScreenshotServiceActive(false);
    setIsFullscreenEnforced(false);
    setIsKeyboardShortcutsDisabled(false);
    setIsTabSwitchingBlocked(false);
    setIsCopyPasteDisabled(false);
    setIsContextMenuDisabled(false);
    setIsDeveloperToolsBlocked(false);
    setIsEscapeKeyBlocked(false);
    setIsWindowBlurBlocked(false);
    setIsMultipleFacesDetected(false);
    setIsNoFaceDetected(false);
    setIsGazeAway(false);
    setIsContinuousNoise(false);
  };

  // Start services when test becomes active
  useEffect(() => {
    if (isTestActive) {
      console.log("Starting proctoring services for active test", { sessionId, testId });
      startAllServices();
    }
    
    // Only stop services on component unmount, not on every dependency change
    return () => {
      // Don't stop services when dependencies change, only on unmount
      if (!isTestActive) {
        console.log("Component unmounting, stopping all services");
        stopAllServices();
      }
    };
  }, [isTestActive, sessionId, testId]);

  const getProctoringStatus = () => {
    const statuses = [
      {
        icon: <FaVideo />,
        label: 'Webcam',
        isActive: isFaceDetectionActive,
        isSuspicious: false
      },
      {
        icon: <FaMicrophone />,
        label: 'Audio',
        isActive: isAudioActive,
        isSuspicious: isAudioSuspicious
      },
      {
        icon: <FaEye />,
        label: 'Gaze',
        isActive: isGazeTrackingActive,
        isSuspicious: false
      }
    ];

    return statuses.map((status, index) => (
      <Box
        key={index}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: status.isSuspicious ? 'error.main' : status.isActive ? 'success.main' : 'text.secondary'
        }}
      >
        {status.icon}
        <Typography variant="body2">
          {status.label}
        </Typography>
      </Box>
    ));
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        {/* Audio alert */}
        <AudioAlert alert={audioAlert} />
      </div>

      {/* Hidden video element for face detection and gaze tracking */}
      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        playsInline
        muted
      />

      {/* Proctoring Status Display */}
      <ProctoringStatus
        isFaceDetectionActive={isFaceDetectionActive}
        isGazeTrackingActive={isGazeTrackingActive}
        isScreenshotServiceActive={isScreenshotServiceActive}
        isFullscreenEnforced={isFullscreenEnforced}
        isKeyboardShortcutsDisabled={isKeyboardShortcutsDisabled}
        isTabSwitchingBlocked={isTabSwitchingBlocked}
        isCopyPasteDisabled={isCopyPasteDisabled}
        isContextMenuDisabled={isContextMenuDisabled}
        isDeveloperToolsBlocked={isDeveloperToolsBlocked}
        isEscapeKeyBlocked={isEscapeKeyBlocked}
        isWindowBlurBlocked={isWindowBlurBlocked}
        isMultipleFacesDetected={isMultipleFacesDetected}
        isNoFaceDetected={isNoFaceDetected}
        isGazeAway={isGazeAway}
        isContinuousNoise={isContinuousNoise}
      />

      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          zIndex: 1000
        }}
      >
        {getProctoringStatus()}
      </Box>
    </Box>
  );
} 