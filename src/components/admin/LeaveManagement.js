import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { EventNote, CheckCircle, Cancel } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const statusChip = (status) => {
  const map = {
    pending:  { color: 'warning', label: 'Pending' },
    approved: { color: 'success', label: 'Approved' },
    denied:   { color: 'error',   label: 'Denied' },
  };
  const cfg = map[status] || { color: 'default', label: status };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

const dayCount = (start, end) => {
  if (!start || !end) return '-';
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24) + 1;
  return diff > 0 ? `${diff} day${diff > 1 ? 's' : ''}` : '-';
};

const LeaveManagement = () => {
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [tab, setTab]               = useState(0);
  const [selected, setSelected]     = useState(null);
  const [adminNote, setAdminNote]   = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogAction, setDialogAction]   = useState(null);

  const tabFilters = ['pending', 'approved', 'denied'];

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/leave/all');
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setError(data.message || 'Failed to load requests');
      }
    } catch (err) {
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const filtered = requests.filter(r => r.status === tabFilters[tab]);

  const openDialog = (req, action) => {
    setSelected(req);
    setAdminNote('');
    setDialogAction(action);
  };

  const closeDialog = () => {
    setSelected(null);
    setDialogAction(null);
    setAdminNote('');
  };

  const handleAction = async () => {
    if (!selected || !dialogAction) return;
    setActionLoading(true);
    try {
      const data = await apiRequest(`/leave/${selected._id}/${dialogAction}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote }),
      });
      if (data.success) {
        setSuccess(`Request ${dialogAction === 'approve' ? 'approved' : 'denied'} successfully.`);
        closeDialog();
        fetchRequests();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.message || 'Action failed.');
      }
    } catch (err) {
      setError('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 3 }}>
        <EventNote sx={{ fontSize: 36, color: 'primary.main' }} />
        <Typography variant="h4">Leave Management</Typography>
        {pendingCount > 0 && (
          <Chip label={`${pendingCount} pending`} color="warning" size="small" sx={{ ml: 1 }} />
        )}
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error   && <Alert severity="error"   sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label={`Pending (${requests.filter(r => r.status === 'pending').length})`} />
            <Tab label={`Approved (${requests.filter(r => r.status === 'approved').length})`} />
            <Tab label={`Denied (${requests.filter(r => r.status === 'denied').length})`} />
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No {tabFilters[tab]} leave requests.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    {tab === 0 && <TableCell>Actions</TableCell>}
                    {tab !== 0 && <TableCell>Admin Note</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((req) => (
                    <TableRow key={req._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {req.employeeId?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {req.employeeId?.position || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{req.leaveType}</TableCell>
                      <TableCell>{new Date(req.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(req.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{dayCount(req.startDate, req.endDate)}</TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Typography variant="body2" noWrap title={req.reason}>{req.reason}</Typography>
                      </TableCell>
                      <TableCell>{statusChip(req.status)}</TableCell>
                      {tab === 0 && (
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small" variant="contained" color="success"
                              startIcon={<CheckCircle />}
                              onClick={() => openDialog(req, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small" variant="outlined" color="error"
                              startIcon={<Cancel />}
                              onClick={() => openDialog(req, 'deny')}
                            >
                              Deny
                            </Button>
                          </Box>
                        </TableCell>
                      )}
                      {tab !== 0 && (
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {req.adminNote || '-'}
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected && dialogAction)} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogAction === 'approve' ? 'Approve Leave Request' : 'Deny Leave Request'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selected && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2"><b>Employee:</b> {selected.employeeId?.name}</Typography>
              <Typography variant="body2"><b>Type:</b> {selected.leaveType}</Typography>
              <Typography variant="body2">
                <b>Dates:</b> {new Date(selected.startDate).toLocaleDateString()} – {new Date(selected.endDate).toLocaleDateString()} ({dayCount(selected.startDate, selected.endDate)})
              </Typography>
              <Typography variant="body2"><b>Reason:</b> {selected.reason}</Typography>
            </Box>
          )}
          <TextField
            fullWidth multiline rows={2}
            label="Admin Note (optional)"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Add a note for the employee..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color={dialogAction === 'approve' ? 'success' : 'error'}
            onClick={handleAction}
            disabled={actionLoading}
          >
            {actionLoading
              ? <CircularProgress size={20} />
              : dialogAction === 'approve' ? 'Approve' : 'Deny'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveManagement;
