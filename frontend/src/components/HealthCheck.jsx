import React, { useEffect, useState } from 'react';
import { fetchHealthCheck } from '../api/api';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';

const HealthCheck = () => {
  const [apiStatus, setApiStatus] = useState('checking');
  const [retries, setRetries] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetchHealthCheck();
        
        if (response.error) {
          console.error('API health check failed:', response.message);
          if (retries < MAX_RETRIES) {
            setApiStatus('retrying');
            setRetries(prev => prev + 1);
            // Retry after 2 seconds
            setTimeout(checkApiHealth, 2000);
          } else {
            setApiStatus('error');
          }
        } else if (response.status === 'ok') {
          console.log('API health check successful');
          setApiStatus('connected');
        } else {
          setApiStatus('error');
        }
      } catch (error) {
        console.error('API health check error:', error);
        if (retries < MAX_RETRIES) {
          setApiStatus('retrying');
          setRetries(prev => prev + 1);
          // Retry after 2 seconds
          setTimeout(checkApiHealth, 2000);
        } else {
          setApiStatus('error');
        }
      }
    };

    checkApiHealth();
  }, [retries]);

  if (apiStatus === 'checking' || apiStatus === 'retrying') {
    return (
      <Box sx={{ 
        position: 'fixed', 
        bottom: 16, 
        right: 16, 
        display: 'flex', 
        alignItems: 'center',
        padding: 1,
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
        zIndex: 1000
      }}>
        <CircularProgress size={20} sx={{ mr: 1 }} />
        <Typography variant="body2">
          {apiStatus === 'checking' ? 'Checking API connection...' : `Retrying (${retries}/${MAX_RETRIES})...`}
        </Typography>
      </Box>
    );
  }

  if (apiStatus === 'error') {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16,
          zIndex: 1000,
          boxShadow: 2
        }}
      >
        Cannot connect to the backend API. Please ensure the server is running.
      </Alert>
    );
  }

  // When connected, no need to show anything
  return null;
};

export default HealthCheck; 