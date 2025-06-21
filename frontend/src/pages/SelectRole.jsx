import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress
} from '@mui/material';

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
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Select Your Role
        </Typography>
        
        <Paper sx={{ width: '100%', mt: 3, p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Typography variant="body1" paragraph>
            Please select your role in the system. This will determine the features available to you.
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
              <RadioGroup
                aria-label="role"
                name="role"
                value={selectedRole}
                onChange={handleRoleChange}
              >
                <FormControlLabel 
                  value="candidate" 
                  control={<Radio />} 
                  label="Candidate - Take tests and be proctored" 
                />
                <FormControlLabel 
                  value="admin" 
                  control={<Radio />} 
                  label="Admin - Create and manage tests, view results" 
                />
              </RadioGroup>
            </FormControl>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Continue'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default SelectRole; 