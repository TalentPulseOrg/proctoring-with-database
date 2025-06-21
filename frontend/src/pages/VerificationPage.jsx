import React, { useState } from 'react';
import FaceVerification from '../components/FaceVerification';
import { useNavigate } from 'react-router-dom';

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
        <div className="verification-page">
            {!isVerified ? (
                <FaceVerification onVerificationComplete={handleVerificationComplete} />
            ) : (
                <div className="success-message">
                    <h2>Verification Successful!</h2>
                    <p>Redirecting to exam...</p>
                </div>
            )}
        </div>
    );
};

export default VerificationPage; 