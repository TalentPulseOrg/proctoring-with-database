import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTestResults } from '../api/api';

const TestResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (location.state?.sessionId) {
          const data = await getTestResults(location.state.sessionId);
          setResults(data);
        } else {
          setError('No test session data available');
        }
      } catch (err) {
        setError('Failed to load test results');
        console.error('Error fetching test results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [location.state?.sessionId]);

  const renderSubmissionStatus = () => {
    if (location.state?.autoSubmitted) {
      const submissionType = location.state.submissionType;
      let message = '';
      let color = '';

      if (submissionType === 'warnings_exhausted') {
        message = 'Test was auto-submitted due to multiple proctoring violations';
        color = 'text-red-600';
      } else if (submissionType === 'time_expired') {
        message = 'Test was auto-submitted due to time expiration';
        color = 'text-yellow-600';
      }

      return (
        <div className={`mt-4 p-4 rounded-md bg-gray-50 ${color}`}>
          <p className="font-medium">{message}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-center text-gray-600">Loading test results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-center text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-center text-gray-600">No test results available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Test Results</h1>
        
        {renderSubmissionStatus()}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {results.score || 0}
            </div>
            <div className="text-gray-600">Correct Answers</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {results.total_questions || 0}
            </div>
            <div className="text-gray-600">Total Questions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {results.test?.skill || "N/A"}
            </div>
            <div className="text-gray-600">Test Subject</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Test Details</h2>
            <p><span className="font-medium">Candidate:</span> {results.user_name}</p>
            <p><span className="font-medium">Skill:</span> {results.test?.skill}</p>
            <p><span className="font-medium">Duration:</span> {results.test?.duration} minutes</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Timing</h2>
            <p><span className="font-medium">Start Time:</span> {new Date(results.start_time).toLocaleString()}</p>
            <p><span className="font-medium">End Time:</span> {new Date(results.end_time).toLocaleString()}</p>
            <p><span className="font-medium">Status:</span> {results.status}</p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResults; 