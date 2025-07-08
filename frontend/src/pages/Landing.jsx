import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Divider
} from '@mui/material';
import { colors, fonts } from '../styles/theme';

const Landing = () => {
  const { login, register, loading, error } = useAuth();
  const [tab, setTab] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'candidate'
  });
  const [formError, setFormError] = useState('');

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setFormError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.email) {
      setFormError('Email is required');
      return;
    }

    try {
      const result = await login(formData.email);
      if (!result) {
        setFormError('Login failed. Please check your email or register if you don\'t have an account.');
      }
    } catch (err) {
      setFormError('Login failed. Please try again.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate form
    if (!formData.name) {
      setFormError('Name is required');
      return;
    }
    if (!formData.email) {
      setFormError('Email is required');
      return;
    }
    if (!formData.role) {
      setFormError('Role is required');
      return;
    }

    try {
      const result = await register(formData);
      if (!result) {
        setFormError('Registration failed. Please try again or use a different email.');
      }
    } catch (err) {
      setFormError('Registration failed. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: fonts.main }}>
      {/* Teal curve at the top, facing downwards, with shadow */}
      <svg
        viewBox="0 0 1440 320"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '320px',
          zIndex: 0,
          filter: 'drop-shadow(0 8px 16px rgba(20,184,166,0.25))'
        }}
        preserveAspectRatio="none"
      >
        <path
          fill={colors.primary}
          fillOpacity="1"
          d="M0,64L60,80C120,96,240,128,360,133.3C480,139,600,117,720,117.3C840,117,960,139,1080,154.7C1200,171,1320,181,1380,186.7L1440,192L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
        ></path>
      </svg>
      {/* Centered card and form (logic unchanged) */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 mt-16">
          <div className="flex justify-center mb-6">
            <span className="text-3xl font-bold text-teal-600">Talent</span>
            <span className="text-3xl font-bold text-gray-700 ml-2">Pulse</span>
          </div>
          <div className="flex justify-center mb-6">
            <button
              className={`px-6 py-2 rounded-t-lg font-semibold transition-colors duration-200 ${tab === 0 ? 'bg-teal-500 text-white' : 'bg-gray-100 text-teal-700'}`}
              onClick={() => setTab(0)}
            >
              Login
            </button>
            <button
              className={`px-6 py-2 rounded-t-lg font-semibold transition-colors duration-200 ml-2 ${tab === 1 ? 'bg-teal-500 text-white' : 'bg-gray-100 text-teal-700'}`}
              onClick={() => setTab(1)}
            >
              Register
            </button>
          </div>
          <div className="p-2">
            {error && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-2 text-center">{error}</div>
            )}
            {formError && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-2 text-center">{formError}</div>
            )}
            {tab === 0 ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full bg-teal-500 text-white py-2 rounded hover:bg-teal-600 transition-colors font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                  autoFocus
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="candidate">Candidate</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  className="w-full bg-teal-500 text-white py-2 rounded hover:bg-teal-600 transition-colors font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
