import React, { useState, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Grid, LinearProgress, Alert, Chip } from '@mui/material';
import { People, CheckCircle, AccessTime, EventBusy, Store } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';
import { getStoredUser } from '../../utils/authSession';

const StatCard = ({ label, value, icon, color, sub }) => (
  <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3, height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" fontWeight={800} sx={{ color, mb: 0.5 }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
);

const BranchDashboardOverview = () => {
  const [attendance, setAttendance] = useState(null);
  const [branch, setBranch]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const user = getStoredUser() || {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, brRes] = await Promise.all([
        apiRequest('/attendance/admin-dashboard'),
        apiRequest('/branches/mine')
      ]);
      if (attRes?.success) setAttendance(attRes.data);
      if (brRes?.success)  setBranch(brRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Store sx={{ color: '#43a047' }} />
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1a2f52' }}>
            {branch?.name || 'Branch'} Dashboard
          </Typography>
          <Chip label={user.role === 'branch_manager' ? 'Manager' : 'HR'} size="small" color="success" />
        </Box>
        <Typography variant="body2" color="text.secondary">{today}</Typography>
        {branch?.address && (
          <Typography variant="caption" color="text.secondary">{branch.address}</Typography>
        )}
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error   && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stat cards */}
      {attendance && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Total Employees" value={attendance.totalEmployees} icon={<People />} color="#1976d2" sub="In this branch" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Present Today" value={attendance.present} icon={<CheckCircle />} color="#388e3c"
              sub={attendance.totalEmployees ? `${Math.round((attendance.present / attendance.totalEmployees) * 100)}% attendance` : ''} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Late Today" value={attendance.late} icon={<AccessTime />} color="#f57c00" sub="Arrived after schedule" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Absent Today" value={attendance.absent} icon={<EventBusy />} color="#d32f2f" sub="No check-in recorded" />
          </Grid>
        </Grid>
      )}

      {/* Branch info */}
      {branch && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Branch Details</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Branch Name</Typography>
                    <Typography variant="body2" fontWeight={600}>{branch.name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Address</Typography>
                    <Typography variant="body2" fontWeight={600}>{branch.address || '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Geofence</Typography>
                    <Chip size="small" label={branch.geofence?.latitude ? `Set (${branch.geofence.radius}m)` : 'Not configured'}
                      color={branch.geofence?.latitude ? 'success' : 'warning'} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">QR Code</Typography>
                    <Chip size="small" label={branch.qrToken ? 'Active' : 'Not generated'} color={branch.qrToken ? 'success' : 'warning'} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Quick Setup</Typography>
                {!branch.geofence?.latitude && (
                  <Alert severity="warning" sx={{ mb: 1.5 }}>
                    Geofence not set — employees can't check in yet. Go to <strong>Geofence</strong> to configure it.
                  </Alert>
                )}
                {!branch.qrToken && (
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    No QR code generated yet. Go to <strong>Branch QR</strong> to create one.
                  </Alert>
                )}
                {branch.geofence?.latitude && branch.qrToken && (
                  <Alert severity="success">
                    Branch is fully configured. Employees can check in using the QR code.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default BranchDashboardOverview;
