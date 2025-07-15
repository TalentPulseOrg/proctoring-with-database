/**
 * Face Detection Feature Module
 * 
 * This module handles face detection, multiple face detection, and face verification.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - React hooks
 * - API service
 * - face-api.js (optional for advanced features)
 * 
 * Usage:
 *     import { useFaceDetection } from './features/proctoring/face_detection';
 *     
 *     // Use in component
 *     const { faceCount, isMultipleFaces, detectFaces } = useFaceDetection(sessionId, isActive);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logMultipleFacesViolationModular, detectFaces } from '../../../api/api';

/**
 * Hook for face detection monitoring
 * @param {number} sessionId - The test session ID
 * @param {boolean} isActive - Whether monitoring is active
 * @returns {object} Face detection monitoring state and functions
 */
export const useFaceDetection = (sessionId, isActive = false) => {
  const [faceCount, setFaceCount] = useState(0);
  const [isMultipleFaces, setIsMultipleFaces] = useState(false);
  const [isNoFace, setIsNoFace] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Detect faces in video stream
  const detectFacesInStream = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64
      const imageData = canvas.toDataURL('image/jpeg').split(',')[1];
      
      // Send to backend for face detection
      const response = await detectFaces({
        session_id: sessionId,
        image_data: imageData,
        confidence_threshold: 0.5
      });
      
      const detectedFaceCount = response.face_count;
      setFaceCount(detectedFaceCount);
      setLastDetection(new Date());
      
      // Check for violations
      if (detectedFaceCount > 1) {
        setIsMultipleFaces(true);
        setIsNoFace(false);
        
        // Log multiple faces violation
        await logMultipleFacesViolationModular({
          session_id: sessionId,
          face_count: detectedFaceCount,
          image_path: response.image_path
        });
      } else if (detectedFaceCount === 0) {
        setIsNoFace(true);
        setIsMultipleFaces(false);
      } else {
        setIsMultipleFaces(false);
        setIsNoFace(false);
      }
      
      return detectedFaceCount;
    } catch (error) {
      console.error('Face detection failed:', error);
      return 0;
    }
  }, [sessionId]);

  // Start face detection monitoring
  const startDetection = useCallback(async () => {
    if (!isActive) return;
    
    try {
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsMonitoring(true);
      
      // Start periodic face detection
      const interval = setInterval(() => {
        if (isActive && videoRef.current && videoRef.current.readyState === 4) {
          detectFacesInStream();
        }
      }, 2000); // Check every 2 seconds
      
      return () => {
        clearInterval(interval);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    } catch (error) {
      console.error('Failed to start face detection:', error);
    }
  }, [isActive, detectFacesInStream]);

  // Stop face detection monitoring
  const stopDetection = useCallback(() => {
    setIsMonitoring(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start monitoring when component mounts or dependencies change
  useEffect(() => {
    if (isActive) {
      const cleanup = startDetection();
      return cleanup;
    } else {
      stopDetection();
    }
  }, [isActive, startDetection, stopDetection]);

  return {
    faceCount,
    isMultipleFaces,
    isNoFace,
    isMonitoring,
    lastDetection,
    videoRef,
    detectFacesInStream,
    startDetection,
    stopDetection
  };
};

/**
 * Component for face detection warning
 * @param {object} props - Component props
 * @param {boolean} props.isMultipleFaces - Whether multiple faces are detected
 * @param {boolean} props.isNoFace - Whether no face is detected
 * @param {number} props.faceCount - Number of faces detected
 * @returns {JSX.Element} Warning component
 */
export const FaceDetectionWarning = ({ isMultipleFaces, isNoFace, faceCount }) => {
  if (!isMultipleFaces && !isNoFace) return null;

  return (
    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
      <strong className="font-bold">Face Detection Alert!</strong>
      <span className="block sm:inline">
        {isMultipleFaces && ` Multiple faces detected (${faceCount} faces).`}
        {isNoFace && ' No face detected in camera view.'}
      </span>
    </div>
  );
};

/**
 * Component for face detection status display
 * @param {object} props - Component props
 * @param {number} props.faceCount - Number of faces detected
 * @param {boolean} props.isMultipleFaces - Whether multiple faces are detected
 * @param {boolean} props.isNoFace - Whether no face is detected
 * @param {boolean} props.isMonitoring - Whether monitoring is active
 * @returns {JSX.Element} Status component
 */
export const FaceDetectionStatus = ({ faceCount, isMultipleFaces, isNoFace, isMonitoring }) => {
  const getStatusColor = () => {
    if (isMultipleFaces) return 'text-red-600';
    if (isNoFace) return 'text-yellow-600';
    if (faceCount === 1) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (isMultipleFaces) return `Multiple Faces (${faceCount})`;
    if (isNoFace) return 'No Face Detected';
    if (faceCount === 1) return 'Single Face Detected';
    return 'Face Detection Unknown';
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${
        isMultipleFaces ? 'bg-red-500' : 
        isNoFace ? 'bg-yellow-500' : 
        faceCount === 1 ? 'bg-green-500' : 'bg-gray-500'
      }`}></div>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {isMonitoring && (
        <span className="text-xs text-gray-500">(Monitoring)</span>
      )}
    </div>
  );
};

/**
 * Component for video feed with face detection
 * @param {object} props - Component props
 * @param {object} props.videoRef - Video element ref
 * @param {boolean} props.isMonitoring - Whether monitoring is active
 * @returns {JSX.Element} Video component
 */
export const FaceDetectionVideo = ({ videoRef, isMonitoring }) => {
  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-64 object-cover rounded-lg"
      />
      {isMonitoring && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
          Monitoring
        </div>
      )}
    </div>
  );
};

// Export all components and hooks
export default {
  useFaceDetection,
  FaceDetectionWarning,
  FaceDetectionStatus,
  FaceDetectionVideo
}; 