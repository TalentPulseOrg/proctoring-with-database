import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../styles/theme';

const SelectRole = () => {
  const [selectedRole, setSelectedRole] = useState('candidate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, register } = useAuth();
  const navigate = useNavigate();

  // If user already has a role, redirect them
  React.useEffect(() => {
    if (user && user.role) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'candidate') {
        navigate('/candidate');
      }
    }
  }, [user, navigate]);

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user || !user.email || !user.name) {
        throw new Error('User information is missing');
      }

      // Update user with selected role
      const userData = {
        name: user.name,
        email: user.email,
        role: selectedRole
      };

      const result = await register(userData);
      
      if (!result) {
        setError('Failed to update role. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.sidebarBg, fontFamily: fonts.main }} className="flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 mt-16">
        <div className="flex justify-center mb-6">
          <span className="text-3xl font-bold text-teal-600">Talent</span>
          <span className="text-3xl font-bold text-gray-700 ml-2">Pulse</span>
        </div>
        <h1 className="text-2xl font-bold mb-6 text-center">Select Your Role</h1>
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-2 text-center">{error}</div>
        )}
        <p className="mb-4 text-gray-700 text-center">Please select your role in the system. This will determine the features available to you.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="candidate"
                checked={selectedRole === 'candidate'}
                onChange={handleRoleChange}
                className="accent-teal-500"
              />
              <span className="font-medium">Candidate - Take tests and be proctored</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={selectedRole === 'admin'}
                onChange={handleRoleChange}
                className="accent-teal-500"
              />
              <span className="font-medium">Admin - Create and manage tests, view results</span>
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-teal-500 text-white py-2 rounded hover:bg-teal-600 transition-colors font-semibold"
            disabled={loading}
          >
            {loading ? 'Continuing...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SelectRole; 