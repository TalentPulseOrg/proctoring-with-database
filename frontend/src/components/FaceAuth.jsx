import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AppLayout from '../layouts/AppLayout';
import { colors, fonts } from '../styles/theme';

const FaceAuth = ({ onSuccess }) => {
    const [step, setStep] = useState('id-upload'); // 'id-upload' | 'verification'
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [userId, setUserId] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        return () => {
            // Cleanup: stop video stream when component unmounts
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setIsCapturing(true);
            setStatus('Camera started. Please position your face in the frame.');
        } catch (err) {
            setError('Error accessing camera: ' + err.message);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsCapturing(false);
        }
    };

    const captureImage = () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        return canvas.toDataURL('image/jpeg');
    };

    const handleIdPhotoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setStatus('Uploading ID photo...');
            const formData = new FormData();
            formData.append('image_data', file);
            formData.append('user_id', userId);

            const response = await axios.post(`${API_BASE_URL}/auth/upload-id-photo`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true
            });

            if (response.data.success) {
                setStatus('ID photo uploaded successfully!');
                setStep('verification');
            } else {
                setError('Failed to upload ID photo: ' + response.data.message);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError('Error uploading ID photo: ' + (err.response?.data?.detail || err.message));
        }
    };

    const verifyFace = async () => {
        try {
            setStatus('Verifying face...');
            const imageData = captureImage();
            
            const response = await fetch(imageData);
            const blob = await response.blob();

            const formData = new FormData();
            formData.append('image_data', blob, 'face.jpg');
            formData.append('user_id', userId);

            const result = await axios.post(`${API_BASE_URL}/auth/verify-face`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true
            });

            if (result.data.success) {
                setStatus('Face verification successful!');
                setIsVerified(true);
                setTimeout(() => {
                    onSuccess();
                }, 2000);
            } else {
                setError(`Verification failed: ${result.data.reason}`);
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError('Error during verification: ' + (err.response?.data?.detail || err.message));
        }
    };

    const renderIdUploadStep = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your User ID
                </label>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your user ID"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Government ID Photo
                </label>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleIdPhotoUpload}
                    accept="image/*"
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        width: '100%',
                        background: colors.buttonBg,
                        color: colors.buttonText,
                        padding: '0.5rem 1rem',
                        borderRadius: 6,
                        fontWeight: 500,
                        fontFamily: fonts.main,
                        border: 'none',
                        outline: 'none',
                        transition: 'box-shadow 0.2s, background 0.2s',
                        boxShadow: `0 2px 8px ${colors.cardShadow}`
                    }}
                    onFocus={e => (e.target.style.boxShadow = `0 0 0 3px ${colors.primary}55`)}
                    onBlur={e => (e.target.style.boxShadow = `0 2px 8px ${colors.cardShadow}`)}
                >
                    Choose ID Photo
                </button>
            </div>
        </div>
    );

    const renderVerificationStep = () => (
        <div className="space-y-4">
            <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            </div>

            {!isCapturing ? (
                <button
                    onClick={startCamera}
                    style={{
                        width: '100%',
                        background: colors.buttonBg,
                        color: colors.buttonText,
                        padding: '0.5rem 1rem',
                        borderRadius: 6,
                        fontWeight: 500,
                        fontFamily: fonts.main,
                        border: 'none',
                        outline: 'none',
                        transition: 'box-shadow 0.2s, background 0.2s',
                        boxShadow: `0 2px 8px ${colors.cardShadow}`
                    }}
                    onFocus={e => (e.target.style.boxShadow = `0 0 0 3px ${colors.primary}55`)}
                    onBlur={e => (e.target.style.boxShadow = `0 2px 8px ${colors.cardShadow}`)}
                >
                    Start Camera
                </button>
            ) : (
                <>
                    <button
                        onClick={verifyFace}
                        className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
                    >
                        Verify Face
                    </button>
                    <button
                        onClick={stopCamera}
                        className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
                    >
                        Stop Camera
                    </button>
                </>
            )}
        </div>
    );

    return (
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-center">ID Verification</h2>
                
                {step === 'id-upload' ? renderIdUploadStep() : renderVerificationStep()}

                {status && (
                    <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded">
                        {status}
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {isVerified && (
                    <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
                        Authentication successful! Proceeding to exam...
                    </div>
                )}
            </div>
    );
};

export default FaceAuth; 