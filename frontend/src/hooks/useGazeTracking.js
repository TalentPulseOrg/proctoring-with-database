import { useState, useRef, useCallback } from 'react';

/**
 * Simple gaze tracking hook
 * This is a basic implementation that tracks gaze direction based on mouse movement
 * In a real-world application, you would use more sophisticated eye tracking libraries
 */
export const useGazeTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [gazeDirection, setGazeDirection] = useState('center');
  const [isGazeAway, setIsGazeAway] = useState(false);
  const gazeTimeoutRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const callbackRef = useRef(null);
  
  // Simulate gaze tracking based on mouse movement and visibility
  const startTracking = useCallback((videoElement, onGazeChange) => {
    if (!videoElement) return;
    
    setIsTracking(true);
    callbackRef.current = onGazeChange;
    
    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseMovementThreshold = 50; // pixels
    let gazeAwayDuration = 0;
    const maxGazeAwayTime = 3000; // 3 seconds
    
    const handleMouseMove = (e) => {
      const deltaX = Math.abs(e.clientX - lastMouseX);
      const deltaY = Math.abs(e.clientY - lastMouseY);
      
      if (deltaX > mouseMovementThreshold || deltaY > mouseMovementThreshold) {
        // Determine direction based on mouse position relative to screen center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        let direction = 'center';
        if (e.clientX < centerX - 100) direction = 'left';
        else if (e.clientX > centerX + 100) direction = 'right';
        else if (e.clientY < centerY - 100) direction = 'up';
        else if (e.clientY > centerY + 100) direction = 'down';
        
        setGazeDirection(direction);
        
        // Reset gaze away duration if looking at center
        if (direction === 'center') {
          gazeAwayDuration = 0;
          setIsGazeAway(false);
        }
      }
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setGazeDirection('away');
        setIsGazeAway(true);
        if (callbackRef.current) {
          callbackRef.current('away');
        }
      }
    };
    
    // Periodic check for gaze away duration
    trackingIntervalRef.current = setInterval(() => {
      if (gazeDirection !== 'center') {
        gazeAwayDuration += 500; // Check every 500ms
        
        if (gazeAwayDuration >= maxGazeAwayTime && !isGazeAway) {
          setIsGazeAway(true);
          if (callbackRef.current) {
            callbackRef.current('away');
          }
        }
      } else {
        gazeAwayDuration = 0;
        if (isGazeAway) {
          setIsGazeAway(false);
        }
      }
    }, 500);
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Store cleanup function
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
    
    // Return cleanup function
    return cleanup;
  }, [gazeDirection, isGazeAway]);
  
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setGazeDirection('center');
    setIsGazeAway(false);
    
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    
    if (gazeTimeoutRef.current) {
      clearTimeout(gazeTimeoutRef.current);
      gazeTimeoutRef.current = null;
    }
    
    callbackRef.current = null;
  }, []);
  
  return {
    isTracking,
    gazeDirection,
    isGazeAway,
    startTracking,
    stopTracking
  };
};
