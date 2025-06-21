import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { analyzeLighting } from '../utils/lightingAnalyzer';
import FaceDetectionStatus from './FaceDetectionStatus';
import { useWarning } from '../contexts/WarningContext';
import { API_BASE_URL } from '../config';

const WebcamFeed = ({ sessionId, userId, isActive = true }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [lightingStatus, setLightingStatus] = useState(null);
  const [faceCount, setFaceCount] = useState(0);
  const [isDetecting, setIsDetecting] = useState(true);
  const snapshotIntervalRef = useRef(null);
  const lightingCheckIntervalRef = useRef(null);
  const faceDetectionIntervalRef = useRef(null);
  const { warningCount, MAX_WARNINGS, handleViolation } = useWarning();
  
  // Simple function to capture and send snapshot
  const captureSnapshot = async () => {
    try {
      // Check if we have what we need
      if (!videoRef.current || !canvasRef.current) {
        console.error("Missing required refs");
        return;
      }

      if (!sessionId || !userId) {
        console.error("Missing sessionId or userId", { sessionId, userId });
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Draw video to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Analyze lighting
      const lightingAnalysis = analyzeLighting(canvas);
      setLightingStatus(lightingAnalysis);
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'snapshot.jpg');
      formData.append('test_id', sessionId);
      formData.append('sessionId', sessionId);
      formData.append('userId', userId);
      formData.append('snapshot_type', 'webcam');

      // Debug: log all form data
      for (let pair of formData.entries()) {
        console.log('FormData:', pair[0], pair[1]);
      }
      
      // Send to backend
      const response = await axios.post(`${API_BASE_URL}/api/tests/save-snapshot`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update face count
      if (response.data && response.data.face_count !== undefined) {
        setFaceCount(response.data.face_count);
        setIsDetecting(false);
        // Call handleViolation for face violations
        if (response.data.face_count > 1) {
          handleViolation('multiple_faces');
        } else if (response.data.face_count === 0) {
          handleViolation('no_face');
        }
      }
      
      setSnapshotCount(prev => prev + 1);
    } catch (err) {
      console.error("Error capturing snapshot:", err);
      setError("Failed to capture snapshot: " + err.message);
    }
  };
  
  useEffect(() => {
    let stream = null;
    
    const startWebcam = async () => {
      try {
        // Clear any existing intervals
        if (snapshotIntervalRef.current) {
          clearInterval(snapshotIntervalRef.current);
          snapshotIntervalRef.current = null;
        }
        if (lightingCheckIntervalRef.current) {
          clearInterval(lightingCheckIntervalRef.current);
          lightingCheckIntervalRef.current = null;
        }
        if (faceDetectionIntervalRef.current) {
          clearInterval(faceDetectionIntervalRef.current);
          faceDetectionIntervalRef.current = null;
        }
        
        // Request camera access
        console.log("Requesting webcam access...");
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        
        // Set video source
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
          };
          
          console.log("Webcam started successfully");
          setError(null);
          
          // Start taking snapshots after a delay
          console.log("Setting up snapshot interval (10s delay before first snapshot)");
          setTimeout(() => {
            // Take first snapshot
            captureSnapshot();
            
            // Then set up interval for regular snapshots
            snapshotIntervalRef.current = setInterval(captureSnapshot, 5000);
            console.log("Snapshot interval started - every 5 seconds");
            
            // Set up lighting check interval
            lightingCheckIntervalRef.current = setInterval(() => {
              if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const lightingAnalysis = analyzeLighting(canvas);
                setLightingStatus(lightingAnalysis);
              }
            }, 2000); // Check lighting every 2 seconds
          }, 10000);
        }
      } catch (err) {
        console.error("Webcam access error:", err);
        setError(`Camera error: ${err.message}`);
      }
    };
    
    // Only start if active and has sessionId
    if (isActive && sessionId) {
      console.log(`Starting webcam with sessionId: ${sessionId}`);
      startWebcam();
    }
    
    // Cleanup function
    return () => {
      console.log("Cleaning up webcam resources");
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
      }
      if (lightingCheckIntervalRef.current) {
        clearInterval(lightingCheckIntervalRef.current);
      }
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId, isActive]);
  
  // Get lighting status color and message
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
  
  if (!sessionId) {
    return (
      <div className="webcam-container bg-gray-100 rounded p-4 text-center">
        <p className="text-gray-500">Waiting for session to start...</p>
      </div>
    );
  }
  
  return (
    <div className="webcam-container">
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-2">
          {error}
        </div>
      )}
      
      <div className="relative">
        {/* Face Detection Status */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '0',
          right: '0',
          zIndex: 10
        }}>
          <FaceDetectionStatus faceCount={faceCount} isDetecting={isDetecting} />
        </div>
        
        {/* Lighting Status Display */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '0',
          right: '0',
          backgroundColor: lightingStyle.backgroundColor,
          color: 'white',
          padding: '8px',
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          textAlign: 'center',
          transition: 'background-color 0.3s ease',
          boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
          zIndex: 9
        }}>
          {lightingStyle.message}
        </div>
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded border border-gray-300"
          style={{ maxHeight: '240px', background: '#f0f0f0' }}
        />
        
        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Snapshot counter */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {snapshotCount > 0 ? `${snapshotCount} snapshots` : 'Initializing...'}
        </div>
      </div>
      {/* Warning Count Label */}
      <div className="flex justify-center mt-2">
        <span className="inline-block bg-yellow-100 border border-yellow-400 text-yellow-800 text-sm font-semibold px-4 py-1 rounded shadow">
          Warnings Remaining: {warningCount} / {MAX_WARNINGS}
        </span>
      </div>
    </div>
  );
};

export default WebcamFeed; 