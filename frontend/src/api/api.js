import axios from 'axios';
import { API_BASE_URL } from '../config';
import { collectDeviceInfoSync, collectDeviceInfo } from '../utils/deviceInfoCollector';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase timeout for slow connections
  timeout: 30000,
  // Enable withCredentials for CORS
  withCredentials: true
});

// Add request interceptor for debugging
api.interceptors.request.use(
  config => {
    // Remove CORS headers - they should be set by the server
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data || config.params);
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Generic API error handler
const handleApiError = (error, customMessage) => {
  const errorMessage = customMessage || 'An error occurred with the API request';
  
  if (error.response) {
    // The request was made and the server responded with an error status code
    console.error(`${errorMessage}: ${error.response.status}`, error.response.data);
    return {
      error: true,
      status: error.response.status,
      message: error.response.data?.message || error.response.data?.error?.message || 'Server error',
      data: error.response.data
    };
  } else if (error.request) {
    // The request was made but no response was received
    console.error(`${errorMessage}: No response from server`, error.request);
    return {
      error: true,
      status: 0,
      message: 'No response from server. Please check your connection.',
      data: null
    };
  } else {
    // Something happened in setting up the request
    console.error(`${errorMessage}: Request setup error`, error.message);
    return {
      error: true,
      status: 0,
      message: error.message || 'Request setup error',
      data: null
    };
  }
};

// Health check
const fetchHealthCheck = async () => {
  try {
    const response = await api.get('/api/health-check');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Health check failed');
  }
};

// Face Verification APIs
const uploadIdPhoto = async (userId, photoBlob) => {
  try {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('photo', photoBlob, 'id_photo.jpg');
    
    const response = await api.post('/api/auth/upload-id-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to upload ID photo');
  }
};

const verifyFace = async (userId, photoBlob) => {
  try {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('photo', photoBlob, 'verification_photo.jpg');
    
    const response = await api.post('/api/auth/verify-face', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Face verification failed');
  }
};

const getVerificationStatus = async (userId) => {
  try {
    const response = await api.get(`/api/auth/verification-status/${userId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get verification status');
  }
};

// Test Management APIs
const createTest = async (testData) => {
  try {
    console.log('Creating test with data:', testData);
    const response = await api.post('/api/tests/create', testData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to create test');
  }
};

const getAllTests = async (skip = 0, limit = 20) => {
  try {
    console.log(`Fetching all tests with skip=${skip} and limit=${limit}`);
    const response = await api.get(`/api/tests/all?skip=${skip}&limit=${limit}`);
    
    // If the response is not an array, wrap it in an array to prevent map errors
    if (response.data && !Array.isArray(response.data)) {
      console.warn('Response data is not an array, converting to array format');
      return [response.data];
    }
    
    return response.data;
  } catch (error) {
    console.error('Failed to get tests:', error);
    
    // Return an empty array instead of throwing an error
    // This prevents the UI from breaking when API calls fail
    return [];
  }
};

const getTestById = async (testId) => {
  try {
    console.log(`Fetching test with ID: ${testId}`);
    const response = await api.get(`/api/tests/${testId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching test with ID ${testId}:`, error);
    return handleApiError(error, 'Failed to get test');
  }
};

const updateTest = async (testId, testData) => {
  try {
    const response = await api.put(`/api/tests/${testId}`, testData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to update test');
  }
};

const deleteTest = async (testId) => {
  try {
    const response = await api.delete(`/api/tests/${testId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete test');
  }
};

const deleteAllTests = async () => {
  try {
    const response = await api.delete(`/api/tests/`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete all tests');
  }
};

const generateQuestions = async (testData) => {
  try {
    console.log('Generating questions with data:', testData);
    
    // Ensure we have the required fields in the expected format
    const requestData = {
      skill: testData.skill || 'General Knowledge',
      num_questions: testData.num_questions || 5,
      duration: testData.duration || 30,
      test_id: testData.test_id || null  // This can be null, the backend will generate one
    };
    
    console.log('Sending request to generate questions:', requestData);
    
    // Use the correct endpoint from test_route.py which uses AI to generate questions
    const response = await api.post('/api/tests/generate', requestData);
    return response.data;
  } catch (error) {
    console.error('Error generating questions:', error);
    return handleApiError(error, 'Failed to generate questions');
  }
};

// Test Session APIs
const startTestSession = async (sessionData) => {
  try {
    console.log('Starting test session with data:', sessionData);
    const response = await api.post('/api/sessions/start', sessionData);
    return response.data;
  } catch (error) {
    console.error('Error starting test session:', error);
    return handleApiError(error, 'Failed to start test session');
  }
};

const submitTest = async (sessionId, answers, endTime) => {
  try {
    console.log('Submitting test with sessionId:', sessionId);
    console.log('Answers to submit:', JSON.stringify(answers));
    console.log('End time:', endTime);
    
    // Validate input data
    if (!sessionId) {
      console.error('Missing sessionId in submitTest');
      return { error: true, message: 'Session ID is required' };
    }
    
    if (!Array.isArray(answers)) {
      console.error('Invalid answers format in submitTest:', answers);
      // Convert to empty array instead of failing
      answers = [];
      console.log('Using empty answers array as fallback');
    }
    
    if (!endTime) {
      console.error('Missing endTime in submitTest');
      // Use current time as fallback
      endTime = new Date().toISOString();
      console.log('Using current time as fallback:', endTime);
    }
    
    const submitData = {
      session_id: sessionId,
      answers: answers,
      end_time: endTime
    };
    
    console.log('Submitting data to API:', JSON.stringify(submitData));
    
    // Implement retry logic with multiple endpoints
    const endpoints = [
      '/api/sessions/submit',
      `/api/sessions/${sessionId}/submit`
    ];
    
    let lastError = null;
    
    // Try each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting submission to endpoint: ${endpoint}`);
        const response = await api.post(endpoint, submitData, {
          timeout: 10000 // 10 second timeout
        });
        console.log('Submission successful:', response.data);
        return response.data;
      } catch (error) {
        console.warn(`Submission to ${endpoint} failed:`, error.message);
        lastError = error;
        // Continue to the next endpoint
      }
    }
    
    // If direct submission failed, try to update the session status as a fallback
    try {
      console.log('All submission endpoints failed, trying session termination as fallback');
      const response = await api.post(`/api/sessions/${sessionId}/terminate`);
      console.log('Session terminated:', response.data);
      
      // Update with score information if we have it
      if (response.data) {
        // Calculate basic score information
        const correctAnswers = answers.filter(a => a.is_correct).length;
        const totalQuestions = answers.length;
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        
        // Add score information to the response
        response.data.score = correctAnswers;
        response.data.total_questions = totalQuestions;
        response.data.percentage = percentage;
        
        return response.data;
      }
    } catch (terminateError) {
      console.error('Termination fallback also failed:', terminateError.message);
    }
    
    // If all attempts failed, construct a basic error response
    throw lastError || new Error('All submission methods failed');
  } catch (error) {
    console.error('Error submitting test:', error);
    console.error('Error details:', error.response?.data || error.message);
    
    // Return a standardized error object
    return { 
      error: true, 
      message: 'Failed to submit test: ' + (error.response?.data?.detail || error.message),
      status: error.response?.status,
      original_error: error.message
    };
  }
};

const getUserSessions = async (userId) => {
  try {
    const response = await api.get(`/api/sessions/user/${userId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get user sessions');
  }
};

const getSessionById = async (sessionId) => {
  try {
    const response = await api.get(`/api/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get session');
  }
};

const getTestSessions = async (testId) => {
  try {
    const response = await api.get(`/api/sessions/test/${testId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get test sessions');
  }
};

const terminateSession = async (sessionId) => {
  try {
    const response = await api.post(`/api/sessions/${sessionId}/terminate`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to terminate session');
  }
};

// Proctoring APIs
const recordViolation = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/violation', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to record violation');
  }
};

const saveScreenCapture = async (sessionId, imageBlob) => {
  try {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('image_file', imageBlob, 'screen_capture.jpg');
    
    const response = await api.post('/api/proctoring/screen-capture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to save screen capture');
  }
};

const recordBehavioralAnomaly = async (anomalyData) => {
  try {
    const response = await api.post('/api/proctoring/behavioral-anomaly', anomalyData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to record behavioral anomaly');
  }
};

const getProctoringData = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/session/${sessionId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get proctoring data');
  }
};

// Analytics APIs
const getUserAnalytics = async (userId) => {
  try {
    const response = await api.get(`/api/analytics/user/${userId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get user analytics');
  }
};

const getTestAnalytics = async (testId) => {
  try {
    const response = await api.get(`/api/analytics/test/${testId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get test analytics');
  }
};

const getViolationStatistics = async () => {
  try {
    const response = await api.get('/api/analytics/violations');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get violation statistics');
  }
};

const getPerformanceStatistics = async (period = 'week') => {
  try {
    const response = await api.get(`/api/analytics/performance?period=${period}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get performance statistics');
  }
};

// Authentication APIs
const registerUser = async (userData) => {
  try {
    const response = await api.post('/api/users/register', userData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to register user');
  }
};

const loginUser = async (email) => {
  try {
    const response = await api.post('/api/users/login', { email });
    
    // Store auth token and user data in localStorage for persistence
    if (response.data && response.data.access_token) {
      localStorage.setItem('auth_token', response.data.access_token);
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to login');
  }
};

const logoutUser = () => {
  // Remove auth data from localStorage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  return { success: true };
};

const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Python Screenshot Service APIs
export const startScreenshotService = async ({ session_id, test_id }) => {
  if (!session_id) {
    throw new Error('Missing required parameters: session_id is required');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/api/proctoring/screenshots/start`, {
      session_id,
      test_id: test_id || session_id  // Pass test_id if provided, otherwise use session_id
    });
    return response.data;
  } catch (error) {
    console.error('Error starting screenshot service:', error);
    throw error;
  }
};

const stopScreenshotService = async () => {
  try {
    console.log('Stopping screenshot service');
    const response = await api.post('/api/proctoring/screenshots/stop');
    console.log('Screenshot service stop response:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error stopping screenshot service: ${error.message}`);
    console.error('Status code:', error.response?.status);
    console.error('Error response:', error.response?.data);
    
    // If it's a 405 Method Not Allowed error, suggest checking endpoint configuration
    if (error.response?.status === 405) {
      return { 
        error: true, 
        message: 'Method Not Allowed - Check API endpoint configuration',
        details: error.response?.data 
      };
    }
    
    return handleApiError(error, 'Failed to stop screenshot service');
  }
};

export const getTestResults = async (sessionId) => {
  try {
    console.log(`Fetching test results for session: ${sessionId}`);
    const response = await api.get(`/api/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching test results:', error);
    return handleApiError(error, 'Failed to fetch test results');
  }
};

const deleteSession = async (sessionId) => {
  try {
    const response = await api.delete(`/api/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete session');
  }
};

const deleteAllSessions = async () => {
  try {
    const response = await api.delete(`/api/sessions/`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete all sessions');
  }
};

const deleteSessionsByTest = async (testId) => {
  try {
    const response = await api.delete(`/api/sessions/test/${testId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete sessions for test');
  }
};

// Enhanced Violation Logging APIs






const getSessionViolationsSummary = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/violations/session/${sessionId}/summary`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get session violations summary');
  }
};

const testViolationLogging = async () => {
  try {
    const response = await api.post('/api/proctoring/violations/test');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to test violation logging');
  }
};

// Proctor Permission Logging APIs
const logProctorPermission = async (sessionId, permissionType, granted, deviceInfo = null, errorMessage = null) => {
  try {
    // If no device info provided, collect it automatically with location
    if (!deviceInfo) {
      deviceInfo = await collectDeviceInfo(true);
    }
    
    const response = await api.post('/api/proctoring/permissions/log', {
      examSessionId: sessionId,
      permissionType: permissionType,
      granted: granted,
      deviceInfo: JSON.stringify(deviceInfo),
      errorMessage: errorMessage
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log proctor permission');
  }
};

const getSessionPermissions = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/permissions/${sessionId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get session permissions');
  }
};

const logCameraPermission = async (sessionId, granted, errorMessage = null) => {
  const deviceInfo = await collectDeviceInfo(true);
  return logProctorPermission(sessionId, 'camera', granted, deviceInfo, errorMessage);
};

const logMicrophonePermission = async (sessionId, granted, errorMessage = null) => {
  const deviceInfo = await collectDeviceInfo(true);
  return logProctorPermission(sessionId, 'microphone', granted, deviceInfo, errorMessage);
};

// Modular Camera Permission APIs
const logCameraPermissionViolationModular = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/camera-permission/violation', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log camera permission violation');
  }
};

const logCameraPermissionGrantModular = async (sessionId, deviceInfo = null) => {
  try {
    const response = await api.post('/api/proctoring/camera-permission/grant', {
      session_id: sessionId,
      device_info: deviceInfo || navigator.userAgent
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log camera permission grant');
  }
};

const getCameraPermissionStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/camera-permission/session/${sessionId}/status`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get camera permission status');
  }
};

// Modular Microphone Permission APIs
const logMicrophonePermissionViolationModular = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/microphone-permission/violation', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log microphone permission violation');
  }
};

const logMicrophonePermissionGrantModular = async (sessionId, deviceInfo = null) => {
  try {
    const response = await api.post('/api/proctoring/microphone-permission/grant', {
      session_id: sessionId,
      device_info: deviceInfo || navigator.userAgent
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log microphone permission grant');
  }
};

const getMicrophonePermissionStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/microphone-permission/session/${sessionId}/status`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get microphone permission status');
  }
};

// Modular Face Detection APIs
const detectFaces = async (detectionData) => {
  try {
    const response = await api.post('/api/proctoring/face-detection/detect', detectionData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to detect faces');
  }
};

const logMultipleFacesViolationModular = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/face-detection/violation/multiple-faces', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log multiple faces violation');
  }
};

const getFaceDetectionSummary = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/face-detection/session/${sessionId}/summary`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get face detection summary');
  }
};

// Modular Browser Compatibility APIs
const checkBrowserCompatibility = async (compatibilityData) => {
  try {
    const response = await api.post('/api/proctoring/browser-compatibility/check', compatibilityData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to check browser compatibility');
  }
};

const logBrowserCompatibilityViolationModular = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/browser-compatibility/violation', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log browser compatibility violation');
  }
};

const getBrowserCompatibilityStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/browser-compatibility/session/${sessionId}/status`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get browser compatibility status');
  }
};

const getSupportedBrowsers = async () => {
  try {
    const response = await api.get('/api/proctoring/browser-compatibility/supported-browsers');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get supported browsers');
  }
};

// Modular Tab Switching APIs
const logTabSwitchingViolation = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/tab-switching/violation', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log tab switching violation');
  }
};

const getTabSwitchingStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/tab-switching/session/${sessionId}/status`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get tab switching status');
  }
};

const getTabSwitchingViolations = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/tab-switching/session/${sessionId}/violations`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get tab switching violations');
  }
};

const getTabSwitchingSummary = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/tab-switching/session/${sessionId}/summary`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get tab switching summary');
  }
};

// Modular Window Blur APIs
const logWindowBlurViolation = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/window-blur/violation', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log window blur violation');
  }
};

const getWindowBlurStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/window-blur/session/${sessionId}/status`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get window blur status');
  }
};

