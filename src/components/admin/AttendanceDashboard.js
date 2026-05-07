import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Badge,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import {
  AccessTime,
  Cancel,
  CheckCircle,
  DevicesOther,
  ExpandLess,
  ExpandMore,
  Fingerprint,
  FaceRetouchingNatural,
  People,
  QrCode,
  Warning
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';
import { getDeviceLabel } from '../../utils/deviceFingerprint';
import { SOCKET_URL } from '../../utils/api';
import io from 'socket.io-client';
import { getStoredToken } from '../../utils/authSession';

const AttendanceDashboard = () => {
  const [attendanceData, setAttendanceData]   = useState([]);
  const [summary, setSummary]                 = useState(null);
  const [flaggedRecords, setFlaggedRecords]   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [showFlagged, setShowFlagged]         = useState(false);
  const [newFlagAlert, setNewFlagAlert]       = useState(null); // { employeeName, ipAddress }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashData, flagData] = await Promise.all([
        apiRequest('/attendance/admin-dashboard'),
        apiRequest('/attendance/flagged-devices')
      ]);

      if (dashData.success) {
        const payload = dashData.data || dashData;
        setAttendanceData(payload.attendance || []);
        setSummary({
          totalEmployees: payload.totalEmployees || 0,
          present:        payload.present        || 0,
          late:           payload.late           || 0,
          absent:         payload.absent         || 0
        });
      } else {
        setError(dashData.message || 'Failed to load attendance data');
      }

      if (flagData.success) {
        setFlaggedRecords(flagData.data || []);
      }
    } catch (err) {
      setError('Failed to fetch attendance data');
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Real-time socket listener for flagged-device events ──────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    const token  = getStoredToken();
    if (token) socket.emit('authenticate', token);

    socket.on('attendance:device_flagged', (event) => {
      setNewFlagAlert(event);
      // Refresh flagged list
      apiRequest('/attendance/flagged-devices').then(data => {
        if (data.success) setFlaggedRecords(data.data || []);
      });
    });

    return () => socket.disconnect();
  }, []);

  // ── Status chip ───────────────────────────────────────────────────────────
  const getStatusChip = (status) => {
    switch (status) {
      case 'present': return <Chip icon={<CheckCircle />}  label="Present" color="success" size="small" />;
      case 'late':    return <Chip icon={<AccessTime />}   label="Late"    color="warning" size="small" />;
      case 'absent':  return <Chip icon={<Cancel />}       label="Absent"  color="error"   size="small" />;
      default:        return <Chip label={status} variant="outlined" size="small" />;
    }
  };

  // ── Method chip ───────────────────────────────────────────────────────────
  const getMethodChip = (record) => {
    if (record.attendanceMethod === 'biometric') {
      const isFace = record.biometricType === 'faceId';
      return (
        <Chip
          icon={isFace ? <FaceRetouchingNatural /> : <Fingerprint />}
          label={isFace ? 'Face ID' : 'Fingerprint'}
          color="secondary"
          size="small"
          variant="outlined"
        />
      );
    }
    if (record.attendanceMethod === 'qr' || record.qrData) {
      return <Chip icon={<QrCode />} label="QR Code" color="primary" size="small" variant="outlined" />;
    }
    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Attendance Dashboard
      </Typography>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
              <People sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="h4">{summary.totalEmployees}</Typography>
              <Typography variant="body2" color="text.secondary">Total Employees</Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
              <CheckCircle sx={{ fontSize: { xs: 32, sm: 40 }, color: 'success.main', mb: 0.5 }} />
              <Typography variant="h4">{summary.present}</Typography>
              <Typography variant="body2" color="text.secondary">Present</Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
              <AccessTime sx={{ fontSize: { xs: 32, sm: 40 }, color: 'warning.main', mb: 0.5 }} />
              <Typography variant="h4">{summary.late}</Typography>
              <Typography variant="body2" color="text.secondary">Late</Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
              <Cancel sx={{ fontSize: { xs: 32, sm: 40 }, color: 'error.main', mb: 0.5 }} />
              <Typography variant="h4">{summary.absent}</Typography>
              <Typography variant="body2" color="text.secondary">Absent</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── Flagged devices section ──────────────────────────────────────── */}
      {flaggedRecords.length > 0 && (
        <Card sx={{ mb: 3, border: '1px solid', borderColor: 'warning.main' }}>
          <CardContent sx={{ pb: '8px !important' }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setShowFlagged(v => !v)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent={flaggedRecords.length} color="warning">
                  <Warning color="warning" />
                </Badge>
                <Typography variant="h6" color="warning.main">
                  Unknown Device Alerts
                </Typography>
              </Box>
              <IconButton size="small">
                {showFlagged ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={showFlagged}>
              <Alert severity="warning" sx={{ mt: 1.5, mb: 1.5 }}>
                These employees used an unrecognised device to check in. Review and take action as needed.
              </Alert>

              <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell>Date &amp; Time</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Device</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {flaggedRecords.map((record) => (
                      <TableRow key={record._id} sx={{ bgcolor: 'warning.50' }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <DevicesOther fontSize="small" color="warning" />
                            {record.employeeId?.name || 'Unknown'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {record.checkInTime
                            ? new Date(record.checkInTime).toLocaleString()
                            : '-'}
                        </TableCell>
                        <TableCell>{getMethodChip(record)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {record.ipAddress || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={record.userAgent || 'Unknown'} arrow>
                            <Typography variant="body2" sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getDeviceLabel(record.userAgent)}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{getStatusChip(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* ── Today's attendance table ─────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Attendance
          </Typography>

          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Check-In Time</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No attendance records for today yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceData.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {record.deviceFlagged && (
                            <Tooltip title="Unknown device" arrow>
                              <Warning fontSize="small" color="warning" />
                            </Tooltip>
                          )}
                          {record.employeeId?.name || 'Unknown'}
                        </Box>
                      </TableCell>
                      <TableCell>{record.employeeId?.position || 'Unknown'}</TableCell>
                      <TableCell>
                        {record.checkInTime
                          ? new Date(record.checkInTime).toLocaleTimeString()
                          : '-'}
                      </TableCell>
                      <TableCell>{getMethodChip(record) || '-'}</TableCell>
                      <TableCell>{getStatusChip(record.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ── Real-time toast for new flagged device ───────────────────────── */}
      <Snackbar
        open={!!newFlagAlert}
        autoHideDuration={8000}
        onClose={() => setNewFlagAlert(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity="warning"
          onClose={() => setNewFlagAlert(null)}
          icon={<Warning />}
          sx={{ width: '100%' }}
        >
          <strong>Unknown device detected!</strong><br />
          {newFlagAlert?.employeeName} checked in from an unrecognised device
          {newFlagAlert?.ipAddress ? ` (IP: ${newFlagAlert.ipAddress})` : ''}.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AttendanceDashboard;
