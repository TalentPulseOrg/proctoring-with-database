import React from 'react';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { FaVideo, FaExclamationTriangle } from 'react-icons/fa';

const CameraPermissionWarning = ({ 
    isVisible, 
    onRetryPermission, 
    cameraStatus,
    isLoading = false 
}) => {
    if (!isVisible) return null;

    const getStatusMessage = () => {
        switch (cameraStatus) {
            case 'denied':
                return 'Camera access has been denied or revoked. Please follow the steps given below to allow camera access.';
            case 'not_found':
                return 'No camera device found. Please connect a camera and try again.';
            case 'error':
                return 'An error occurred while accessing the camera. Please try again.';
            default:
                return 'Camera access is required to continue the test.';
        }
    };

    const getInstructions = () => {
        return [
            'Search for permissions in your browser settings or use shortcut button provided',
            'From the permissions handler, find the camera permission for this site, and toggle it to on',
        ];
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: 2
            }}
        >
            <Paper
                elevation={8}
                sx={{
                    p: 4,
                    maxWidth: 500,
                    width: '100%',
                    textAlign: 'center',
                    borderRadius: 2,
                    border: '2px solid #f44336'
                }}
            >
                <Box sx={{ mb: 3 }}>
                    <FaExclamationTriangle 
                        size={48} 
                        color="#f44336" 
                        style={{ marginBottom: '16px' }}
                    />
                    <Typography variant="h5" gutterBottom color="error" fontWeight="bold">
                        Camera Access Required
                    </Typography>
                </Box>

                <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                    <Typography variant="body1" gutterBottom>
                        {getStatusMessage()}
                    </Typography>
                </Alert>

                <Box sx={{ mb: 3, textAlign: 'left' }}>
                    <Typography variant="h6" gutterBottom>
                        How to fix this:
                    </Typography>
                    <Box component="ol" sx={{ pl: 2 }}>
                        {getInstructions().map((instruction, index) => (
                            <Typography 
                                key={index} 
                                component="li" 
                                variant="body2" 
                                sx={{ mb: 1 }}
                            >
                                {instruction}
                            </Typography>
                        ))}
                    </Box>
                </Box>

                <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ mt: 2, display: 'block' }}
                >
                    The test cannot continue without camera access for proctoring purposes.
                </Typography>
            </Paper>
        </Box>
    );
};

export default CameraPermissionWarning;
