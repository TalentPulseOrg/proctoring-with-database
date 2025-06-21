import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, Box, Typography, Button, Paper, 
  Stepper, Step, StepLabel, CircularProgress, Alert
} from '@mui/material';
import FaceVerification from '../components/FaceVerification';

const TestSession = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [testData, setTestData] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  
  // Get user information from localStorage
  const userId = parseInt(localStorage.getItem('userId') || '1');
  
  const steps = ['Face Verification', 'Test Rules', 'Start Test'];

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/tests/${testId}`);
        setTestData(response.data);
        
        // Check if user is already verified
        const verificationResponse = await axios.get(`/api/auth/verification-status/${userId}`);
        setIsVerified(verificationResponse.data.is_verified || false);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load test data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchTestData();
  }, [testId, userId]);

  const handleVerificationComplete = (success) => {
    setIsVerified(success);
    if (success) {
      setActiveStep(1);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const startTest = async () => {
    try {
      setLoading(true);
      
      // Create test session
      const response = await axios.post('/api/sessions/start', {
        test_id: testId,
        user_id: userId
      });
      
      setSessionId(response.data.id);
      setLoading(false);
      
      // Navigate to test interface with session ID
      navigate(`/test-interface/${response.data.id}`);
    } catch (err) {
      setError('Failed to start test. Please try again.');
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <FaceVerification userId={userId} onVerificationComplete={handleVerificationComplete} />;
      case 1:
        return (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Test Rules</Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" sx={{ mb: 1 }}>You must keep your face visible during the entire test.</Typography>
              <Typography component="li" sx={{ mb: 1 }}>Do not navigate away from the test window or open other applications.</Typography>
              <Typography component="li" sx={{ mb: 1 }}>You will have {testData?.duration} minutes to complete {testData?.num_questions} questions.</Typography>
              <Typography component="li" sx={{ mb: 1 }}>Once you start the test, the timer cannot be paused.</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button variant="contained" onClick={handleNext}>
                I understand and agree
              </Button>
            </Box>
          </Paper>
        );
      case 2:
        return (
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>Ready to Begin</Typography>
            <Typography variant="body1" paragraph>
              You are about to start the {testData?.skill} test.
            </Typography>
            <Typography variant="body1" paragraph>
              You will have {testData?.duration} minutes to complete {testData?.num_questions} questions.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                onClick={startTest}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Start Test Now'}
              </Button>
            </Box>
          </Paper>
        );
      default:
        return 'Unknown step';
    }
  };

  if (loading && !testData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        {testData?.skill} Test
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box sx={{ mt: 2 }}>
        {getStepContent(activeStep)}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        
        {activeStep < steps.length - 1 && activeStep !== 0 && (
          <Button
            variant="contained"
            onClick={handleNext}
          >
            Next
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default TestSession; 