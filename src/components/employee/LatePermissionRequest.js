import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogContent, DialogTitle, Divider, Stack,
  TextField, Typography
} from '@mui/material';
import {
  AccessTime, CheckCircle, Cancel, HourglassEmpty,
  Send, History
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const STATUS_CONFIG = {
  pending:            { label: 'Pending Review',        color: 'warning', icon: <HourglassEmpty fontSize="small" /> },
  approved_extension: { label: 'Approved with Extension', color: 'success', icon: <CheckCircle fontSize="small" /> },
  approved_full:      { label: 'Fully Approved',         color: 'success', icon: <CheckCircle fontSize="small" /> },
  denied:             { label: 'Denied',                 color: 'error',   icon: <Cancel fontSize="small" /> }
};

const isToday = (dateStr) => {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const LatePermissionRequest = () => {
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [reason, setReason]             = useState('');
  const [estArrival, setEstArrival]     = useState('');
  const [notification, setNotification] = useState(null); // socket notification dialog

  const fetchRequests = useCallback(async () => {
    try {
      const data = await apiRequest('/late-permissions/my');
      if (data?.success) setRequests(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Listen for socket decision notification
  useEffect(() => {
    const handler = (e) => {
      setNotification(e.detail);
      // Refresh requests to get the latest status
      fetchRequests();
    };
    window.addEventListener('latePermissionReviewed', handler);
    return () => window.removeEventListener('latePermissionReviewed', handler);
  }, [fetchRequests]);

  const todayRequest = requests.find(r => isToday(r.date));
  const history      = requests.filter(r => !isToday(r.date));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { setError('Please describe why you will be late.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const data = await apiRequest('/late-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim(), estimatedArrival: estArrival || undefined })
      });
      if (data?.success) {
        setSuccess('Your request has been sent to your manager.');
        setReason('');
        setEstArrival('');
        fetchRequests();
      } else {
        setError(data?.message || 'Failed to submit request.');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const notifBody = () => {
    if (!notification) return '';
    const { status, extraMinutes, adminNote } = notification;
    if (status === 'approved_full')      return `Your late request was fully approved — no late penalty today.${adminNote ? ` Note: "${adminNote}"` : ''}`;
    if (status === 'approved_extension') return `Approved with +${extraMinutes} extra minute${extraMinutes !== 1 ? 's' : ''} added to your buffer.${adminNote ? ` Note: "${adminNote}"` : ''}`;
    return `Your late request was denied.${adminNote ? ` Reason: "${adminNote}"` : ' Normal attendance rules apply.'}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 640, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <AccessTime sx={{ fontSize: 32, color: 'warning.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Late Arrival Request</Typography>
          <Typography variant="body2" color="text.secondary">
            Let your manager know in advance if you will be arriving late today.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ── Today's status ── */}
      {todayRequest ? (
        <Card sx={{ mb: 3, border: '1px solid', borderColor: todayRequest.status === 'denied' ? 'error.light' : todayRequest.status === 'pending' ? 'warning.light' : 'success.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>Today's Request</Typography>
              <Chip
                size="small"
                icon={STATUS_CONFIG[todayRequest.status]?.icon}
                label={STATUS_CONFIG[todayRequest.status]?.label}
                color={STATUS_CONFIG[todayRequest.status]?.color}
              />
            </Box>

            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Reason:</strong> {todayRequest.reason}
            </Typography>
            {todayRequest.estimatedArrival && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Estimated arrival:</strong> {todayRequest.estimatedArrival}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled">
              Submitted at {fmtTime(todayRequest.createdAt)}
            </Typography>

            {todayRequest.status !== 'pending' && (
              <Alert
                severity={todayRequest.status === 'denied' ? 'error' : 'success'}
                sx={{ mt: 1.5 }}
              >
                {todayRequest.status === 'approved_full' && (
                  <>No late penalty will be applied today. You may arrive late without a deduction.</>
                )}
                {todayRequest.status === 'approved_extension' && (
                  <>You have been granted <strong>+{todayRequest.extraMinutes} extra minute{todayRequest.extraMinutes !== 1 ? 's' : ''}</strong> beyond your standard buffer before the late deduction kicks in.</>
                )}
                {todayRequest.status === 'denied' && (
                  <>Your request was denied. Normal attendance rules apply today.</>
                )}
                {todayRequest.adminNote && (
                  <Box sx={{ mt: 0.5 }}>
                    <em>Manager note: "{todayRequest.adminNote}"</em>
                  </Box>
                )}
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ── Submission form ── */
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
              Request Late Arrival for Today
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your manager will review your request and decide whether to grant extra time or a full exemption.
            </Typography>

            {error  && <Alert severity="error"   onClose={() => setError('')}   sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  label="Reason for being late *"
                  placeholder="e.g. Heavy traffic on the main road, medical appointment running over…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  inputProps={{ maxLength: 500 }}
                  helperText={`${reason.length}/500`}
                />
                <TextField
                  fullWidth
                  type="time"
                  label="Estimated arrival time (optional)"
                  value={estArrival}
                  onChange={e => setEstArrival(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
                sx={{ mt: 3, py: 1.5, fontWeight: 700 }}
              >
                {submitting ? 'Sending…' : 'Send Late Request'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Request history ── */}
      {history.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <History sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">Past Requests</Typography>
          </Box>
          <Stack spacing={1.5}>
            {history.map(r => (
              <Card key={r._id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{fmtDate(r.date)}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>{r.reason}</Typography>
                      {r.status === 'approved_extension' && (
                        <Typography variant="caption" color="success.main">+{r.extraMinutes} min extension granted</Typography>
                      )}
                      {r.adminNote && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Note: {r.adminNote}</Typography>
                      )}
                    </Box>
                    <Chip
                      size="small"
                      label={STATUS_CONFIG[r.status]?.label}
                      color={STATUS_CONFIG[r.status]?.color}
                      icon={STATUS_CONFIG[r.status]?.icon}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {/* ── Decision notification dialog ── */}
      <Dialog open={Boolean(notification)} onClose={() => setNotification(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {notification?.status === 'denied'
            ? <Cancel color="error" />
            : <CheckCircle color="success" />}
          Late Request Decision
        </DialogTitle>
        <DialogContent>
          <Alert severity={notification?.status === 'denied' ? 'error' : 'success'} sx={{ mb: 2 }}>
            {notifBody()}
          </Alert>
          <Button variant="contained" fullWidth onClick={() => setNotification(null)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LatePermissionRequest;
