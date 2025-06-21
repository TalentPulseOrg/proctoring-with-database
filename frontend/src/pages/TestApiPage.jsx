import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const TestApiPage = () => {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [userResponses, setUserResponses] = useState({});
  const [session, setSession] = useState(null);
  const [results, setResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('Test User');
  const [userEmail, setUserEmail] = useState('test@example.com');
  const [userId, setUserId] = useState(1); // Default user ID
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Fetch all available tests
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/tests`);
        setTests(response.data);
      } catch (error) {
        console.error('Error fetching tests:', error);
        setErrorMessage('Failed to fetch tests from server');
      }
    };
    
    fetchTests();
  }, []);
  
  // Fetch questions for selected test
  const fetchQuestions = async (testId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tests/${testId}/questions`);
      setTestQuestions(response.data);
      
      // Initialize user responses
      const initialResponses = {};
      response.data.forEach(question => {
        initialResponses[question.id] = null;
      });
      setUserResponses(initialResponses);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setErrorMessage('Failed to fetch questions for this test');
    }
  };
  
  // Start a new test session
  const startSession = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/sessions/start`, {
        test_id: selectedTest.test_id,
        user_id: userId,
        user_name: userName,
        user_email: userEmail
      });
      
      setSession(response.data);
      setDebugInfo(null);
      setErrorMessage('');
    } catch (error) {
      console.error('Error starting session:', error);
      setErrorMessage('Failed to start test session');
    }
  };
  
  // Handle option selection
  const handleOptionSelect = (questionId, optionId) => {
    setUserResponses({
      ...userResponses,
      [questionId]: optionId
    });
  };
  
  // Submit test answers
  const submitTest = async () => {
    try {
      // Format answers for submission - filter out questions with no answer
      const answers = Object.keys(userResponses)
        .filter(questionId => userResponses[questionId] !== null)
        .map(questionId => ({
          question_id: parseInt(questionId),
          selected_option_id: userResponses[questionId]
        }));
      
      if (answers.length === 0) {
        setErrorMessage('Please answer at least one question before submitting');
        return;
      }
      
      console.log('Submitting answers:', answers);
      
      // Get current timestamp in ISO format
      const endTime = new Date().toISOString();
      
      // Debug info
      setDebugInfo({
        session_id: session.id,
        answers: answers,
        end_time: endTime
      });
      
      const response = await axios.post(`${API_BASE_URL}/api/sessions/submit`, {
        session_id: session.id,
        answers: answers,
        end_time: endTime
      });
      
      setResults(response.data);
      setErrorMessage('');
    } catch (error) {
      console.error('Error submitting test:', error);
      setErrorMessage(`Failed to submit test answers: ${error.response?.data?.detail || error.message}`);
    }
  };
  
  // Get detailed results
  const getDetailedResults = async () => {
    if (!userId) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sessions/user/${userId}/results`);
      
      if (response.data && response.data.length > 0) {
        setResults(response.data[0]); // Get the latest test result
        setErrorMessage('');
      } else {
        setErrorMessage('No results found for this user');
      }
    } catch (error) {
      console.error('Error fetching detailed results:', error);
      setErrorMessage('Failed to fetch detailed results');
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded">
          {errorMessage}
        </div>
      )}
      
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1">User ID:</label>
            <input 
              type="number" 
              value={userId} 
              onChange={(e) => setUserId(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Name:</label>
            <input 
              type="text" 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Email:</label>
            <input 
              type="email" 
              value={userEmail} 
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Available Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tests.map(test => (
            <div 
              key={test.test_id} 
              className={`p-4 border rounded cursor-pointer ${selectedTest?.test_id === test.test_id ? 'bg-blue-100 border-blue-500' : ''}`}
              onClick={() => {
                setSelectedTest(test);
                fetchQuestions(test.test_id);
                setSession(null);
                setResults(null);
                setDebugInfo(null);
              }}
            >
              <h3 className="font-bold">{test.skill}</h3>
              <p>Questions: {test.num_questions}</p>
              <p>Duration: {test.duration} minutes</p>
            </div>
          ))}
        </div>
      </div>
      
      {selectedTest && !session && (
        <div className="mb-6">
          <button 
            onClick={startSession}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Start Test Session
          </button>
        </div>
      )}
      
      {session && !results && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Test Questions</h2>
          <p className="mb-4">Session ID: {session.id}</p>
          <p className="mb-2">Start Time: {new Date(session.start_time).toLocaleString()}</p>
          
          {testQuestions.map(question => (
            <div key={question.id} className="mb-6 p-4 border rounded">
              <h3 className="font-medium mb-2">{question.question_text}</h3>
              
              <div className="ml-4">
                {question.options.map(option => (
                  <div key={option.id} className="mb-2">
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name={`question-${question.id}`}
                        checked={userResponses[question.id] === option.id}
                        onChange={() => handleOptionSelect(question.id, option.id)}
                        className="mr-2"
                      />
                      {option.option_text}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <button 
            onClick={submitTest}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Submit Test
          </button>
        </div>
      )}
      
      {results && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          
          <div className="mb-4">
            <p><strong>Score:</strong> {results.score} / {results.total_questions}</p>
            <p><strong>Percentage:</strong> {results.percentage}%</p>
            <p><strong>Status:</strong> {results.status}</p>
            <p><strong>Start Time:</strong> {new Date(results.start_time).toLocaleString()}</p>
            <p><strong>End Time:</strong> {results.end_time ? new Date(results.end_time).toLocaleString() : 'Not completed'}</p>
          </div>
          
          {results.responses && (
            <div>
              <h3 className="font-medium mb-2">Detailed Responses:</h3>
              {results.responses.map((response, index) => (
                <div key={index} className={`p-2 mb-2 rounded ${response.is_correct ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p><strong>Question:</strong> {response.question_text}</p>
                  <p><strong>Your Answer:</strong> {response.selected_option_text}</p>
                  <p><strong>{response.is_correct ? 'Correct ✓' : 'Incorrect ✗'}</strong></p>
                </div>
              ))}
            </div>
          )}
          
          <button 
            onClick={getDetailedResults}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
          >
            View Detailed Results
          </button>
        </div>
      )}
      
      {debugInfo && (
        <div className="mt-6 p-4 border rounded bg-gray-100">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <pre className="text-xs overflow-auto bg-gray-800 text-white p-4 rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestApiPage; 