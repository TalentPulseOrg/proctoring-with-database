import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getTestById } from '../api/api';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { FaMicrophone } from 'react-icons/fa';
import useCameraPermissionMonitor from '../hooks/useCameraPermissionMonitor';
import CameraPermissionWarning from './CameraPermissionWarning';
import useMicrophonePermissionMonitor from '../hooks/useMicrophonePermissionMonitor';
import MicrophonePermissionWarning from './MicrophonePermissionWarning';

const TestInstructions = ({ onStartTest }) => {
  const [testDetails, setTestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const { testId } = useParams();
  const navigate = useNavigate();

  // Get session ID from location state
  const sessionId = location.state?.sessionId;

  // Monitor camera permission during instructions phase
  const { 
    hasCameraPermission, 
    cameraStatus, 
    recheckPermission 
  } = useCameraPermissionMonitor(sessionId, true, false); // Disable permission logging during instructions

  // Monitor microphone permission during instructions phase
  const { 
    hasMicrophonePermission, 
    microphoneStatus, 
    recheckPermission: recheckMicrophonePermission 
  } = useMicrophonePermissionMonitor(sessionId, true, false); // Disable permission logging during instructions

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        setLoading(true);
        
        // Get testId from URL params or location state (no localStorage)
        const currentTestId = testId || 
                             (location.state && location.state.testId);
        
        if (!currentTestId) {
          setError('No test ID found. Please go back to registration.');
          setLoading(false);
          return;
        }
        
        // Fetch test details from the backend
        const response = await getTestById(currentTestId);
        
        if (response.error) {
          throw new Error(response.message || 'Failed to fetch test details');
        }
        
        // Store test details
        setTestDetails({
          testId: response.test_id,
          skill: response.skill,
          numQuestions: response.num_questions,
          duration: response.duration
        });
      } catch (err) {
        console.error('Error fetching test details:', err);
        setError('Failed to load test details: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTestDetails();
  }, [testId, location]);

  const handleStartTest = () => {
    if (testDetails && onStartTest) {
      onStartTest(testDetails);
    } else {
      // Get sessionId from location state if available
      const sessionId = location.state?.sessionId;
      
      // If no callback is provided, navigate to test interface with details
      // Pass both testId and sessionId if available
      navigate(`/test-interface/${sessionId || testDetails.testId}`, { 
        state: { 
          ...testDetails,
          testId: testDetails.testId,
          sessionId: sessionId // Pass sessionId to avoid creating duplicate sessions
        } 
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate('/test-registration')}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Registration
        </button>
      </div>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>
      {/* Camera Permission Warning */}
      <CameraPermissionWarning
        isVisible={!hasCameraPermission && cameraStatus === 'denied'}
        onRetryPermission={recheckPermission}
        cameraStatus={cameraStatus}
        isLoading={false}
      />

      {/* Microphone Permission Warning */}
      <MicrophonePermissionWarning
        isVisible={!hasMicrophonePermission && microphoneStatus === 'denied' && hasCameraPermission}
        onRetryPermission={recheckMicrophonePermission}
        microphoneStatus={microphoneStatus}
        isLoading={false}
      />

      <h1 className="text-2xl font-bold mb-6">Test Instructions</h1>
      
      {testDetails && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Test Details</h2>
            <p><strong>Skill:</strong> {testDetails.skill}</p>
            <p><strong>Number of Questions:</strong> {testDetails.numQuestions}</p>
            <p><strong>Duration:</strong> {testDetails.duration} minutes</p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Important Guidelines</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must remain in fullscreen mode throughout the test.</li>
              <li>Ensure good lighting and a clear view of your face.</li>
              <li>Ensure no one else is present in the room.</li>
              <li>After 3 violations, your test will be terminated.</li>
            </ul>
          </div>
          
          <button
            onClick={handleStartTest}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Test
          </button>
        </>
      )}
    </Box>
  );
};

export default TestInstructions; 