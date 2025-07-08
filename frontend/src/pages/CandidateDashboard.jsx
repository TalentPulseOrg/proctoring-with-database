import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TestForm from "../components/TestForm";
import TestInterface from "../components/TestInterface";
import FaceVerification from "../components/FaceVerification";
import WebcamMonitor from "../components/WebcamMonitor";
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { colors, fonts } from '../styles/theme';

export default function CandidateDashboard() {
  const [testData, setTestData] = useState(null);
  const [showTest, setShowTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
    const checkFaceVerification = async () => {
      if (user?.id) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/auth/verification-status/${user.id}`);
          setIsVerified(response.data.is_verified);
        } catch (err) {
          console.error("Error checking verification status:", err);
          setIsVerified(false);
        }
      }
    };
    
    checkFaceVerification();
  }, [user]);

  const handleGenerateTest = async (formData) => {
    if (!isVerified) {
      // If not verified, redirect to face verification
      navigate('/face-verification');
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.post(`${API_BASE_URL}/api/tests/generate`, {
        skill: formData.skill,
        num_questions: formData.numQuestions,
        duration: formData.duration,
        user_id: user?.id
      });

      // Validate response structure
      if (!response.data?.questions?.length) {
        throw new Error("Invalid test format received from server");
      }

      setTestData({
        ...formData,
        questions: response.data.questions,
        testId: response.data.testId,
        userId: user?.id
      });
      setShowTest(true);
    } catch (err) {
      console.error("Test generation error:", err);
      setError(err.response?.data?.detail || err.message || "Failed to generate test. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
        setError("Request timed out. Please try again.");
      }, 30000); // 30 seconds timeout
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Handle verification success
  const handleVerificationSuccess = () => {
    setIsVerified(true);
    navigate('/candidate');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: fonts.main }}>
      {/* Themed Header */}
      <header style={{
        background: colors.sidebarBg,
        color: '#fff',
        boxShadow: '0 2px 8px rgba(20,184,166,0.10)',
      }}>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold" style={{ color: '#fff', letterSpacing: '0.02em' }}>
            Candidate Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Logged in as: <span className="font-medium">{user?.email || 'Candidate'}</span>
            </div>
            <button 
              onClick={logout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md"
              style={{
                background: '#ef4444',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(239,68,68,0.10)',
                transition: 'background 0.2s',
              }}
            >
              <LogoutIcon className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
              <p className="mt-4 text-gray-600">Generating your test...</p>
            </div>
          ) : showTest ? (
            <>
              <TestInterface testData={testData} duration={testData.duration} />
              {user?.id && testData?.testId && (
                <WebcamMonitor testId={testData.testId} userId={user.id} isTestActive={showTest} />
              )}
            </>
          ) : (
            <>
              {!isVerified && (
                <div className="mb-4 p-4 bg-yellow-100 text-yellow-700 rounded-lg">
                  Please complete face verification before starting the test.
                </div>
              )}
              <TestForm onSubmit={handleGenerateTest} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
