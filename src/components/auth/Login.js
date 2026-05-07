import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';
import AuthLayout from './AuthLayout';

const Login = () => {
  const [email, setEmail] = useState(() => window.localStorage.getItem('autopayroll-last-email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = await apiRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        auth: false,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim()
        })
      });

      if (!data.success) {
        setError(data.message || 'Invalid email or password.');
        return;
      }

      setSession(data.token, data.user);

      if (rememberMe) {
        window.localStorage.setItem('autopayroll-last-email', email.trim().toLowerCase());
      } else {
        window.localStorage.removeItem('autopayroll-last-email');
      }

      const role = data.user?.role;
      if (role === 'employee') navigate('/employee/dashboard');
      else if (role === 'branch_manager' || role === 'branch_hr') navigate('/branch/dashboard');
      else navigate('/admin/dashboard');
    } catch (err) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
        setError('Cannot connect to the server right now. Please confirm the backend is running.');
      } else {
        setError(err.message || 'Unable to sign in right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome Back"
      title="Sign in to your AutoPayroll workspace."
      subtitle="Access attendance, payroll, announcements, and employee operations from one polished dashboard."
    >
      <Stack spacing={2.25} component="form" onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Work email"
          fullWidth
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <TextField
          label="Password"
          type="password"
          fullWidth
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            flexDirection: { xs: 'column', sm: 'row' }
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
            }
            label="Remember my email"
          />

          <Typography
            component={Link}
            to="/forgot-password"
            sx={{
              color: '#246bce',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 14
            }}
          >
            Forgot password?
          </Typography>
        </Box>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={{
            py: 1.45,
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 700,
            background: 'linear-gradient(135deg,#0f4c81,#246bce)',
            boxShadow: '0 14px 30px rgba(36,107,206,0.24)'
          }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
        </Button>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: '#eff6ff',
            border: '1px solid rgba(36,107,206,0.1)'
          }}
        >
          <Typography sx={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>
            New business?
          </Typography>
          <Typography sx={{ color: '#475569', fontSize: 14, mt: 0.5, mb: 1.25 }}>
            Create your company workspace and start onboarding employees in minutes.
          </Typography>
          <Typography
            component={Link}
            to="/register"
            sx={{
              color: '#246bce',
              textDecoration: 'none',
              fontWeight: 700
            }}
          >
            Create an account
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
};

export default Login;
