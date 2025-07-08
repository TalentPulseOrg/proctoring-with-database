import React, { useState } from 'react';
import { useTestContext } from '../contexts/TestContext';
import { colors } from '../styles/theme';

const AdminTestCreation = () => {
    const { tests, addTest } = useTestContext();
    const [formData, setFormData] = useState({
        testId: '',
        skill: '',
        numQuestions: 5,
        duration: 30
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'numQuestions' || name === 'duration' || name === 'testId' ? 
                parseInt(value) || '' : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate test ID is a number
        if (formData.testId === '' || isNaN(parseInt(formData.testId))) {
            setError('Test ID must be a valid number.');
            return;
        }

        try {
            // Check if test ID already exists
            if (tests.some(test => test.testId === parseInt(formData.testId))) {
                setError('Test ID already exists. Please use a different ID.');
                return;
            }

            // Add new test to the list
            const newTest = {
                ...formData,
                testId: parseInt(formData.testId),
                createdAt: new Date().toISOString()
            };
            
            addTest(newTest);
            
            setSuccess('Test created successfully!');
            setFormData({
                testId: '',
                skill: '',
                numQuestions: 5,
                duration: 30
            });
        } catch (err) {
            setError('Failed to create test: ' + err.message);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create New Test</h2>
            
            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Test ID *</label>
                    <input
                        type="number"
                        name="testId"
                        value={formData.testId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="Enter unique numeric test ID"
                        min="1"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Enter a unique numeric ID for this test
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Skill *</label>
                    <input
                        type="text"
                        name="skill"
                        value={formData.skill}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="Enter skill name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Number of Questions *</label>
                    <input
                        type="number"
                        name="numQuestions"
                        value={formData.numQuestions}
                        onChange={handleChange}
                        min="1"
                        max="100"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (minutes) *</label>
                    <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        min="1"
                        max="120"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white"
                        style={{ background: colors.primary, boxShadow: '0 2px 8px rgba(20,184,166,0.10)' }}
                    >
                        Create Test
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminTestCreation; 