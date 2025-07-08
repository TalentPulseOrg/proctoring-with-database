import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../config';
import { colors, fonts } from '../styles/theme';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { FaCheckCircle, FaRegQuestionCircle } from 'react-icons/fa';

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

  // Helper for PieChart data
  const getPieData = (results) => [
    { name: 'Correct', value: results.score || 0 },
    { name: 'Incorrect', value: (results.total_questions || 0) - (results.score || 0) },
  ];
  const pieColors = [colors.primary, '#f87171']; // teal, red-400

  // Helper for BarChart data (if available)
  const getBarData = (results) => {
    if (results.category_breakdown) {
      return Object.entries(results.category_breakdown).map(([cat, val]) => ({
        category: cat,
        correct: val.correct,
        incorrect: val.incorrect,
      }));
    }
    return null;
  };

  // Grade calculation
  const getGrade = (score, total) => {
    if (!total) return '-';
    const percent = (score / total) * 100;
    if (percent >= 90) return { grade: 'A+', color: colors.primary };
    if (percent >= 75) return { grade: 'A', color: colors.primary };
    if (percent >= 60) return { grade: 'B', color: '#38bdf8' };
    if (percent >= 40) return { grade: 'C', color: '#facc15' };
    return { grade: 'F', color: '#f87171' };
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

  // Use percentage and total_questions for grade
  const score = results.score || 0;
  const total = results.total_questions || 0;
  const gradeObj = getGrade(score, total);

  return (
    <div className="relative min-h-screen py-8" style={{ fontFamily: fonts.main, background: '#f8fafc' }}>
      {/* Background accent */}
      <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 70% 20%, #14b8a622 0%, #fff 80%)' }}></div>
      <div className="relative z-10 max-w-3xl mx-auto p-4 md:p-8">
        {/* Congratulatory header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: colors.primaryDark, fontFamily: fonts.heading }}>Test Results</h1>
          <p className="text-gray-600 text-lg">Your test has been completed and results stored in database</p>
        </div>
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 mb-8 flex flex-col items-center gap-8">
          {/* PieChart for correct/incorrect */}
          <div className="w-full flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={getPieData(results)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill={colors.primary}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  isAnimationActive={true}
                >
                  {getPieData(results).map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 text-center">
              <span className="text-3xl font-bold" style={{ color: gradeObj.color }}>{((score / (total || 1)) * 100).toFixed(0)}%</span>
              <span className="ml-2 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#fef2f2', color: gradeObj.color, marginLeft: 8 }}>
                Grade: {gradeObj.grade}
              </span>
            </div>
          </div>
          {/* Stat Cards */}
          <div className="w-full flex flex-col md:flex-row gap-4 justify-center">
            <div className="flex-1 bg-green-50 rounded-lg p-4 flex flex-col items-center shadow-sm">
              <FaCheckCircle className="text-green-500 mb-1" size={28} />
              <div className="text-2xl font-bold text-green-700">{score}</div>
              <div className="text-gray-600 text-sm">Correct Answers</div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg p-4 flex flex-col items-center shadow-sm">
              <FaRegQuestionCircle className="text-blue-500 mb-1" size={28} />
              <div className="text-2xl font-bold text-blue-700">{total}</div>
              <div className="text-gray-600 text-sm">Total Questions</div>
            </div>
            <div className="flex-1 bg-purple-50 rounded-lg p-4 flex flex-col items-center shadow-sm">
              <span className="text-purple-600 font-bold text-lg mb-1">{results.testDetails?.skill || results.test?.skill || 'N/A'}</span>
              <div className="text-gray-600 text-sm">Test Subject</div>
            </div>
          </div>
          {/* Test Info Table */}
          <div className="w-full mt-4 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="font-semibold">Test ID:</span> {results.testDetails?.testId || results.test_id || '-'}</div>
              <div><span className="font-semibold">Candidate:</span> {results.testDetails?.candidate_name || results.user_name || '-'}</div>
              <div><span className="font-semibold">Duration:</span> {results.testDetails?.duration || results.test?.duration || '-'} minutes</div>
              <div><span className="font-semibold">Status:</span> {results.status}</div>
              <div><span className="font-semibold">Start Time:</span> {results.testDetails?.startTime ? new Date(results.testDetails.startTime).toLocaleString() : results.start_time ? new Date(results.start_time).toLocaleString() : '-'}</div>
              <div><span className="font-semibold">End Time:</span> {results.testDetails?.endTime ? new Date(results.testDetails.endTime).toLocaleString() : results.end_time ? new Date(results.end_time).toLocaleString() : '-'}</div>
            </div>
          </div>
        </div>
        {/* Performance Breakdown BarChart */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-lg font-semibold text-gray-800 mb-4">Performance Breakdown</div>
          {getBarData(results) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={getBarData(results)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="correct" fill={colors.primary} name="Correct" isAnimationActive={true} />
                <Bar dataKey="incorrect" fill="#f87171" name="Incorrect" isAnimationActive={true} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center">No category breakdown available for this test.</div>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
          <button
            onClick={handleViewDetails}
            style={{
              background: colors.buttonBg,
              color: colors.buttonText,
              fontFamily: fonts.main,
              fontWeight: 700,
              border: 'none',
              borderRadius: 8,
              padding: '0.75rem 2rem',
              boxShadow: `0 2px 8px ${colors.cardShadow}`,
              outline: 'none',
              transition: 'box-shadow 0.2s, background 0.2s',
            }}
            onFocus={e => (e.target.style.boxShadow = `0 0 0 3px ${colors.primary}55`)}
            onBlur={e => (e.target.style.boxShadow = `0 2px 8px ${colors.cardShadow}`)}
          >
            View Detailed Analysis
          </button>
          <button
            onClick={handleGoHome}
            style={{
              background: '#334155',
              color: '#fff',
              fontFamily: fonts.main,
              fontWeight: 700,
              border: 'none',
              borderRadius: 8,
              padding: '0.75rem 2rem',
              boxShadow: `0 2px 8px ${colors.cardShadow}`,
              outline: 'none',
              transition: 'box-shadow 0.2s, background 0.2s',
            }}
            onFocus={e => (e.target.style.boxShadow = `0 0 0 3px #33415555`)}
            onBlur={e => (e.target.style.boxShadow = `0 2px 8px ${colors.cardShadow}`)}
          >
            Back to Home
          </button>
        </div>
        {/* Motivational quote */}
        <div className="text-center text-gray-500 italic mt-8">
          "Success is the sum of small efforts, repeated day in and day out."<br />
          <span className="text-teal-700 font-semibold">Keep learning and growing!</span>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
