// src/components/admin/EmployeeOnboarding.js
import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const EmployeeOnboarding = ({ onEmployeeCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !phone || !momoNumber || !position) {
      setError('Please fill in all required fields');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    const phoneRegex = /^\+?[0-9]{8,15}$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid phone number');
      return;
    }

    if (!phoneRegex.test(momoNumber)) {
      setError('Please enter a valid mobile money number');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const data = await apiRequest('/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, momoNumber, position, department })
      });

      if (data.success) {
        const tempPassword = data.data?.temporaryPassword;
        setCredentials({ email, password: tempPassword });

        setName('');
        setEmail('');
        setPhone('');
        setMomoNumber('');
        setPosition('');
        setDepartment('');

        if (onEmployeeCreated) {
          onEmployeeCreated(data);
        }
      } else {
        setError(data.message || 'Failed to create employee account');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
      console.error('Employee creation error:', err);
    }

    setLoading(false);
  };

  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ mt: 4, p: 4 }}>
        <Typography component="h1" variant="h5" align="center" sx={{ mb: 3 }}>
          Add New Employee
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Create an account for your employee
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Employee Full Name"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!error && !name}
            helperText={!!error && !name ? 'Name is required' : ''}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Employee Email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!error && (!email || !/\S+@\S+\.\S+/.test(email))}
            helperText={
              !!error && !email ? 'Email is required' :
              !!error && !/\S+@\S+\.\S+/.test(email) ? 'Please enter a valid email' : ''
            }
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Phone Number"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={!!error && !phone}
            helperText={!!error && !phone ? 'Phone number is required' : ''}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Mobile Money Number"
            name="momo"
            value={momoNumber}
            onChange={(e) => setMomoNumber(e.target.value)}
            error={!!error && !momoNumber}
            helperText={!!error && !momoNumber ? 'Mobile money number is required' : ''}
          />

          <TextField
            margin="normal"
            fullWidth
            label="Department"
            name="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel id="position-label">Position</InputLabel>
            <Select
              labelId="position-label"
              value={position}
              label="Position"
              onChange={(e) => setPosition(e.target.value)}
              error={!!error && !position}
            >
              <MenuItem value="cashier">Cashier</MenuItem>
              <MenuItem value="supervisor">Supervisor</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="clerk">Clerk</MenuItem>
              <MenuItem value="technician">Technician</MenuItem>
              <MenuItem value="intern">Intern</MenuItem>
            </Select>
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Add Employee'}
          </Button>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> A temporary password will be generated. Share the credentials with the employee — they must change the password on first login.
            </Typography>
          </Alert>
        </Box>
      </Paper>

      {/* Credentials dialog shown after successful creation */}
      <Dialog open={!!credentials} onClose={() => setCredentials(null)}>
        <DialogTitle>Employee Created Successfully</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Share these login credentials with the employee:
          </Alert>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
            <Typography variant="body1"><strong>Email:</strong> {credentials?.email}</Typography>
            <Typography variant="body1"><strong>Temporary Password:</strong> {credentials?.password || '(check server logs)'}</Typography>
          </Box>
          <Button
            startIcon={<ContentCopy />}
            onClick={() => copyToClipboard(`Email: ${credentials?.email}\nTemporary Password: ${credentials?.password}`)}
            variant="outlined"
            fullWidth
          >
            Copy Credentials
          </Button>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Employee must change this password on first login.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCredentials(null)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeeOnboarding;
