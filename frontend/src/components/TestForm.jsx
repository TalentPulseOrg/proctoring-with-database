import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTests, getTestById, startTestSession, registerUser, createTest } from '../api/api';

const TestForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        testId: '',
        agreeToTerms: false
    });
    const [error, setError] = useState('');
    const [testDetails, setTestDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchingTest, setSearchingTest] = useState(false);
    const [tests, setTests] = useState([]);
    const timeoutRef = useRef(null);

    // Fetch available tests
    useEffect(() => {
        const fetchTests = async () => {
            try {
                setLoading(true);
                const response = await getAllTests();
                
                // Transform backend response to frontend format
                const transformedTests = response.map(test => ({
                    testId: test.test_id,
                    skill: test.skill,
                    numQuestions: test.num_questions,
                    duration: test.duration,
                    createdAt: test.created_at,
                    createdBy: test.created_by
                }));
                
                setTests(transformedTests);
            } catch (err) {
                console.error('Error fetching tests:', err);
                setError('Failed to load available tests');
            } finally {
                setLoading(false);
            }
        };
        
        fetchTests();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Improved debounced test ID change handler
    const handleTestIdChange = (e) => {
        const { value } = e.target;
        
        // Update form state immediately to reflect input
        setFormData(prev => ({
            ...prev,
            testId: value
        }));

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // If empty, clear test details and return early
        if (!value.trim()) {
            setTestDetails(null);
            setSearchingTest(false);
            setError('');
            return;
        }

        // Minimum character length check (at least 1 character)
        if (value.trim().length < 1) {
            setTestDetails(null);
            setSearchingTest(false);
            return;
        }

        // Check if test exists in local cache first (no debounce needed)
        const cachedTest = tests.find(t => t.testId === parseInt(value, 10) || t.testId === value);
        if (cachedTest) {
            setTestDetails(cachedTest);
            setError('');
            setSearchingTest(false);
            return;
        }
        
        // Set searching state for visual feedback
        setSearchingTest(true);
        setError('');
        
        // Set new timeout for API call with improved debounce timing
        timeoutRef.current = setTimeout(async () => {
            try {
                const response = await getTestById(value);
                
                if (response && !response.error) {
                    // Transform backend response to frontend format
                    const test = {
                        testId: response.test_id,
                        skill: response.skill,
                        numQuestions: response.num_questions,
                        duration: response.duration,
                        createdAt: response.created_at,
                        createdBy: response.created_by
                    };
                    
                    setTestDetails(test);
                    setError('');
                } else {
                    setTestDetails(null);
                    setError('Test ID not found');
                }
            } catch (err) {
                console.error('Error checking test ID:', err);
                setError('Error checking test ID');
                setTestDetails(null);
            } finally {
                setSearchingTest(false);
            }
        }, 500); // Reduced debounce time to 500ms for better responsiveness
    };

    // Clean up timeout on component unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.name || !formData.email || !formData.testId) {
            setError('Please fill in all required fields');
            return;
        }

        if (!formData.agreeToTerms) {
            setError('You must agree to the terms and conditions');
            return;
        }

        try {
            setLoading(true);
            
            // Ensure we have a valid test - create one if it doesn't exist
            let testId = formData.testId;
            if (!testDetails) {
                console.log('Test not found, creating a new test with ID:', testId);
                try {
                    // Create a test if it doesn't exist
                    const newTestData = {
                        test_id: parseInt(testId, 10),
                        skill: 'General Knowledge',
                        num_questions: 10,
                        duration: 30,
                        created_by: 1
                    };
                    
                    const createResponse = await createTest(newTestData);
                    if (createResponse && !createResponse.error) {
                        console.log('Created new test:', createResponse);
                        testId = createResponse.test_id;
                    } else {
                        console.error('Failed to create test:', createResponse);
                        throw new Error('Could not create test: ' + (createResponse.message || 'Unknown error'));
                    }
                } catch (testError) {
                    console.error('Error creating test:', testError);
                    setError('Error creating test: ' + (testError.message || 'Please try again.'));
                    setLoading(false);
                    return;
                }
            }
            
            // First, register the user to get a user ID
            let userId = 1; // Default fallback
            
            try {
                // Create a temporary user for the test session
                const userData = {
                    name: formData.name,
                    email: formData.email,
                    role: 'candidate'
                };
                
                console.log('Creating temporary user:', userData);
                const userResponse = await registerUser(userData);
                
                if (!userResponse.error && userResponse.id) {
                    userId = userResponse.id;
                    console.log('Created user with ID:', userId);
                }
            } catch (userError) {
                console.error('Error creating user, using default ID:', userError);
            }
            
            // Now start the test session
            const sessionData = {
                test_id: testId,
                user_id: userId,
                user_name: formData.name,
                user_email: formData.email
            };
            
            console.log('Starting test session with data:', sessionData);
            const response = await startTestSession(sessionData);
            
            if (response.error) {
                throw new Error(response.message || 'Failed to register for test');
            }
            
            // Use session ID from response
            const sessionId = response.id;
            console.log('TEST FORM: Created new session with ID:', sessionId);
            
            // Navigate to prerequisites check with session ID
            navigate('/prerequisites', { state: { 
                sessionId,
                testId: testId,
                userName: formData.name,
                userEmail: formData.email
            }});
        } catch (err) {
            console.error('Error registering for test:', err);
            setError('Failed to register for test: ' + (err.message || 'Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
                    <div className="max-w-md mx-auto">
                        <div className="divide-y divide-gray-200">
                            <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Test Registration Form</h2>
                                
                                {loading ? (
                                    <div className="flex justify-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Email *</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Test ID *</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="testId"
                                                    value={formData.testId}
                                                    onChange={handleTestIdChange}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                                                    required
                                                    placeholder="Enter test ID"
                                                />
                                                {searchingTest && (
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                    </div>
                                                )}
                                            </div>
                                            {searchingTest && (
                                                <p className="mt-1 text-xs text-blue-600">Searching for test...</p>
                                            )}
                                        </div>

                                        {testDetails && (
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium text-blue-800">Test Details</h3>
                                                <p className="mt-1 text-sm text-blue-700">
                                                    Skill: {testDetails.skill}<br />
                                                    Duration: {testDetails.duration} minutes<br />
                                                    Questions: {testDetails.numQuestions}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="agreeToTerms"
                                                checked={formData.agreeToTerms}
                                                onChange={handleChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-900">
                                                I agree to the terms and conditions of the test
                                            </label>
                                        </div>

                                        {error && (
                                            <div className="text-red-500 text-sm mt-2">
                                                {error}
                                            </div>
                                        )}

                                        <div className="pt-4">
                                            <button
                                                type="submit"
                                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Proceed to System Check
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestForm;
