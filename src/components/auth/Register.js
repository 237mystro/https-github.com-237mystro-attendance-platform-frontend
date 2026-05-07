import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Business,
  EmailOutlined,
  LockOutlined,
  PersonOutlined,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';
import AuthLayout from './AuthLayout';

const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score: (score / 5) * 100, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score: (score / 5) * 100, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score: (score / 5) * 100, label: 'Good', color: '#eab308' };
  return { score: (score / 5) * 100, label: 'Strong', color: '#22c55e' };
};

const Register = () => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const strength = getPasswordStrength(password);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !company.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please complete every field before creating your workspace.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid business email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreeToTerms) {
      setError('Please accept the terms to continue.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = await apiRequest('/auth/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        auth: false,
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          email: email.trim().toLowerCase(),
          password
        })
      });

      if (!data.success) {
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }

      setSession(data.token, data.user);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to create your account right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Launch Your Workspace"
      title="Create a modern payroll hub for your team."
      subtitle="Set up your company account, unlock live attendance, and manage payroll — all in one place."
    >
      <Stack spacing={2} component="form" onSubmit={handleSubmit}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2.5 }}>
            {error}
          </Alert>
        )}

        {/* Account section */}
        <Box>
          <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
            About You
          </Typography>
          <Stack spacing={1.75}>
            <TextField
              label="Full name"
              fullWidth
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlined sx={{ fontSize: 20, color: '#94a3b8' }} />
                  </InputAdornment>
                )
              }}
            />

            <TextField
              label="Company name"
              fullWidth
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business sx={{ fontSize: 20, color: '#94a3b8' }} />
                  </InputAdornment>
                )
              }}
            />

            <TextField
              label="Business email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined sx={{ fontSize: 20, color: '#94a3b8' }} />
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </Box>

        {/* Security section */}
        <Box>
          <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
            Security
          </Typography>
          <Stack spacing={1.75}>
            <Box>
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ fontSize: 20, color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
                        <IconButton edge="end" onClick={() => setShowPassword(v => !v)} size="small">
                          {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
              {password && (
                <Box sx={{ mt: 1, px: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={strength.score}
                      sx={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'rgba(15,23,42,0.08)',
                        '& .MuiLinearProgress-bar': { bgcolor: strength.color, borderRadius: 2 }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600, minWidth: 44 }}>
                      {strength.label}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <TextField
              label="Confirm password"
              type={showConfirm ? 'text' : 'password'}
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword.length > 0 && password !== confirmPassword}
              helperText={confirmPassword.length > 0 && password !== confirmPassword ? "Passwords don't match" : ''}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ fontSize: 20, color: '#94a3b8' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showConfirm ? 'Hide password' : 'Show password'}>
                      <IconButton edge="end" onClick={() => setShowConfirm(v => !v)} size="small">
                        {showConfirm ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.2)'
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                size="small"
                sx={{ color: '#f59e0b', '&.Mui-checked': { color: '#f59e0b' } }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#78350f', lineHeight: 1.5 }}>
                I confirm this workspace is for my company and I agree to the platform terms of service.
              </Typography>
            }
            sx={{ alignItems: 'flex-start', m: 0 }}
          />
        </Box>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={{
            py: 1.5,
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 15,
            background: 'linear-gradient(135deg,#0f4c81,#246bce)',
            boxShadow: '0 14px 30px rgba(36,107,206,0.28)',
            '&:hover': {
              background: 'linear-gradient(135deg,#0a3a68,#1a5ab8)',
              boxShadow: '0 18px 36px rgba(36,107,206,0.36)'
            }
          }}
        >
          {loading
            ? <CircularProgress size={22} color="inherit" />
            : 'Create Business Account'}
        </Button>

        <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center' }}>
          Already have an account?{' '}
          <Typography
            component={Link}
            to="/login"
            sx={{ color: '#246bce', textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
          >
            Sign in
          </Typography>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Register;
