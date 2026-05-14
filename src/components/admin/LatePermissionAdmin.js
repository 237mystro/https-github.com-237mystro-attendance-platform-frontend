import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Stack, Tab, Tabs, TextField, Typography
} from '@mui/material';
import {
  AccessTime, CheckCircle, Cancel, HourglassEmpty,
  Person, Schedule, NotificationsActive
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const STATUS_CONFIG = {
  pending:            { label: 'Pending',         color: 'warning' },
  approved_extension: { label: '+Extension',       color: 'success' },
  approved_full:      { label: 'Full Exemption',   color: 'success' },
  denied:             { label: 'Denied',           color: 'error'   }
};

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const isToday = (dateStr) => {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

const LatePermissionAdmin = () => {
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState(0); // 0 = Pending, 1 = All
  const [alert, setAlert]           = useState(null);

  // Review dialog state
  const [reviewing, setReviewing]       = useState(null); // the request object
  const [decision, setDecision]         = useState('approved_full'); // approval type
  const [extraMins, setExtraMins]       = useState(15);
  const [adminNote, setAdminNote]       = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await apiRequest('/late-permissions/admin');
      if (data?.success) setRequests(data.data || []);
    } catch (err) {
      setAlert({ severity: 'error', message: err.message || 'Failed to load requests.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Real-time: new request arrives
  useEffect(() => {
    const handler = () => fetchRequests();
    window.addEventListener('latePermissionNew', handler);
    return () => window.removeEventListener('latePermissionNew', handler);
  }, [fetchRequests]);

  const openReview = (req) => {
    setReviewing(req);
    setDecision('approved_full');
    setExtraMins(15);
    setAdminNote('');
  };

  const handleReview = async () => {
    if (!reviewing) return;
    if (decision === 'approved_extension' && (extraMins < 1 || extraMins > 480)) {
      setAlert({ severity: 'error', message: 'Extra minutes must be between 1 and 480.' });
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiRequest(`/late-permissions/${reviewing._id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision,
          extraMinutes: decision === 'approved_extension' ? extraMins : 0,
          adminNote: adminNote.trim()
        })
      });
      if (data?.success) {
        setRequests(prev => prev.map(r => r._id === reviewing._id ? data.data : r));
        setAlert({ severity: 'success', message: `Request for ${reviewing.employeeId?.name || 'employee'} has been ${decision === 'denied' ? 'denied' : 'approved'}.` });
        setReviewing(null);
      } else {
        setAlert({ severity: 'error', message: data?.message || 'Failed to review request.' });
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.message || 'Failed to review request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const pending = requests.filter(r => r.status === 'pending');
  const displayed = tab === 0 ? pending : requests;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860, mx: 'auto' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <AccessTime sx={{ fontSize: 32, color: 'warning.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Late Arrival Requests</Typography>
          <Typography variant="body2" color="text.secondary">
            Review and respond to employee requests to arrive late.
          </Typography>
        </Box>
        {pending.length > 0 && (
          <Chip
            icon={<NotificationsActive sx={{ fontSize: 16 }} />}
            label={`${pending.length} pending`}
            color="warning"
            size="small"
            sx={{ ml: 'auto' }}
          />
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {alert && (
        <Alert severity={alert.severity} onClose={() => setAlert(null)} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`Pending${pending.length > 0 ? ` (${pending.length})` : ''}`} />
        <Tab label={`All Requests (${requests.length})`} />
      </Tabs>

      {/* Request cards */}
      {displayed.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <HourglassEmpty sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {tab === 0 ? 'No pending late requests.' : 'No requests found.'}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {displayed.map(req => (
            <Card key={req._id} variant="outlined"
              sx={{ borderColor: req.status === 'pending' ? 'warning.light' : 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* Employee + date row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        {req.employeeId?.name || 'Unknown Employee'}
                      </Typography>
                      {req.employeeId?.position && (
                        <Typography variant="caption" color="text.secondary">({req.employeeId.position})</Typography>
                      )}
                      <Chip size="small" label={isToday(req.date) ? 'Today' : fmtDate(req.date)}
                        variant="outlined" sx={{ fontSize: 11 }} />
                    </Box>

                    {/* Reason */}
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Reason:</strong> {req.reason}
                    </Typography>

                    {/* Estimated arrival */}
                    {req.estimatedArrival && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Schedule sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Estimated arrival: <strong>{req.estimatedArrival}</strong>
                        </Typography>
                      </Box>
                    )}

                    {/* Submitted time */}
                    <Typography variant="caption" color="text.disabled">
                      Submitted {fmtTime(req.createdAt)}
                    </Typography>

                    {/* Show outcome for reviewed requests */}
                    {req.status !== 'pending' && (
                      <Alert
                        severity={req.status === 'denied' ? 'error' : 'success'}
                        sx={{ mt: 1, py: 0.5 }}
                      >
                        {req.status === 'approved_full' && 'Full exemption — no late penalty.'}
                        {req.status === 'approved_extension' && `+${req.extraMinutes} min extension granted.`}
                        {req.status === 'denied' && 'Request denied — normal rules apply.'}
                        {req.adminNote && <em> "{req.adminNote}"</em>}
                      </Alert>
                    )}
                  </Box>

                  {/* Status chip + action button */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                    <Chip
                      size="small"
                      label={STATUS_CONFIG[req.status]?.label}
                      color={STATUS_CONFIG[req.status]?.color}
                    />
                    {req.status === 'pending' && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => openReview(req)}
                        sx={{ fontWeight: 700 }}
                      >
                        Review
                      </Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* ── Review dialog ── */}
      <Dialog open={Boolean(reviewing)} onClose={() => !submitting && setReviewing(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime color="warning" />
          Review Late Request — {reviewing?.employeeId?.name}
        </DialogTitle>
        <DialogContent>
          {reviewing && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Reason:</strong> {reviewing.reason}
                {reviewing.estimatedArrival && (
                  <Box component="span"> · <strong>Est. arrival:</strong> {reviewing.estimatedArrival}</Box>
                )}
              </Alert>

              {/* Decision buttons */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Your Decision</Typography>
              <Stack spacing={1.5}>

                {/* Full exemption */}
                <Card
                  variant="outlined"
                  onClick={() => setDecision('approved_full')}
                  sx={{
                    cursor: 'pointer',
                    borderColor: decision === 'approved_full' ? 'success.main' : 'divider',
                    borderWidth: decision === 'approved_full' ? 2 : 1,
                    bgcolor: decision === 'approved_full' ? 'success.50' : 'transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle color={decision === 'approved_full' ? 'success' : 'disabled'} />
                      <Box>
                        <Typography variant="body2" fontWeight={700}>Approve — Full Exemption</Typography>
                        <Typography variant="caption" color="text.secondary">
                          No late deduction at all today, regardless of when they arrive.
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Extension */}
                <Card
                  variant="outlined"
                  onClick={() => setDecision('approved_extension')}
                  sx={{
                    cursor: 'pointer',
                    borderColor: decision === 'approved_extension' ? 'primary.main' : 'divider',
                    borderWidth: decision === 'approved_extension' ? 2 : 1,
                    transition: 'all 0.15s'
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <AccessTime color={decision === 'approved_extension' ? 'primary' : 'disabled'} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>Approve with Extension</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Add extra minutes to their grace period before marking them late.
                        </Typography>
                      </Box>
                      {decision === 'approved_extension' && (
                        <TextField
                          type="number"
                          size="small"
                          label="Extra minutes"
                          value={extraMins}
                          onChange={e => setExtraMins(Math.max(1, Math.min(480, Number(e.target.value))))}
                          inputProps={{ min: 1, max: 480 }}
                          onClick={e => e.stopPropagation()}
                          sx={{ width: 140 }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Deny */}
                <Card
                  variant="outlined"
                  onClick={() => setDecision('denied')}
                  sx={{
                    cursor: 'pointer',
                    borderColor: decision === 'denied' ? 'error.main' : 'divider',
                    borderWidth: decision === 'denied' ? 2 : 1,
                    transition: 'all 0.15s'
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Cancel color={decision === 'denied' ? 'error' : 'disabled'} />
                      <Box>
                        <Typography variant="body2" fontWeight={700}>Deny</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Standard late rules apply. Employee will be marked late if they miss the buffer.
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>

              {/* Optional note to employee */}
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Note to employee (optional)"
                placeholder="e.g. Please try to be on time next week."
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                inputProps={{ maxLength: 300 }}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setReviewing(null)} color="inherit" disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            color={decision === 'denied' ? 'error' : 'success'}
            onClick={handleReview}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {submitting ? 'Sending…' : decision === 'denied' ? 'Deny Request' : 'Approve & Notify'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LatePermissionAdmin;
