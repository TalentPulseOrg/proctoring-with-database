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
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Proctoring & Test System
        </Typography>
        
        <Paper sx={{ width: '100%', mt: 3 }}>
          <Tabs 
            value={tab} 
            onChange={handleTabChange} 
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>
          
          <Box sx={{ p: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            
            {tab === 0 ? (
              // Login Form
              <Box component="form" onSubmit={handleLogin} noValidate>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={handleChange}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Sign In'}
                </Button>
              </Box>
            ) : (
              // Register Form
              <Box component="form" onSubmit={handleRegister} noValidate>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="name"
                  label="Full Name"
                  name="name"
                  autoComplete="name"
                  autoFocus
                  value={formData.name}
                  onChange={handleChange}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select
                    labelId="role-label"
                    id="role"
                    name="role"
                    value={formData.role}
                    label="Role"
                    onChange={handleChange}
                  >
                    <MenuItem value="candidate">Candidate</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Register'}
                </Button>
              </Box>
            )}
            
            <Divider sx={{ my: 3 }}>OR</Divider>
            
            {/* Direct Test Access Section */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" gutterBottom>
                Have a test ID? Access your test directly:
              </Typography>
              <Button
                component={Link}
                to="/test-registration"
                variant="outlined"
                fullWidth
                sx={{ mt: 1 }}
              >
                Take a Test
              </Button>
              
              {/* API Test Page Link */}
              <Button
                component={Link}
                to="/api-test"
                variant="outlined"
                color="secondary"
                fullWidth
                sx={{ mt: 2 }}
              >
                API Test Page
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Landing;
