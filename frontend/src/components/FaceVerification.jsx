import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { uploadIdPhoto, verifyFace, getVerificationStatus } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../styles/theme';

const FaceVerification = ({ onVerificationComplete }) => {
  const [idPhotoUploaded, setIdPhotoUploaded] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Check current verification status on load
    if (user?.id) {
      checkVerificationStatus();
    }
    
    return () => {
      // Clean up video stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await getVerificationStatus(user.id);
      setVerificationStatus(response);
      setIdPhotoUploaded(response.verification !== null);
      setLoading(false);
    } catch (err) {
      setError('Failed to check verification status');
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure camera permissions are enabled.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg');
  };

  const handleUploadIdPhoto = async () => {
    if (!stream) {
      await startCamera();
      return;
    }
    
    try {
      const photoData = capturePhoto();
      if (!photoData) {
        setError('Failed to capture photo');
        return;
      }
      
      // Convert data URL to Blob
      const base64Response = await fetch(photoData);
      const blob = await base64Response.blob();
      
      setLoading(true);
      const response = await uploadIdPhoto(user.id, blob);
      
      if (response.success) {
        setSuccess('ID photo uploaded successfully');
        setIdPhotoUploaded(true);
        stopCamera();
      } else {
        setError(response.message || 'Failed to upload ID photo');
      }
      setLoading(false);
    } catch (err) {
      setError('Error uploading ID photo');
      setLoading(false);
    }
  };

  const handleVerifyFace = async () => {
    if (!stream) {
      await startCamera();
      return;
    }
    
    try {
      const photoData = capturePhoto();
      if (!photoData) {
        setError('Failed to capture photo');
        return;
      }
      
      // Convert data URL to Blob
      const base64Response = await fetch(photoData);
      const blob = await base64Response.blob();
      
      setLoading(true);
      const response = await verifyFace(user.id, blob);
      
      if (response.success) {
        setSuccess('Face verification successful');
        setVerificationStatus(response);
        stopCamera();
        if (onVerificationComplete) {
          onVerificationComplete(true);
        }
      } else {
        setError(response.message || 'Face verification failed');
        if (onVerificationComplete) {
          onVerificationComplete(false);
        }
      }
      setLoading(false);
    } catch (err) {
      setError('Error verifying face');
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 700, mx: 'auto', my: 4, bgcolor: colors.cardBg, fontFamily: fonts.main, boxShadow: `0 4px 24px ${colors.cardShadow}` }}>
      <Typography variant="h5" gutterBottom sx={{ color: colors.primaryDark, fontFamily: fonts.heading }}>
        Face Verification
      </Typography>
      
      {loading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ my: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      <Box sx={{ my: 3 }}>
        {stream ? (
          <>
            <Box sx={{ position: 'relative', width: '100%', maxWidth: 640, mx: 'auto' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ width: '100%', borderRadius: 8 }}
              />
              <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              <button
                style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 500, border: 'none', fontFamily: fonts.main, boxShadow: '0 2px 8px rgba(239,68,68,0.08)' }}
                onClick={stopCamera}
              >
                Cancel
              </button>
              <button
                style={{
                  background: colors.buttonBg,
                  color: colors.buttonText,
                  borderRadius: 6,
                  padding: '0.5rem 1.5rem',
                  fontWeight: 500,
                  border: 'none',
                  fontFamily: fonts.main,
                  boxShadow: `0 2px 8px ${colors.cardShadow}`,
                  outline: 'none',
                }}
                onClick={idPhotoUploaded ? handleVerifyFace : handleUploadIdPhoto}
                disabled={loading}
                onFocus={e => (e.target.style.boxShadow = `0 0 0 3px ${colors.primary}55`)}
                onBlur={e => (e.target.style.boxShadow = `0 2px 8px ${colors.cardShadow}`)}
              >
                {idPhotoUploaded ? 'Verify Face' : 'Capture ID Photo'}
              </button>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {verificationStatus && verificationStatus.is_verified ? (
              <Alert severity="success" sx={{ width: '100%' }}>
                Your face has been verified successfully.
              </Alert>
            ) : (
              <>
                <Typography variant="body1" align="center" sx={{ mb: 2 }}>
                  {idPhotoUploaded 
                    ? 'Please verify your face to continue'
                    : 'Please upload your ID photo for verification'}
                </Typography>
                <button
                  style={{
                    background: colors.buttonBg,
                    color: colors.buttonText,
                    borderRadius: 6,
                    padding: '0.5rem 1.5rem',
                    fontWeight: 500,
                    border: 'none',
                    fontFamily: fonts.main,
                    boxShadow: `0 2px 8px ${colors.cardShadow}`,
                    outline: 'none',
                  }}
                  onClick={startCamera}
                  disabled={loading}
                  onFocus={e => (e.target.style.boxShadow = `0 0 0 3px ${colors.primary}55`)}
                  onBlur={e => (e.target.style.boxShadow = `0 2px 8px ${colors.cardShadow}`)}
                >
                  {idPhotoUploaded ? 'Start Face Verification' : 'Upload ID Photo'}
                </button>
              </>
            )}
          </Box>
        )}
      </Box>
      
      {verificationStatus && verificationStatus.verification && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Verification Status
          </Typography>
          <Typography variant="body2">
            Status: {verificationStatus.verification.is_verified ? 'Verified' : 'Not Verified'}
          </Typography>
          {verificationStatus.verification.match_score && (
            <Typography variant="body2">
              Match Score: {(verificationStatus.verification.match_score * 100).toFixed(2)}%
            </Typography>
          )}
          {verificationStatus.verification.verification_date && (
            <Typography variant="body2">
              Last Verification: {new Date(verificationStatus.verification.verification_date).toLocaleString()}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default FaceVerification; 