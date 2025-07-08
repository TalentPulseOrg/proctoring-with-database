import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { analyzeLighting } from '../utils/lightingAnalyzer';
import * as faceapi from 'face-api.js';
import { useViolationLogger } from '../hooks/useViolationLogger';
import { useEnhancedViolationLogger } from '../hooks/useEnhancedViolationLogger';
import { API_BASE_URL } from '../config';
import AppLayout from '../layouts/AppLayout';

const CALIBRATION_STEPS = [
  { key: 'left', label: 'Look LEFT' },
  { key: 'right', label: 'Look RIGHT' },
  { key: 'center', label: 'Look CENTER' },
  { key: 'up', label: 'Look UP' },
  { key: 'down', label: 'Look DOWN' },
];

const WebcamMonitor = ({ testId, sessionId = null, userId, isTestActive = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState(null);
  const [lightingStatus, setLightingStatus] = useState(null);
  const [lastLightingCheck, setLastLightingCheck] = useState(0);
  const [showLightingToast, setShowLightingToast] = useState(false);
  const { logViolation, isLogging, startLogging, stopLogging } = useViolationLogger(sessionId, testId);
  const enhancedLogger = useEnhancedViolationLogger(sessionId);
  const lastViolationRef = useRef(false);
  const lastLightingViolationRef = useRef(0);
  const lastMultipleFacesViolationRef = useRef(0);
  const [calibrated, setCalibrated] = useState(false);

  useEffect(() => {
    if (sessionId && !isLogging) {
      startLogging();
    }
    
    // Also start enhanced logging
    if (sessionId && enhancedLogger) {
      enhancedLogger.startLogging();
    }
    
    return () => {
      stopLogging();
      if (enhancedLogger) {
        enhancedLogger.stopLogging();
      }
    };
  }, [sessionId, enhancedLogger]);

  useEffect(() => {
    if (isViolation && !lastViolationRef.current) {
      logViolation('gaze_away', { direction: gazeDirection });
      lastViolationRef.current = true;
    } else if (!isViolation) {
      lastViolationRef.current = false;
    }
  }, [isViolation, gazeDirection, logViolation]);

  useEffect(() => {
    let stream = null;
    let captureInterval = null;
    let lightingCheckInterval = null;
    let toastTimeout = null;

    const loadFaceApiModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Failed to load face detection models');
      }
    };

    const startWebcam = async () => {
      try {
        console.log('Requesting webcam access...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        
        if (videoRef.current) {
          console.log('Webcam stream obtained, setting up video element');
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }

        // Load face-api models
        await loadFaceApiModels();

        // Start periodic capture for suspicious activity
        captureInterval = setInterval(captureAndAnalyze, 15000); // Every 15 seconds
        
        // Start periodic lighting check
        console.log('Starting lighting check interval');
        lightingCheckInterval = setInterval(() => {
          checkLighting().catch(err => {
            console.error('Error in lighting check:', err);
          });
        }, 5000);

        // Start gaze tracking when webcam is streaming
        if (isStreaming && videoRef.current) {
          startTracking(videoRef);
        } else {
          stopTracking();
        }
      } catch (err) {
        console.error('Webcam error:', err);
        setError('Failed to access webcam: ' + err.message);
      }
    };

    const checkLighting = async () => {
      console.log('Checking lighting...');
      if (!videoRef.current || !canvasRef.current) {
        console.error('Video or canvas ref not available');
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Analyze lighting
      const lightingAnalysis = await analyzeLighting(canvas, sessionId, isTestActive);
      console.log('Lighting analysis result:', lightingAnalysis);
      
      setLightingStatus(lightingAnalysis);
      setLastLightingCheck(Date.now());

      // Show toast if lighting is not adequate and log violation
      if (!lightingAnalysis.is_adequate) {
        setShowLightingToast(true);
        
        // Log lighting violation with cooldown (once every 15 seconds)
        const now = Date.now();
        if (now - lastLightingViolationRef.current > 15000) {
          if (enhancedLogger) {
            enhancedLogger.logLightingIssue({
              level: lightingAnalysis.brightness_level,
              status: lightingAnalysis.status
            });
            lastLightingViolationRef.current = now;
          }
        }
        
        // Clear any existing timeout
        if (toastTimeout) {
          clearTimeout(toastTimeout);
        }
        // Hide toast after 5 seconds
        toastTimeout = setTimeout(() => {
          setShowLightingToast(false);
        }, 5000);
      }
    };

    const captureAndAnalyze = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        
        // Create form data
        const formData = new FormData();
        formData.append('file', blob, 'snapshot.jpg');
        formData.append('test_id', testId);

        // Send to backend
        const response = await axios.post(
          `${API_BASE_URL}/api/tests/save-snapshot`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        console.log('Webcam analysis response:', response.data);

        // Handle suspicious activity
        if (response.data.face_count > 1) {
          console.warn('Suspicious activity detected:', response.data);
          setSuspiciousActivity({
            timestamp: new Date().toLocaleTimeString(),
            faceCount: response.data.face_count
          });

          // Log multiple faces violation with cooldown (once every 5 seconds)
          const now = Date.now();
          if (now - lastMultipleFacesViolationRef.current > 5000) {
            if (enhancedLogger) {
              enhancedLogger.logMultipleFaces(
                response.data.face_count,
                response.data.saved_image_path
              );
              lastMultipleFacesViolationRef.current = now;
            }
          }

          // Log the suspicious activity (legacy)
          try {
            await axios.post(`${API_BASE_URL}/monitoring/log-event`, {
              test_id: testId,
              event_type: 'suspicious_activity',
              timestamp: new Date().toISOString(),
              details: {
                face_count: response.data.face_count,
                saved_image_path: response.data.saved_image_path
              }
            });
          } catch (logError) {
            console.error('Error logging suspicious activity:', logError);
          }
        }
      } catch (err) {
        console.error('Error capturing and analyzing:', err);
        setError('Failed to capture and analyze: ' + err.message);
      }
    };

    startWebcam();

    // Cleanup
    return () => {
      if (captureInterval) {
        clearInterval(captureInterval);
      }
      if (lightingCheckInterval) {
        clearInterval(lightingCheckInterval);
      }
      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      stopTracking();
    };
  }, [testId, isStreaming, videoRef]);

  // Calibration UI logic
  useEffect(() => {
    if (!calibrated) {
      stopTracking();
    } else if (isStreaming && videoRef.current) {
      startTracking(videoRef);
    }
    // eslint-disable-next-line
  }, [calibrated, isStreaming]);

  // Start calibration on mount if not calibrated
  useEffect(() => {
    if (!calibrated) {
      startCalibration();
    }
    // eslint-disable-next-line
  }, []);

  // Get lighting status color and icon
  const getLightingStatusStyle = () => {
    if (!lightingStatus) return { backgroundColor: '#666', message: 'Checking lighting...' };
    
    switch (lightingStatus.status) {
      case 'normal':
        return { backgroundColor: '#4CAF50', message: 'Lighting is good' };
      case 'too_dark':
        return { backgroundColor: '#f44336', message: 'Room is too dark' };
      case 'too_bright':
        return { backgroundColor: '#ff9800', message: 'Room is too bright' };
      default:
        return { backgroundColor: '#666', message: 'Checking lighting...' };
    }
  };

  const lightingStyle = getLightingStatusStyle();

  return (
    <AppLayout>
      {/* Calibration UI */}
      {!calibrated && calibrationStep && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000, background: '#fff', padding: 24, textAlign: 'center', borderBottom: '2px solid #2196F3',
        }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Gaze Calibration</h2>
          <p style={{ fontSize: 16, marginBottom: 16 }}>
            Please follow the instructions below. Hold your gaze for 2 seconds on each direction, then click "Record".
          </p>
          <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#2196F3' }}>
            {CALIBRATION_STEPS.find(s => s.key === calibrationStep)?.label}
          </div>
          <button
            onClick={nextCalibrationStep}
            style={{ padding: '10px 24px', fontSize: 16, background: '#2196F3', color: '#fff', border: 'none', borderRadius: 6, marginRight: 12 }}
          >
            Record
          </button>
          {calibrationStep === 'down' && (
            <button
              onClick={() => { finishCalibration(); setCalibrated(true); }}
              style={{ padding: '10px 24px', fontSize: 16, background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6 }}
            >
              Finish Calibration
            </button>
          )}
          <div style={{ marginTop: 16, fontSize: 14, color: '#888' }}>
            Step {CALIBRATION_STEPS.findIndex(s => s.key === calibrationStep) + 1} of {CALIBRATION_STEPS.length}
          </div>
        </div>
      )}
      <div className="webcam-container" style={{ width: '320px', height: '240px', position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        {/* Gaze Tracking Label */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '0',
          right: '0',
          backgroundColor: isViolation ? '#f44336' : '#2196F3',
          color: 'white',
          padding: '8px',
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          textAlign: 'center',
          transition: 'background-color 0.3s ease',
          boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
        }}>
          {isViolation ? 'Please keep your eyes on the screen!' : `Gaze direction: ${gazeDirection}`}
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {error && (
          <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>
            {error}
          </div>
        )}
        {suspiciousActivity && (
          <div className="suspicious-alert" style={{ 
            position: 'absolute', 
            top: '10px', 
            left: '10px', 
            right: '10px',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            ⚠️ Multiple faces detected ({suspiciousActivity.faceCount}) at {suspiciousActivity.timestamp}
          </div>
        )}
      </div>

      {/* Lighting Toast */}
      {showLightingToast && lightingStatus && !lightingStatus.is_adequate && (
        <div className="lighting-toast" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(255, 165, 0, 0.9)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          animation: 'slideIn 0.3s ease-out',
          zIndex: 1001,
          maxWidth: '300px'
        }}>
          ⚠️ {lightingStatus.message}
        </div>
      )}
    </AppLayout>
  );
};

export default WebcamMonitor; 