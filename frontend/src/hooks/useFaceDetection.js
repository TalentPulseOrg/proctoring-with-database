import { useState, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { recordViolation } from '../api/api';

export const useFaceDetection = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const detectionIntervalRef = useRef(null);
  
  // Initialize face detection models
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      // Load the face detection models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models')
      ]);
      
      setIsInitialized(true);
      setError(null);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to initialize face detection:', err);
      setError('Failed to initialize face detection: ' + err.message);
      setLoading(false);
      return false;
    }
  }, []);
  
  // Detect faces in a video element
  const detectFaces = useCallback(async (videoElement) => {
    if (!videoElement || !isInitialized) {
      return { count: 0, error: 'Video element or face detection not initialized' };
    }
    
    try {
      // Detect all faces in the video element
      const detections = await faceapi.detectAllFaces(
        videoElement,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks();
      
      // Update face count
      const count = detections.length;
      setFaceCount(count);
      
      return { count, detections, error: null };
    } catch (err) {
      console.error('Error detecting faces:', err);
      setError('Error detecting faces: ' + err.message);
      return { count: 0, error: err.message };
    }
  }, [isInitialized]);
  
  // Start continuous face detection
  const startDetection = useCallback((videoElement, sessionId, onFaceDetected) => {
    if (!videoElement || !isInitialized) {
      console.error('Cannot start detection: video element or face detection not initialized');
      return false;
    }
    
    // Clear any existing interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    setIsDetecting(true);
    
    // Set up interval for face detection
    detectionIntervalRef.current = setInterval(async () => {
      const result = await detectFaces(videoElement);
      
      // Log violation if multiple faces detected
      if (result.count > 1 && sessionId) {
        // Record violation in the backend
        recordViolation({
          session_id: sessionId,
          violation_type: 'multiple_faces',
          details: { 
            face_count: result.count,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        }).catch(err => console.error('Failed to record multiple faces violation:', err));
        
        // Call callback if provided
        if (onFaceDetected) {
          onFaceDetected({
            type: 'multiple_faces',
            count: result.count,
            timestamp: new Date().toISOString()
          });
        }
      } else if (result.count === 0 && sessionId) {
        // Record violation if no face detected
        recordViolation({
          session_id: sessionId,
          violation_type: 'no_face',
          details: { 
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        }).catch(err => console.error('Failed to record no face violation:', err));
        
        // Call callback if provided
        if (onFaceDetected) {
          onFaceDetected({
            type: 'no_face',
            count: 0,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 5000); // Check every 5 seconds
    
    return true;
  }, [isInitialized, detectFaces]);
  
  // Stop face detection
  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsDetecting(false);
  }, []);
  
  return {
    initialize,
    detectFaces,
    startDetection,
    stopDetection,
    faceCount,
    isInitialized,
    isDetecting,
    error,
    loading
  };
}; 