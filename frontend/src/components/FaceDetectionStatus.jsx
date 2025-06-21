import React from 'react';

const FaceDetectionStatus = ({ faceCount, isDetecting }) => {
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