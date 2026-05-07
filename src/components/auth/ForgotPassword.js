import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { EmailOutlined, KeyOutlined, LockResetOutlined } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';
import AuthLayout from './AuthLayout';

const initialForm = {
  email: '',
  otp: '',
  password: '',
  confirmPassword: ''
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState('request');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const requestOtp = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.email.trim()) {
      setError('Enter the email address linked to your account.');
      return;
    }

    try {
      setLoading(true);
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim() })
      });

      setSuccess(data.message || 'If the email exists, a reset code has been sent.');
      setStep('reset');
    } catch (err) {
      setError(err.message || 'Unable to send reset code right now.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.otp.trim() || !form.password || !form.confirmPassword) {
      setError('Enter the OTP and your new password.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const data = await apiRequest('/auth/reset-password', {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          otp: form.otp.trim(),
          password: form.password
        })
      });

      setSuccess(data.message || 'Password reset successful. You can now sign in.');
      setForm((prev) => ({ ...prev, otp: '', password: '', confirmPassword: '' }));
      setStep('done');
      window.setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Recovery"
      title="Reset your password securely."
      subtitle="Request a one-time code by email, then choose a new password right here."
      sideNote="Password recovery now uses email OTP verification so employees and admins can regain access without manual intervention."
    >
      <Stack spacing={2.25} component="form" onSubmit={step === 'request' ? requestOtp : resetPassword}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <TextField
          label="Email address"
          value={form.email}
          onChange={handleChange('email')}
          fullWidth
          type="email"
          disabled={step !== 'request'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlined sx={{ color: '#64748b' }} />
              </InputAdornment>
            )
          }}
        />

        {step !== 'request' && (
          <>
            <TextField
              label="6-digit OTP"
              value={form.otp}
              onChange={handleChange('otp')}
              fullWidth
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyOutlined sx={{ color: '#64748b' }} />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="New password"
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockResetOutlined sx={{ color: '#64748b' }} />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Confirm new password"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              fullWidth
            />
          </>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || step === 'done'}
          sx={{
            py: 1.45,
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 700,
            background: 'linear-gradient(135deg,#0f4c81,#246bce)',
            boxShadow: '0 14px 30px rgba(36,107,206,0.24)'
          }}
        >
          {loading ? (
            <CircularProgress size={22} color="inherit" />
          ) : step === 'request' ? (
            'Send OTP'
          ) : step === 'done' ? (
            'Password Updated'
          ) : (
            'Reset Password'
          )}
        </Button>

        {step === 'reset' && (
          <Button
            variant="text"
            disabled={loading}
            onClick={() => {
              setStep('request');
              setSuccess('');
            }}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
          >
            Use another email
          </Button>
        )}

        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Remembered it?{' '}
            <Typography
              component={Link}
              to="/login"
              sx={{
                color: '#246bce',
                textDecoration: 'none',
                fontWeight: 700
              }}
            >
              Back to sign in
            </Typography>
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
};

export default ForgotPassword;
