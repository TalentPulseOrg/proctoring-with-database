import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTestResults } from '../api/api';
import { colors, fonts } from '../styles/theme';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { FaCheckCircle, FaRegQuestionCircle } from 'react-icons/fa';

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
              <span className="text-3xl font-bold" style={{ color: getGrade(results.score, results.total_questions).color }}>{((results.score / (results.total_questions || 1)) * 100).toFixed(0)}%</span>
              <span className="ml-2 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#fef2f2', color: getGrade(results.score, results.total_questions).color, marginLeft: 8 }}>
                Grade: {getGrade(results.score, results.total_questions).grade}
              </span>
            </div>
          </div>
          {/* Stat Cards */}
          <div className="w-full flex flex-col md:flex-row gap-4 justify-center">
            <div className="flex-1 bg-green-50 rounded-lg p-4 flex flex-col items-center shadow-sm">
              <FaCheckCircle className="text-green-500 mb-1" size={28} />
              <div className="text-2xl font-bold text-green-700">{results.score || 0}</div>
              <div className="text-gray-600 text-sm">Correct Answers</div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg p-4 flex flex-col items-center shadow-sm">
              <FaRegQuestionCircle className="text-blue-500 mb-1" size={28} />
              <div className="text-2xl font-bold text-blue-700">{results.total_questions || 0}</div>
              <div className="text-gray-600 text-sm">Total Questions</div>
            </div>
            <div className="flex-1 bg-purple-50 rounded-lg p-4 flex flex-col items-center shadow-sm">
              <span className="text-purple-600 font-bold text-lg mb-1">{results.test?.skill || 'N/A'}</span>
              <div className="text-gray-600 text-sm">Test Subject</div>
            </div>
          </div>
          {/* Test Info Table */}
          <div className="w-full mt-4 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="font-semibold">Test ID:</span> {results.test?.test_id || '-'}</div>
              <div><span className="font-semibold">Candidate:</span> {results.user_name}</div>
              <div><span className="font-semibold">Duration:</span> {results.test?.duration} minutes</div>
              <div><span className="font-semibold">Status:</span> {results.status}</div>
              <div><span className="font-semibold">Start Time:</span> {new Date(results.start_time).toLocaleString()}</div>
              <div><span className="font-semibold">End Time:</span> {new Date(results.end_time).toLocaleString()}</div>
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
            onClick={() => navigate('/dashboard')}
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
            onClick={() => navigate('/')}
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