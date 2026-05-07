import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert,
  Tabs, Tab, Divider, Avatar
} from '@mui/material';
import {
  Schedule as ScheduleIcon, SwapHoriz, CheckCircle, Cancel,
  NotificationsActive, AssignmentTurnedIn
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const statusColor = {
  scheduled: 'primary',
  'in-progress': 'warning',
  completed: 'success',
  missed: 'error'
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const ShiftCard = ({ shift, onTransfer }) => {
  const isPast = new Date(shift.date) < new Date() && shift.status === 'scheduled';
  return (
    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">{formatDate(shift.date)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {shift.startTime} – {shift.endTime}
          </Typography>
          <Typography variant="caption" color="text.secondary">{shift.day}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          <Chip label={shift.status} color={statusColor[shift.status] || 'default'} size="small" />
          {shift.status === 'scheduled' && !isPast && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={() => onTransfer(shift)}
              sx={{ mt: 0.5 }}
            >
              Transfer
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const Schedule = () => {
  const [tab, setTab] = useState(0);
  const [shifts, setShifts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notification, setNotification] = useState('');
  const [responding, setResponding] = useState(null); // shiftId being responded to

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [toEmployeeId, setToEmployeeId] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [transferError, setTransferError] = useState('');

  const fetchShifts = useCallback(async () => {
    try {
      const data = await apiRequest('/schedules/my-shifts');
      if (data.success) setShifts(data.data || []);
    } catch {
      setError('Failed to load your schedule');
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    try {
      const data = await apiRequest('/shift-transfers/my-transfers');
      if (data.success) setTransfers(data.transfers || []);
    } catch { /* non-critical */ }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await apiRequest('/shift-transfers/eligible-employees');
      if (data.success) setEmployees(data.employees || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchShifts(), fetchTransfers(), fetchEmployees()]);
      setLoading(false);
    };
    load();
  }, [fetchShifts, fetchTransfers, fetchEmployees]);

  useEffect(() => {
    const onReminder = (e) => {
      setNotification(`Reminder: your shift starts in ~30 minutes at ${e.detail.startTime}`);
      setTimeout(() => setNotification(''), 10000);
    };
    const onIncoming = () => {
      fetchTransfers();
      setSuccess('You have a new shift transfer request!');
      setTimeout(() => setSuccess(''), 5000);
    };
    const onResult = (e) => {
      fetchShifts();
      fetchTransfers();
      const action = e.type === 'transferAccepted' ? 'accepted' : 'declined';
      setSuccess(`Your shift transfer was ${action}.`);
      setTimeout(() => setSuccess(''), 5000);
    };
    const onAssigned = () => {
      fetchShifts();
      setNotification('You have a new shift assignment! Go to Invitations to accept or decline.');
      setTimeout(() => setNotification(''), 12000);
      // Jump to invitations tab if not already there
      setTab(prev => prev === 0 ? 1 : prev);
    };

    window.addEventListener('shiftReminder', onReminder);
    window.addEventListener('transferIncoming', onIncoming);
    window.addEventListener('transferAccepted', onResult);
    window.addEventListener('transferDeclined', onResult);
    window.addEventListener('shiftAssigned', onAssigned);
    return () => {
      window.removeEventListener('shiftReminder', onReminder);
      window.removeEventListener('transferIncoming', onIncoming);
      window.removeEventListener('transferAccepted', onResult);
      window.removeEventListener('transferDeclined', onResult);
      window.removeEventListener('shiftAssigned', onAssigned);
    };
  }, [fetchShifts, fetchTransfers]);

  const respondToShift = async (shiftId, action) => {
    setResponding(shiftId);
    try {
      const data = await apiRequest(`/schedules/${shiftId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (data?.success) {
        setSuccess(
          action === 'accept'
            ? 'Shift accepted! It has been added to your schedule.'
            : 'Shift declined.'
        );
        fetchShifts();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data?.message || 'Action failed.');
      }
    } catch {
      setError('Failed to respond. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const openTransferDialog = (shift) => {
    setSelectedShift(shift);
    setToEmployeeId('');
    setTransferMessage('');
    setTransferError('');
    setTransferDialogOpen(true);
  };

  const closeTransferDialog = () => {
    setTransferDialogOpen(false);
    setSelectedShift(null);
  };

  const submitTransfer = async () => {
    if (!toEmployeeId) {
      setTransferError('Please select an employee to transfer to.');
      return;
    }
    setSubmitting(true);
    setTransferError('');
    try {
      const data = await apiRequest('/shift-transfers/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: selectedShift._id, toEmployeeId, message: transferMessage })
      });
      if (data.success) {
        setSuccess('Transfer request sent successfully.');
        closeTransferDialog();
        fetchTransfers();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setTransferError(data.message || 'Failed to send transfer request.');
      }
    } catch {
      setTransferError('Failed to send transfer request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const respondToTransfer = async (transferId, action) => {
    try {
      const data = await apiRequest(`/shift-transfers/${transferId}/${action}`, { method: 'PATCH' });
      if (data.success) {
        setSuccess(`Transfer ${action === 'accept' ? 'accepted' : 'declined'} successfully.`);
        fetchShifts();
        fetchTransfers();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.message || 'Action failed.');
      }
    } catch {
      setError('Action failed. Please try again.');
    }
  };

  // Split shifts into pending invitations vs accepted/active
  const pendingInvitations = shifts.filter(s => s.assignmentStatus === 'pending');
  const myShifts = shifts.filter(s => s.assignmentStatus !== 'pending' && s.assignmentStatus !== 'declined');
  const incomingTransfers = transfers.filter(t => t.toEmployeeId?._id && t.status === 'pending');
  const outgoingTransfers = transfers.filter(t => t.fromEmployeeId?._id && t.status !== undefined);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <ScheduleIcon sx={{ fontSize: 36, color: 'primary.main' }} />
        <Typography variant="h4">My Schedule</Typography>
        {pendingInvitations.length > 0 && (
          <Chip
            label={`${pendingInvitations.length} new shift invitation${pendingInvitations.length > 1 ? 's' : ''}`}
            color="warning"
            size="small"
          />
        )}
      </Box>

      {notification && (
        <Alert severity="info" icon={<NotificationsActive />} sx={{ mb: 2 }} onClose={() => setNotification('')}>
          {notification}
        </Alert>
      )}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="My Shifts" />
        <Tab
          label={pendingInvitations.length > 0
            ? `Invitations (${pendingInvitations.length})`
            : 'Invitations'}
          iconPosition="end"
        />
        <Tab label={`Transfer Requests${incomingTransfers.length > 0 ? ` (${incomingTransfers.length})` : ''}`} />
      </Tabs>

      {/* ── Tab 0: My Shifts ── */}
      {tab === 0 && (
        <Card>
          <CardContent>
            {myShifts.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No accepted shifts yet. Check the Invitations tab for pending assignments.
              </Typography>
            ) : (
              myShifts.map(shift => (
                <ShiftCard key={shift._id} shift={shift} onTransfer={openTransferDialog} />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 1: Invitations (pending shift assignments) ── */}
      {tab === 1 && (
        <Card>
          <CardContent>
            {pendingInvitations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AssignmentTurnedIn sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                <Typography color="text.secondary">
                  No pending shift invitations.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  When your admin assigns you a shift, it will appear here.
                </Typography>
              </Box>
            ) : (
              pendingInvitations.map(shift => (
                <Box key={shift._id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {formatDate(shift.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {shift.startTime} – {shift.endTime} &nbsp;·&nbsp; {shift.day}
                      </Typography>
                    </Box>
                    <Chip label="Pending your response" color="warning" size="small" />
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                    Your admin has assigned you this shift. Please accept or decline.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      disabled={responding === shift._id}
                      onClick={() => respondToShift(shift._id, 'accept')}
                    >
                      {responding === shift._id ? 'Processing…' : 'Accept'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      disabled={responding === shift._id}
                      onClick={() => respondToShift(shift._id, 'decline')}
                    >
                      Decline
                    </Button>
                  </Box>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Transfer Requests ── */}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>Incoming Requests</Typography>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              {incomingTransfers.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No pending transfer requests for you.
                </Typography>
              ) : (
                incomingTransfers.map(t => (
                  <Box key={t._id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {t.fromEmployeeId?.name?.charAt(0) || '?'}
                      </Avatar>
                      <Typography variant="subtitle2">
                        <strong>{t.fromEmployeeId?.name}</strong> wants you to take their shift
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {t.shiftId
                        ? `${formatDate(t.shiftId.date)} · ${t.shiftId.startTime} – ${t.shiftId.endTime}`
                        : 'Shift details unavailable'}
                    </Typography>
                    {t.message && (
                      <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                        "{t.message}"
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                      <Button
                        size="small" variant="contained" color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => respondToTransfer(t._id, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small" variant="outlined" color="error"
                        startIcon={<Cancel />}
                        onClick={() => respondToTransfer(t._id, 'decline')}
                      >
                        Decline
                      </Button>
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          <Typography variant="h6" sx={{ mb: 1 }}>My Requests</Typography>
          <Card>
            <CardContent>
              {outgoingTransfers.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  You have not sent any transfer requests.
                </Typography>
              ) : (
                outgoingTransfers.map(t => (
                  <Box key={t._id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2">
                          Transfer to <strong>{t.toEmployeeId?.name}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.shiftId
                            ? `${formatDate(t.shiftId.date)} · ${t.shiftId.startTime} – ${t.shiftId.endTime}`
                            : 'Shift details unavailable'}
                        </Typography>
                      </Box>
                      <Chip
                        label={t.status}
                        color={t.status === 'accepted' ? 'success' : t.status === 'declined' ? 'error' : 'warning'}
                        size="small"
                      />
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={closeTransferDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Shift</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selectedShift && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>{formatDate(selectedShift.date)}</strong> · {selectedShift.startTime} – {selectedShift.endTime}
            </Alert>
          )}
          {transferError && <Alert severity="error" sx={{ mb: 2 }}>{transferError}</Alert>}
          <TextField
            select fullWidth label="Transfer to employee" value={toEmployeeId}
            onChange={(e) => setToEmployeeId(e.target.value)} sx={{ mb: 2 }}
          >
            {employees.length === 0 && (
              <MenuItem disabled>No eligible employees found</MenuItem>
            )}
            {employees.map(emp => (
              <MenuItem key={emp._id} value={emp._id}>
                {emp.name} – {emp.position}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth multiline rows={2} label="Message (optional)"
            value={transferMessage} onChange={(e) => setTransferMessage(e.target.value)}
            placeholder="Explain why you need to transfer this shift..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeTransferDialog} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={submitTransfer} disabled={submitting} startIcon={<SwapHoriz />}>
            {submitting ? <CircularProgress size={20} /> : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Schedule;