const getWindowBlurViolations = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/window-blur/session/${sessionId}/violations`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get window blur violations');
  }
};

const getWindowBlurSummary = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/window-blur/session/${sessionId}/summary`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get window blur summary');
  }
};

// Modular Fullscreen Enforcement APIs
const logFullscreenExitViolation = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/fullscreen-enforcement/violation', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log fullscreen exit violation');
  }
};

const getFullscreenStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/fullscreen-enforcement/session/${sessionId}/status`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get fullscreen status');
  }
};

const getFullscreenViolations = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/fullscreen-enforcement/session/${sessionId}/violations`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get fullscreen violations');
  }
};

const getFullscreenSummary = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/fullscreen-enforcement/session/${sessionId}/summary`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get fullscreen summary');
  }
};

// Modular Keyboard Shortcuts APIs
const logKeyboardShortcutViolation = async (violationData) => {
  try {
    const response = await api.post('/api/proctoring/keyboard-shortcuts/violation', violationData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to log keyboard shortcut violation');
  }
};

const getKeyboardShortcutsStatus = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/keyboard-shortcuts/session/${sessionId}/status`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get keyboard shortcuts status');
  }
};

const getKeyboardShortcutsViolations = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/keyboard-shortcuts/session/${sessionId}/violations`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get keyboard shortcuts violations');
  }
};

const getKeyboardShortcutsSummary = async (sessionId) => {
  try {
    const response = await api.get(`/api/proctoring/keyboard-shortcuts/session/${sessionId}/summary`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get keyboard shortcuts summary');
  }
};

const getRestrictedShortcuts = async () => {
  try {
    const response = await api.get('/api/proctoring/keyboard-shortcuts/restricted-shortcuts');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get restricted shortcuts');
  }
};

// Keyboard Shortcuts Control API
export const keyboardShortcutsAPI = {
    logViolation: (data) => api.post('/api/proctoring/keyboard-shortcuts/violation', data),
    getSessionViolations: (sessionId) => api.get(`/api/proctoring/keyboard-shortcuts/session/${sessionId}/violations`),
    getStatus: (sessionId) => api.get(`/api/proctoring/keyboard-shortcuts/session/${sessionId}/status`),
    getSummary: (sessionId) => api.get(`/api/proctoring/keyboard-shortcuts/session/${sessionId}/summary`),
    getBlockedShortcuts: () => api.get('/api/proctoring/keyboard-shortcuts/blocked-shortcuts')
};

// Lighting Analysis API
export const lightingAnalysisAPI = {
    logViolation: (data) => api.post('/api/proctoring/lighting-analysis/violation', data),
    getSessionViolations: (sessionId) => api.get(`/api/proctoring/lighting-analysis/session/${sessionId}/violations`),
    getStatus: (sessionId) => api.get(`/api/proctoring/lighting-analysis/session/${sessionId}/status`),
    getSummary: (sessionId) => api.get(`/api/proctoring/lighting-analysis/session/${sessionId}/summary`),
    analyzeLighting: (brightnessLevel, previousBrightness) => api.post('/api/proctoring/lighting-analysis/analyze', {
        brightness_level: brightnessLevel,
        previous_brightness: previousBrightness
    })
};

// Gaze Tracking API
export const gazeTrackingAPI = {
    logViolation: (data) => api.post('/api/proctoring/gaze-tracking/violation', data),
    getSessionViolations: (sessionId) => api.get(`/api/proctoring/gaze-tracking/session/${sessionId}/violations`),
    getStatus: (sessionId) => api.get(`/api/proctoring/gaze-tracking/session/${sessionId}/status`),
    getSummary: (sessionId) => api.get(`/api/proctoring/gaze-tracking/session/${sessionId}/summary`),
    analyzeGaze: (confidenceLevel, gazeData) => api.post('/api/proctoring/gaze-tracking/analyze', {
        confidence_level: confidenceLevel,
        gaze_data: gazeData
    })
};

// Audio Monitoring API
export const audioMonitoringAPI = {
    logViolation: (data) => api.post('/api/proctoring/audio-monitoring/violation', data),
    getSessionViolations: (sessionId) => api.get(`/api/proctoring/audio-monitoring/session/${sessionId}/violations`),
    getStatus: (sessionId) => api.get(`/api/proctoring/audio-monitoring/session/${sessionId}/status`),
    getSummary: (sessionId) => api.get(`/api/proctoring/audio-monitoring/session/${sessionId}/summary`),
    analyzeAudio: (audioLevel, confidenceLevel, audioData) => api.post('/api/proctoring/audio-monitoring/analyze', {
        audio_level: audioLevel,
        confidence_level: confidenceLevel,
        audio_data: audioData
    })
};

// Permission Logging API
export const permissionLoggingAPI = {
    logPermission: (data) => api.post('/api/proctoring/permission-logging/log', data),
    getSessionPermissions: (sessionId) => api.get(`/api/proctoring/permission-logging/session/${sessionId}/permissions`),
    getStatus: (sessionId) => api.get(`/api/proctoring/permission-logging/session/${sessionId}/status`),
    getSummary: (sessionId) => api.get(`/api/proctoring/permission-logging/session/${sessionId}/summary`),
    getValidPermissionTypes: () => api.get('/api/proctoring/permission-logging/valid-permission-types')
};

export {
  fetchHealthCheck,
  uploadIdPhoto,
  verifyFace,
  getVerificationStatus,
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
  deleteAllTests,
  generateQuestions,
  startTestSession,
  submitTest,
  getUserSessions,
  getSessionById,
  getTestSessions,
  terminateSession,
  recordViolation,
  saveScreenCapture,
  recordBehavioralAnomaly,
  getProctoringData,
  getUserAnalytics,
  getTestAnalytics,
  getViolationStatistics,
  getPerformanceStatistics,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  stopScreenshotService,
  deleteSession,
  deleteAllSessions,
  deleteSessionsByTest,
  // Enhanced violation logging (removed old non-modular functions)
  getSessionViolationsSummary,
  testViolationLogging,
  // Proctor permission logging
  logProctorPermission,
  getSessionPermissions,
  logCameraPermission,
  logMicrophonePermission,
  // Modular feature APIs
  logCameraPermissionViolationModular,
  logCameraPermissionGrantModular,
  getCameraPermissionStatus,
  logMicrophonePermissionViolationModular,
  logMicrophonePermissionGrantModular,
  getMicrophonePermissionStatus,
  detectFaces,
  logMultipleFacesViolationModular,
  getFaceDetectionSummary,
  checkBrowserCompatibility,
  logBrowserCompatibilityViolationModular,
  getBrowserCompatibilityStatus,
  getSupportedBrowsers,
  logTabSwitchingViolation,
  getTabSwitchingStatus,
  getTabSwitchingViolations,
  getTabSwitchingSummary,
  logWindowBlurViolation,
  getWindowBlurStatus,
  getWindowBlurViolations,
  getWindowBlurSummary,
  logFullscreenExitViolation,
  getFullscreenStatus,
  getFullscreenViolations,
  getFullscreenSummary,
  logKeyboardShortcutViolation,
  getKeyboardShortcutsStatus,
  getKeyboardShortcutsViolations,
  getKeyboardShortcutsSummary,
  getRestrictedShortcuts
};

export default api;