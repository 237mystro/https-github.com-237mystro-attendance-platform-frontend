import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Add, EventNote } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const leaveTypes = ['Annual Leave', 'Sick Leave', 'Emergency Leave', 'Unpaid Leave', 'Other'];
const emptyForm = { leaveType: '', startDate: '', endDate: '', reason: '' };

const statusChip = (status) => {
  const config = {
    pending: { color: 'warning', label: 'Pending' },
    approved: { color: 'success', label: 'Approved' },
    denied: { color: 'error', label: 'Denied' }
  }[status] || { color: 'default', label: status };

  return <Chip label={config.label} color={config.color} size="small" />;
};

const dayCount = (start, end) => {
  if (!start || !end) return '-';
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24) + 1;
  return diff > 0 ? `${diff} day${diff > 1 ? 's' : ''}` : '-';
};

const LeaveRequest = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/leave/my-requests');
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setError(data.message || 'Failed to load leave requests');
      }
    } catch {
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpen = () => {
    setForm(emptyForm);
    setFormError('');
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setFormError('');
  };

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason.trim()) {
      setFormError('All fields are required.');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setFormError('End date cannot be before start date.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const data = await apiRequest('/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (data.success) {
        setSuccess('Leave request submitted successfully.');
        handleClose();
        fetchRequests();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setFormError(data.message || 'Submission failed.');
      }
    } catch {
      setFormError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventNote sx={{ fontSize: 34, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={800}>Leave Requests</Typography>
            <Typography color="text.secondary">Track your submissions and request new time off from any device.</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
          New Request
        </Button>
      </Stack>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : requests.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No leave requests yet. Tap "New Request" to submit one.
            </Typography>
          ) : (
            <>
              <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.5 }}>
                {requests.map((request) => (
                  <Card key={request._id} variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                          <Typography fontWeight={700}>{request.leaveType}</Typography>
                          {statusChip(request.status)}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2"><strong>Duration:</strong> {dayCount(request.startDate, request.endDate)}</Typography>
                        <Typography variant="body2"><strong>Reason:</strong> {request.reason}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Admin Note:</strong> {request.adminNote || '-'}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Admin Note</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell>{request.leaveType}</TableCell>
                        <TableCell>{new Date(request.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(request.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>{dayCount(request.startDate, request.endDate)}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" noWrap title={request.reason}>{request.reason}</Typography>
                        </TableCell>
                        <TableCell>{statusChip(request.status)}</TableCell>
                        <TableCell>{request.adminNote || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Leave Request</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              label="Leave Type"
              name="leaveType"
              value={form.leaveType}
              onChange={handleChange}
            >
              {leaveTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Reason"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="Briefly describe the reason for your leave request"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveRequest;
