import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FaceAuth from './FaceAuth';
import { Toast, ToastContainer } from './Toast';
import { FaMicrophone, FaMicrophoneSlash, FaCamera, FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Box, Typography, LinearProgress, Button, Alert, AlertTitle } from '@mui/material';
import { useEnhancedViolationLogger } from '../hooks/useEnhancedViolationLogger';
import { getBrowserCompatibilityReport, getBrowserCompatibilityMessage } from '../utils/browserDetection';
import { logCameraPermission, logMicrophonePermission } from '../api/api';
import AppLayout from '../layouts/AppLayout';

const PrerequisitesCheck = ({ onComplete }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState('system');
    const [systemChecks, setSystemChecks] = useState({
        camera: false,
        microphone: false,
        browser: false
    });
    const [error, setError] = useState('');    const [isChecking, setIsChecking] = useState(false);
    const [browserCompatibility, setBrowserCompatibility] = useState(null);
    const [browserMessage, setBrowserMessage] = useState(null);
    const [toasts, setToasts] = useState([]);
    
    // Flag to track if permissions have been logged to prevent duplicates
    const permissionsLogged = useRef({
        camera: false,
        microphone: false
    });

    // Extract session data from location state
    const sessionData = location.state || {};
      // Initialize violation logger
    const violationLogger = useEnhancedViolationLogger(sessionData.sessionId);

    // Toast management functions
    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            removeToast(id);
        }, 5000); // Auto-remove after 5 seconds
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    useEffect(() => {
        // Start violation logging if we have a session ID
        if (sessionData.sessionId) {
            violationLogger.startLogging();
        }
        return () => {
            violationLogger.stopLogging();
        };
    }, [sessionData.sessionId]);    // Detect browser compatibility and log violation if needed
    const performBrowserCompatibilityCheck = () => {
        const report = getBrowserCompatibilityReport();
        const message = getBrowserCompatibilityMessage();
        
        setBrowserCompatibility(report);
        setBrowserMessage(message);
        
        console.log('Browser compatibility report:', report);
        console.log('Browser compatibility message:', message);
        
        // Show immediate toast notification for critical browser issues
        if (!report.isCompatible && report.issues.length > 0) {
            addToast(report.issues[0], 'error');
        } else if (report.warnings.length > 0) {
            addToast(report.warnings[0], 'warning');
        }
        
        return report;
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
    }, [systemChecks, currentStep]);    const checkSystemRequirements = async () => {
        setIsChecking(true);
        setError('');
        
        // Reset permission logging flags for this check
        permissionsLogged.current = {
            camera: false,
            microphone: false
        };
        
        try {
            // Perform comprehensive browser compatibility check
            const browserReport = performBrowserCompatibilityCheck();
            
            // Set browser compatibility status
            setSystemChecks(prev => ({ ...prev, browser: browserReport.isCompatible }));            // If browser is not compatible, log violation and block user
            if (!browserReport.isCompatible) {
                await violationLogger.logBrowserCompatibility(browserReport.browser);
                
                // Set specific error message based on browser issues
                if (browserReport.issues.length > 0) {
                    setError(browserReport.issues[0] + ' Please use Chrome, Firefox, or Edge (latest version).');
                } else {
                    setError('Your browser is not compatible with the proctoring system. Please use a supported browser.');
                }
                setIsChecking(false);
                return;
            }

            // Check camera
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                cameraStream.getTracks().forEach(track => track.stop());
                setSystemChecks(prev => ({ ...prev, camera: true }));
                
                // Log successful camera permission only once
                if (sessionData.sessionId && !permissionsLogged.current.camera) {
                    await logCameraPermission(sessionData.sessionId, true);
                    permissionsLogged.current.camera = true;
                    console.log('Camera permission granted and logged');
                }
            } catch (cameraErr) {
                console.log('Camera permission not granted:', cameraErr.message);
                setSystemChecks(prev => ({ ...prev, camera: false }));
                
                // Log camera permission denial only once
                if (sessionData.sessionId && !permissionsLogged.current.camera) {
                    await logCameraPermission(sessionData.sessionId, false, cameraErr.message);
                    permissionsLogged.current.camera = true;
                    console.log('Camera permission denied and logged');
                }
                
                // Also log violation for backward compatibility
                await violationLogger.logCameraPermission(cameraErr.message);
            }

            // Check microphone
            try {
                const microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                microphoneStream.getTracks().forEach(track => track.stop());
                setSystemChecks(prev => ({ ...prev, microphone: true }));
                
                // Log successful microphone permission only once
                if (sessionData.sessionId && !permissionsLogged.current.microphone) {
                    await logMicrophonePermission(sessionData.sessionId, true);
                    permissionsLogged.current.microphone = true;
                    console.log('Microphone permission granted and logged');
                }
            } catch (microphoneErr) {
                console.log('Microphone permission not granted:', microphoneErr.message);
                setSystemChecks(prev => ({ ...prev, microphone: false }));
                
                // Log microphone permission denial only once
                if (sessionData.sessionId && !permissionsLogged.current.microphone) {
                    await logMicrophonePermission(sessionData.sessionId, false, microphoneErr.message);
                    permissionsLogged.current.microphone = true;
                    console.log('Microphone permission denied and logged');
                }
                
                // Also log violation for backward compatibility
                await violationLogger.logMicrophonePermission(microphoneErr.message);
            }
        } catch (err) {
            console.error('System check error:', err);
            setError('An unexpected error occurred during system check. Please try again.');
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
    };    // Only show error for missing session data, not for permission issues
    if (error && (!sessionData.sessionId || !sessionData.testId) && !browserMessage) {
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
    }    if (currentStep === 'system') {
        const allChecksPassed = Object.values(systemChecks).every(check => check);
        const hasPermissionIssues = systemChecks.browser && (!systemChecks.camera || !systemChecks.microphone);

        return (
            <AppLayout>
                {/* Toast Notifications */}
                <ToastContainer>
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            message={toast.message}
                            type={toast.type}
                            onClose={() => removeToast(toast.id)}
                        />
                    ))}
                </ToastContainer>

                <div className="bg-gray-100 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-4">System Requirements Check</h2>
                        
                        {/* Browser Compatibility Alert */}
                        {browserMessage && (
                            <div className="mb-4">
                                <Alert 
                                    severity={browserMessage.type} 
                                    sx={{ mb: 2 }}
                                    icon={
                                        browserMessage.type === 'error' ? <FaTimesCircle /> :
                                        browserMessage.type === 'success' ? <FaCheckCircle /> :
                                        <FaExclamationTriangle />
                                    }
                                >
                                    <AlertTitle>{browserMessage.title}</AlertTitle>
                                    {browserMessage.message}
                                    {browserMessage.recommendation && (
                                        <div className="mt-2 text-sm">
                                            <strong>Recommendation:</strong> {browserMessage.recommendation}
                                        </div>
                                    )}
                                </Alert>
                            </div>
                        )}

                        {/* Browser Details */}
                        {browserCompatibility && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-md">
                                <div className="text-sm text-gray-600">
                                    <p><strong>Detected Browser:</strong> {browserCompatibility.browser.fullInfo}</p>
                                    {browserCompatibility.warnings.length > 0 && (
                                        <div className="mt-2">
                                            <p><strong>Warnings:</strong></p>
                                            <ul className="list-disc pl-5">
                                                {browserCompatibility.warnings.map((warning, index) => (
                                                    <li key={index} className="text-yellow-600">{warning}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.camera ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span className="flex items-center">
                                    <FaCamera className={`mr-2 ${systemChecks.camera ? 'text-green-500' : 'text-gray-400'}`} />
                                    Camera Access
                                </span>
                                {systemChecks.camera && <FaCheckCircle className="ml-auto text-green-500" />}
                            </div>
                            
                            <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.microphone ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span className="flex items-center">
                                    {systemChecks.microphone ? <FaMicrophone className="mr-2 text-green-500" /> : <FaMicrophoneSlash className="mr-2 text-gray-400" />}
                                    Microphone Access
                                </span>
                                {systemChecks.microphone && <FaCheckCircle className="ml-auto text-green-500" />}
                            </div>
                            
                            <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full mr-3 ${systemChecks.browser ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span>Browser Compatibility</span>
                                {systemChecks.browser ? (
                                    <FaCheckCircle className="ml-auto text-green-500" />
                                ) : (
                                    <FaTimesCircle className="ml-auto text-red-500" />
                                )}
                            </div>
                        </div>

                        {isChecking && (
                            <div className="mt-4 text-center text-blue-600">
                                <LinearProgress sx={{ mb: 1 }} />
                                Checking system requirements...
                            </div>
                        )}

                        {allChecksPassed && !isChecking && (
                            <div className="mt-6 text-center text-green-600">
                                <FaCheckCircle className="mx-auto mb-2 text-2xl" />
                                All system checks passed! Proceeding to face authentication...
                            </div>
                        )}

                        {hasPermissionIssues && !isChecking && (
                            <div className="mt-6 space-y-3">
                                <div className="text-center text-orange-600">
                                    <FaExclamationTriangle className="mx-auto mb-2 text-xl" />
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

                        {error && !isChecking && (
                            <div className="mt-6 text-center">
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    <AlertTitle>System Check Failed</AlertTitle>
                                    {error}
                                </Alert>
                                {error.includes('browser') && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                                        <h4 className="font-semibold text-blue-800 mb-2">Supported Browsers:</h4>
                                        <ul className="text-sm text-blue-700 space-y-1">
                                            <li>✓ Google Chrome (version 80 or later)</li>
                                            <li>✓ Mozilla Firefox (version 75 or later)</li>
                                            <li>✓ Microsoft Edge (version 80 or later)</li>
                                            <li>✗ Brave Browser (not supported)</li>
                                            <li>✗ Safari (limited support)</li>
                                        </ul>
                                    </div>
                                )}
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    fullWidth
                                    onClick={() => navigate('/test-registration')}
                                    sx={{ mt: 2 }}
                                >
                                    Back to Registration
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </AppLayout>
        );
    }

    // Face authentication step (ID verification)
    return (
        <AppLayout>
            <div className="bg-gray-100 flex items-center justify-center p-9">
                <FaceAuth onSuccess={handleFaceAuthSuccess} />
            </div>
        </AppLayout>
    );
};

export default PrerequisitesCheck; 