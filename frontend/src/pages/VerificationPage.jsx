import React, { useState } from 'react';
import FaceVerification from '../components/FaceVerification';
import { useNavigate } from 'react-router-dom';
import { colors, fonts } from '../styles/theme';

const VerificationPage = () => {
    const [isVerified, setIsVerified] = useState(false);
    const navigate = useNavigate();

    const handleVerificationComplete = (success) => {
        if (success) {
            setIsVerified(true);
            // Navigate to the exam page or show success message
            setTimeout(() => {
                navigate('/test-interface'); // or wherever you want to redirect after verification
            }, 2000);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: colors.sidebarBg, fontFamily: fonts.main }} className="flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 mt-16">
                {!isVerified ? (
                    <FaceVerification onVerificationComplete={handleVerificationComplete} />
                ) : (
                    <div className="success-message text-center">
                        <h2 className="text-2xl font-bold mb-2 text-teal-600">Verification Successful!</h2>
                        <p className="text-gray-700">Redirecting to exam...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerificationPage; 