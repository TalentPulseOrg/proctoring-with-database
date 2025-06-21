import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../config';

const TestResults = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grade, setGrade] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initializeResults = async () => {
      try {
        setLoading(true);

        if (location.state?.result) {
          setResults(location.state.result);
        } else if (location.state?.sessionId) {
          // Fetch detailed results from the backend
          const response = await axios.get(
            `${API_BASE_URL}/api/sessions/${location.state.sessionId}`
          );
          
          if (response.data) {
            // Combine backend data with frontend state
            const combinedResults = {
              ...response.data,
              testDetails: location.state.testDetails,
              responses: location.state.responses || response.data.responses || []
            };
            setResults(combinedResults);
          } else {
            throw new Error("No data received from server");
          }
        } else {
          setError("No test results found");
        }
      } catch (error) {
        console.error("Error loading results:", error);
        setError("Failed to load test results");
      } finally {
        setLoading(false);
      }
    };

    initializeResults();
  }, [location]);

  useEffect(() => {
    if (results) {
      const percentage = results.percentage || 0;

      if (percentage >= 90) {
        setGrade("A+");
      } else if (percentage >= 80) {
        setGrade("A");
      } else if (percentage >= 70) {
        setGrade("B");
      } else if (percentage >= 60) {
        setGrade("C");
      } else if (percentage >= 50) {
        setGrade("D");
      } else {
        setGrade("F");
      }
    }
  }, [results]);

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith("A")) return "bg-green-100 text-green-800";
    if (grade === "B") return "bg-blue-100 text-blue-800";
    if (grade === "C") return "bg-yellow-100 text-yellow-800";
    if (grade === "D") return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const handleViewDetails = () => {
    navigate("/test-analysis", {
      state: {
        results: results,
        testDetails: results.testDetails,
        questions: results.responses,
        answers: results.responses
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">
            Loading your results...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 text-center mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-center mb-4">
            Error Loading Results
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={handleGoHome}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-semibold text-center mb-4">
            No Results Found
          </h2>
          <p className="text-gray-600 text-center mb-6">
            No test results were found.
          </p>
          <button
            onClick={handleGoHome}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test Results
          </h1>
          <p className="text-gray-600">
            Your test has been completed and results stored in database
          </p>
        </div>

        {/* Results Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Score Display */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-blue-100 rounded-full mb-4">
              <span
                className={`text-4xl font-bold ${getScoreColor(
                  results.percentage || 0
                )}`}
              >
                {Math.round(results.percentage || 0)}%
              </span>
            </div>
            <div
              className={`inline-block px-4 py-2 rounded-full text-lg font-semibold ${getGradeColor(
                grade
              )}`}
            >
              Grade: {grade}
            </div>
          </div>

          {/* Detailed Stats */}
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
                {results.testDetails?.skill || "N/A"}
              </div>
              <div className="text-gray-600">Test Subject</div>
            </div>
          </div>

          {/* Test Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Test Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Test ID:</span>
                <span className="ml-2 text-gray-600">
                  {results.testDetails?.testId || results.test_id || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Candidate:</span>
                <span className="ml-2 text-gray-600">
                  {results.testDetails?.candidate_name || results.user_name || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Duration:</span>
                <span className="ml-2 text-gray-600">
                  {results.testDetails?.duration || "N/A"} minutes
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className="ml-2 text-gray-600 capitalize">
                  {results.status || "Completed"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Start Time:</span>
                <span className="ml-2 text-gray-600">
                  {results.testDetails?.startTime
                    ? new Date(results.testDetails.startTime).toLocaleString()
                    : results.start_time
                    ? new Date(results.start_time).toLocaleString()
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">End Time:</span>
                <span className="ml-2 text-gray-600">
                  {results.testDetails?.endTime
                    ? new Date(results.testDetails.endTime).toLocaleString()
                    : results.end_time
                    ? new Date(results.end_time).toLocaleString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Question Responses */}
          {results.responses && results.responses.length > 0 && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Question Responses</h3>
              <div className="space-y-4">
                {results.responses.map((response, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      response.is_correct ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <p className="font-medium mb-2">
                      Question {index + 1}: {response.question_text}
                    </p>
                    <p className="text-sm">
                      Your Answer: {response.selected_option_text}
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        response.is_correct ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {response.is_correct ? "✓ Correct" : "✗ Incorrect"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleViewDetails}
            className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            View Detailed Analysis
          </button>
          <button
            onClick={handleGoHome}
            className="bg-gray-600 text-white py-3 px-8 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
