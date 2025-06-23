import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FaceAuth from './FaceAuth';
import { FaMicrophone, FaMicrophoneSlash, FaCamera } from 'react-icons/fa';
import { Box, Typography, LinearProgress, Button } from '@mui/material';
import { useEnhancedViolationLogger } from '../hooks/useEnhancedViolationLogger';

const PrerequisitesCheck = ({ onComplete }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState('system');
    const [systemChecks, setSystemChecks] = useState({
        camera: false,
        microphone: false,
        browser: false
    });
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    // Extract session data from location state
    const sessionData = location.state || {};
    
    // Initialize violation logger
    const violationLogger = useEnhancedViolationLogger(sessionData.sessionId);

    useEffect(() => {
        // Start violation logging if we have a session ID
        if (sessionData.sessionId) {
            violationLogger.startLogging();
        }
        return () => {
            violationLogger.stopLogging();
        };
    }, [sessionData.sessionId]);

    // Detect browser compatibility and log violation if needed
    const getBrowserInfo = () => {
        const userAgent = navigator.userAgent;
        let browserName = 'Unknown';
        let browserVersion = 'Unknown';
        
        if (userAgent.includes('Chrome')) {
            browserName = 'Chrome';
            const match = userAgent.match(/Chrome\/(\d+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Firefox')) {
            browserName = 'Firefox';
            const match = userAgent.match(/Firefox\/(\d+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browserName = 'Safari';
            const match = userAgent.match(/Version\/(\d+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (userAgent.includes('Edge')) {
            browserName = 'Edge';
            const match = userAgent.match(/Edge\/(\d+)/);
            browserVersion = match ? match[1] : 'Unknown';
        }
        
        return {
            name: browserName,
            version: browserVersion,
            userAgent: userAgent
        };
    };

    useEffect(() => {
        checkSystemRequirements();
        
        // Log the session data for debugging
        console.log('Prerequisites check session data:', sessionData);
        
        // Validate session data - no localStorage usage needed
        if (!sessionData.sessionId || !sessionData.testId) {
            console.error('Missing session data in prerequisites check');
            setError('Missing test session data. Please try registering again.');
        } else {
            console.log('Session data validated successfully');
        }
    }, [sessionData]);

    // Watch for system checks completion and move to face authentication
    useEffect(() => {
        const allChecksPassed = systemChecks.camera && systemChecks.microphone && systemChecks.browser;
        if (allChecksPassed && currentStep === 'system') {
            setTimeout(() => {
                setCurrentStep('face');
            }, 2000);
        }
    }, [systemChecks, currentStep]);

    const checkSystemRequirements = async () => {
        setIsChecking(true);
        setError('');
        
        try {
            // Get browser information
            const browserInfo = getBrowserInfo();
            
            // Check browser compatibility first
            const isModernBrowser = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
            const supportedBrowsers = ['Chrome', 'Firefox', 'Edge'];
            const isSupportedBrowser = supportedBrowsers.includes(browserInfo.name);
            
            setSystemChecks(prev => ({ ...prev, browser: isModernBrowser && isSupportedBrowser }));

            // Log browser compatibility violation if needed
            if (!isModernBrowser || !isSupportedBrowser) {
                await violationLogger.logBrowserCompatibility(browserInfo);
                setError('Your browser does not support the required features. Please use a modern browser like Chrome, Firefox, or Edge.');
                setIsChecking(false);
                return;
            }

            // Check camera
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                cameraStream.getTracks().forEach(track => track.stop());
                setSystemChecks(prev => ({ ...prev, camera: true }));
            } catch (cameraErr) {
                console.log('Camera permission not granted:', cameraErr.message);
                setSystemChecks(prev => ({ ...prev, camera: false }));
                // Log camera permission violation
                await violationLogger.logCameraPermission(cameraErr.message);
            }

            // Check microphone
            try {
                const microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                microphoneStream.getTracks().forEach(track => track.stop());
                setSystemChecks(prev => ({ ...prev, microphone: true }));
            } catch (microphoneErr) {
                console.log('Microphone permission not granted:', microphoneErr.message);
                setSystemChecks(prev => ({ ...prev, microphone: false }));
                // Log microphone permission violation
                await violationLogger.logMicrophonePermission(microphoneErr.message);
            }
        } catch (err) {
            console.error('System check error:', err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsChecking(false);
        }
    };

    const retryPermissions = async () => {
        // Reset checks and try again
        setSystemChecks({
            camera: false,
            microphone: false,
            browser: systemChecks.browser // Keep browser check
        });
        await checkSystemRequirements();
    };

    const handleFaceAuthSuccess = () => {
        // Navigate to test instructions with session data
        if (sessionData.testId) {
            navigate(`/test-instructions/${sessionData.testId}`, { 
                state: sessionData 
            });
        } else if (sessionData.sessionId) {
            // If we have session ID but no test ID, try to get test info from session
            navigate(`/test-instructions/${sessionData.sessionId}`, { 
                state: sessionData 
            });
        } else {
            // Fallback if no IDs are available
            navigate('/test-interface', { state: sessionData });
        }
    };

    // Only show error for missing session data, not for permission issues
    if (error && (!sessionData.sessionId || !sessionData.testId)) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">System Check Failed</h2>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/test-registration')}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
                    >
                        Back to Registration
                    </button>
                </div>
            </div>
        );
    }

    if (currentStep === 'system') {
        const allChecksPassed = Object.values(systemChecks).every(check => check);
        const hasPermissionIssues = systemChecks.browser && (!systemChecks.camera || !systemChecks.microphone);

        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                    <h2 className="text-2xl font-bold mb-4">System Requirements Check</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.camera ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="flex items-center">
                                <FaCamera className={`mr-2 ${systemChecks.camera ? 'text-green-500' : 'text-gray-400'}`} />
                                Camera Access
                            </span>
                        </div>
                        
                        <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.microphone ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="flex items-center">
                                {systemChecks.microphone ? <FaMicrophone className="mr-2 text-green-500" /> : <FaMicrophoneSlash className="mr-2 text-gray-400" />}
                                Microphone Access
                            </span>
                        </div>
                        
                        <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.browser ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span>Browser Compatibility</span>
                        </div>
                    </div>

                    {isChecking && (
                        <div className="mt-4 text-center text-blue-600">
                            Checking permissions...
                        </div>
                    )}

                    {allChecksPassed && (
                        <div className="mt-6 text-center text-green-600">
                            All system checks passed! Proceeding to face authentication...
                        </div>
                    )}

                    {hasPermissionIssues && !isChecking && (
                        <div className="mt-6 space-y-3">
                            <div className="text-center text-orange-600">
                                <p className="mb-2">Camera and microphone permissions are required for the test.</p>
                                <p className="text-sm text-gray-600">Click the button below to request permissions from your browser.</p>
                            </div>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                onClick={retryPermissions}
                                disabled={isChecking}
                            >
                                {isChecking ? 'Requesting Permissions...' : 'Grant Permissions'}
                            </Button>
                        </div>
                    )}

                    {!systemChecks.browser && !isChecking && (
                        <div className="mt-6 text-center text-red-600">
                            <p>Your browser does not support the required features.</p>
                            <p className="text-sm mt-2">Please use a modern browser like Chrome, Firefox, or Edge.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 4 }}>
            <FaceAuth onSuccess={handleFaceAuthSuccess} />
        </Box>
    );
};

export default PrerequisitesCheck; 