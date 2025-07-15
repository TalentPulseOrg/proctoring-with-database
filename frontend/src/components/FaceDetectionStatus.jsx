import React, { useEffect, useRef } from 'react';
import { logMultipleFacesViolationModular } from '../api/api';

const FaceDetectionStatus = ({ faceCount, isDetecting, sessionId }) => {
  // Track last violation to avoid duplicate API calls
  const lastLoggedFaceCount = useRef(null);

  useEffect(() => {
    if (!isDetecting && sessionId && (faceCount === 0 || faceCount > 1)) {
      // Only log if faceCount changed to a violating state
      if (lastLoggedFaceCount.current !== faceCount) {
        logMultipleFacesViolationModular({
          session_id: sessionId,
          face_count: faceCount
        })
          .catch((err) => console.error('Failed to log multiple faces violation:', err));
        lastLoggedFaceCount.current = faceCount;
      }
    } else if (!isDetecting && faceCount === 1) {
      // Reset tracker when back to normal
      lastLoggedFaceCount.current = null;
    }
  }, [faceCount, isDetecting, sessionId]);

  const getStatusStyle = () => {
    if (isDetecting) {
      return {
        backgroundColor: '#666',
        message: 'Detecting faces...'
      };
    }
    
    return {
      backgroundColor: faceCount === 1 ? '#4CAF50' : '#f44336',
      message: `Detected ${faceCount} faces in image`
    };
  };

  const statusStyle = getStatusStyle();

  return (
    <div style={{
      backgroundColor: statusStyle.backgroundColor,
      color: 'white',
      padding: '8px',
      borderRadius: '8px 8px 0 0',
      fontSize: '14px',
      textAlign: 'center',
      transition: 'background-color 0.3s ease',
      boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
      width: '100%'
    }}>
      {statusStyle.message}
    </div>
  );
};

export default FaceDetectionStatus; 