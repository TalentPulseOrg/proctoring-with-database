import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, logoutUser, getCurrentUser } from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in on mount
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const userData = getCurrentUser();
      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
      setError('Authentication session expired. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await loginUser(email);
      
      if (response.error) {
        setError(response.message);
        return null;
      }
      
      const userData = response.user;
      setUser(userData);
      
      // Redirect based on role
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'candidate') {
        navigate('/candidate');
      }
      
      return userData;
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await registerUser(userData);
      
      if (response.error) {
        setError(response.message);
        return null;
      }
      
      // Automatically log in after successful registration
      return login(userData.email);
    } catch (err) {
      console.error('Registration error:', err);
      setError('Registration failed. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      logoutUser();
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Logout failed. Please try again.');
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 