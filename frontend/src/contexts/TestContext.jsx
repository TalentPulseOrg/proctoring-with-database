import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllTests, createTest, getTestById, deleteTest as apiDeleteTest, deleteAllTests as apiDeleteAllTests } from '../api/api';
import { getCurrentUser } from '../api/api';

const TestContext = createContext();

export const useTestContext = () => {
    const context = useContext(TestContext);
    if (!context) {
        throw new Error('useTestContext must be used within a TestProvider');
    }
    return context;
};

export const TestProvider = ({ children }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadTests = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getAllTests();
            
            // Check if response is valid
            if (!response || !Array.isArray(response)) {
                console.warn('Invalid response from getAllTests, using empty array');
                setTests([]);
                return;
            }
            
            // Transform backend response to frontend format
            const transformedTests = response.map(test => ({
                testId: parseInt(test.test_id) || 0, // Ensure testId is an integer, default to 0
                skill: test.skill || 'Unknown',
                numQuestions: test.num_questions || 0,
                duration: test.duration || 0,
                createdAt: test.created_at || new Date().toISOString(),
                createdBy: test.created_by || 1
            }));
            
            setTests(transformedTests);
        } catch (err) {
            console.error('Failed to load tests:', err);
            setError('Failed to load tests from server');
            setTests([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const addTest = async (newTest) => {
        try {
            setLoading(true);
            setError(null);
            
            // Get current user
            const user = getCurrentUser();
            const userId = user?.id || 1; // Default to 1 if user ID not available
            
            // Ensure testId is an integer
            const testId = parseInt(newTest.testId);
            if (isNaN(testId)) {
                throw new Error('Test ID must be a valid number');
            }
            
            // Transform frontend test model to backend format
            const backendTest = {
                test_id: testId,
                skill: newTest.skill,
                num_questions: newTest.numQuestions,
                duration: newTest.duration,
                created_by: userId
            };
            
            const response = await createTest(backendTest);
            
            // Transform backend response back to frontend format
            const frontendTest = {
                testId: parseInt(response.test_id), // Ensure testId is an integer
                skill: response.skill,
                numQuestions: response.num_questions,
                duration: response.duration,
                createdAt: response.created_at,
                createdBy: response.created_by
            };
            
            setTests(prevTests => [...prevTests, frontendTest]);
            return frontendTest;
        } catch (err) {
            console.error('Failed to add test:', err);
            setError('Failed to add test to server');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteTest = async (testId) => {
        try {
            setLoading(true);
            setError(null);
            await apiDeleteTest(testId);
            setTests(prevTests => prevTests.filter(test => test.testId !== testId));
        } catch (err) {
            console.error('Failed to delete test:', err);
            setError('Failed to delete test from server');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteAllTests = async () => {
        try {
            setLoading(true);
            setError(null);
            await apiDeleteAllTests();
            setTests([]);
        } catch (err) {
            console.error('Failed to delete all tests:', err);
            setError('Failed to delete all tests from server');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTests();
    }, []);

    return (
        <TestContext.Provider value={{ 
            tests, 
            loading, 
            error, 
            loadTests, 
            addTest, 
            deleteTest, 
            deleteAllTests 
        }}>
            {children}
        </TestContext.Provider>
    );
}; 