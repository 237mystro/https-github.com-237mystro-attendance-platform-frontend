import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Avatar, List,
  ListItem, ListItemAvatar, ListItemText, Chip, Button, CircularProgress, Divider
} from '@mui/material';
import { getStoredUser } from '../../utils/authSession';
import {
  Payment, Warning, CheckCircle, Info, Schedule, QrCodeScanner,
  EventNote, Notifications, Campaign
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../utils/api';

const AVATAR_COLORS = ['#1976d2','#388e3c','#d32f2f','#f57c00','#7b1fa2','#0288d1','#c2185b','#00796b'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const fmt = (n) => (n || 0).toLocaleString();

const StatCard = ({ label, value, icon, gradient }) => (
  <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: 'none', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
    <Box sx={{ background: gradient, p: 2.25, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{label}</Typography>
        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>{value}</Typography>
      </Box>
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 2, p: 1, display: 'flex' }}>
        {React.cloneElement(icon, { sx: { fontSize: 24, color: 'white' } })}
      </Box>
    </Box>
  </Card>
);

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState({});
  const [shiftsThisMonth, setShiftsThisMonth] = useState('—');
  const [todaysShift, setTodaysShift] = useState(null);
  const [attendanceRate, setAttendanceRate] = useState('—');
  const [recentPayments, setRecentPayments] = useState([]);
  const [leaveDaysLeft, setLeaveDaysLeft] = useState('—');
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const user = getStoredUser() || {};
      const base = {
        name: user.name,
        email: user.email,
        position: user.position || 'Employee',
        company: user.company || 'Company',
        salary: null,
        payPerShift: null,
        department: 'Operations',
      };

      // Employee profile — salary, payPerShift, department
      try {
        const res = await apiRequest('/employees/me');
        if (res.success) {
          base.salary = res.data.salary;
          base.payPerShift = res.data.payPerShift;
          base.department = res.data.department || 'Operations';
          base.startDate = res.data.startDate;
        }
      } catch {}

      setEmployeeData(base);

      // Shifts this month + today's shift
      try {
        const now = new Date();
        const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const res = await apiRequest(`/schedules/my-shifts?from=${from}`);
        if (res.success) {
          const shifts = res.data || [];
          setShiftsThisMonth(shifts.length);
          const todayStr = now.toDateString();
          const found = shifts.find(s => new Date(s.date).toDateString() === todayStr);
          setTodaysShift(found || null);
        }
      } catch {}

      // Attendance rate
      try {
        const res = await apiRequest('/attendance');
        if (res.success) {
          const records = res.data || [];
          if (records.length > 0) {
            const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
            setAttendanceRate(`${Math.round((present / records.length) * 100)}%`);
          } else {
            setAttendanceRate('100%');
          }
        }
      } catch {}

      // Leave days left (20-day annual budget)
      try {
        const res = await apiRequest('/leave/my-requests');
        if (res.success) {
          const yearStart = new Date(new Date().getFullYear(), 0, 1);
          const approved = (res.requests || []).filter(l =>
            l.status === 'approved' && new Date(l.startDate) >= yearStart
          );
          const daysTaken = approved.reduce((sum, l) => {
            return sum + Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / 86400000) + 1;
          }, 0);
          setLeaveDaysLeft(Math.max(0, 20 - daysTaken));

          // Build notification items from leave history
          const notifs = (res.requests || []).slice(0, 3).map(l => ({
            message: `Leave request (${l.leaveType}) — ${l.status}`,
            severity: l.status === 'approved' ? 'success' : l.status === 'denied' ? 'warning' : 'info',
            date: new Date(l.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
          }));
          setNotifications(notifs);
        }
      } catch {}

      // Recent payments
      try {
        const res = await apiRequest('/payrolls/my-history');
        if (res.success) setRecentPayments(res.data || []);
      } catch {}

      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const shiftStatusColor = { scheduled: 'primary', 'in-progress': 'warning', completed: 'success', missed: 'error' };

  const displayNotifs = notifications.length > 0 ? notifications : [
    { message: 'Remember to check in today on time', severity: 'info', date: 'Today' },
    { message: 'Keep your profile information up to date', severity: 'warning', date: '' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* Welcome banner */}
      <Box sx={{
        background: 'linear-gradient(135deg,#0d2137 0%,#0a3d62 60%,#1565c0 100%)',
        borderRadius: 3, p: { xs: 2.5, md: 3.5 }, mb: 3, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2, boxShadow: '0 8px 30px rgba(13,33,55,0.35)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: avatarColor(employeeData.name), fontWeight: 800, fontSize: 22, border: '3px solid rgba(255,255,255,0.25)' }}>
            {employeeData.name?.charAt(0)?.toUpperCase() || 'E'}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>{greet()}, {employeeData.name?.split(' ')[0] || 'Employee'} 👋</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.25 }}>
              {employeeData.position} · {employeeData.department} @ {employeeData.company}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {employeeData.salary != null && (
            <Chip label={`Salary: ${fmt(employeeData.salary)} FCFA`} size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }} />
          )}
          {employeeData.payPerShift != null && (
            <Chip label={`Per Shift: ${fmt(employeeData.payPerShift)} FCFA`} size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }} />
          )}
        </Box>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            label="Monthly Salary"
            value={employeeData.salary != null ? `${Math.round(employeeData.salary / 1000)}K FCFA` : '—'}
            icon={<Payment />}
            gradient="linear-gradient(135deg,#1565c0,#42a5f5)"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Shifts This Month" value={`${shiftsThisMonth}`} icon={<Schedule />} gradient="linear-gradient(135deg,#2e7d32,#66bb6a)" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Leave Days Left" value={`${leaveDaysLeft}`} icon={<EventNote />} gradient="linear-gradient(135deg,#e65100,#ffa726)" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Attendance Rate" value={attendanceRate} icon={<CheckCircle />} gradient="linear-gradient(135deg,#4a148c,#ab47bc)" />
        </Grid>
      </Grid>

      {/* Shift + Payments */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Today's Shift</Typography>
              <Box sx={{ bgcolor: '#f8faff', borderRadius: 2.5, p: 2, mb: 2, border: '1px solid #e8ecf3' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                  {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {todaysShift ? `${todaysShift.startTime} – ${todaysShift.endTime}` : 'No shift scheduled today'}
                </Typography>
                {todaysShift && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                    <Schedule sx={{ fontSize: 15, color: '#546e7a' }} />
                    <Typography variant="body2" color="text.secondary">Main Office</Typography>
                  </Box>
                )}
                <Chip
                  label={todaysShift?.status || 'no shift'}
                  size="small"
                  color={shiftStatusColor[todaysShift?.status] || 'default'}
                  sx={{ mt: 0.75, fontWeight: 600, textTransform: 'capitalize' }}
                />
              </Box>
              <Button fullWidth variant="contained" startIcon={<QrCodeScanner />}
                onClick={() => navigate('/employee/checkin')}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, py: 1.25, background: 'linear-gradient(135deg,#2e7d32,#66bb6a)', boxShadow: '0 4px 12px rgba(46,125,50,0.35)', '&:hover': { background: 'linear-gradient(135deg,#1b5e20,#2e7d32)' } }}>
                Check In Now
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Recent Payments</Typography>
                <Button size="small" sx={{ textTransform: 'none', fontWeight: 600 }} onClick={() => navigate('/employee/payments')}>
                  View All
                </Button>
              </Box>
              {recentPayments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.disabled">No payment records yet</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {recentPayments.slice(0, 3).map((p, i) => (
                    <React.Fragment key={p._id || i}>
                      <ListItem disableGutters sx={{ py: 1.25 }}>
                        <ListItemAvatar sx={{ minWidth: 46 }}>
                          <Avatar sx={{ bgcolor: '#e3f2fd', width: 38, height: 38 }}>
                            <Payment sx={{ color: '#1976d2', fontSize: 18 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{p.period}</Typography>}
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {p.paidAt
                                ? `Paid ${new Date(p.paidAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
                                : p.status}
                            </Typography>
                          }
                        />
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight={700} color="#2e7d32">{fmt(p.amount)} FCFA</Typography>
                          <Chip
                            label={p.status}
                            size="small"
                            sx={{
                              bgcolor: p.status === 'paid' ? '#e8f5e9' : '#fff3e0',
                              color: p.status === 'paid' ? '#2e7d32' : '#e65100',
                              fontWeight: 600, fontSize: 10, height: 18, mt: 0.25,
                              textTransform: 'capitalize'
                            }}
                          />
                        </Box>
                      </ListItem>
                      {i < Math.min(recentPayments.length, 3) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Notifications + Quick Actions */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Notifications sx={{ color: '#1976d2', fontSize: 20 }} />
                <Typography variant="h6" fontWeight={700}>Notifications</Typography>
              </Box>
              <List disablePadding>
                {displayNotifs.map((n, i) => (
                  <React.Fragment key={i}>
                    <ListItem disableGutters sx={{ py: 1.25 }}>
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        {n.severity === 'warning' ? <Warning sx={{ color: '#ffa726', fontSize: 20 }} />
                          : n.severity === 'success' ? <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                            : <Info sx={{ color: '#42a5f5', fontSize: 20 }} />}
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={500}>{n.message}</Typography>}
                        secondary={n.date ? <Typography variant="caption" color="text.disabled">{n.date}</Typography> : null}
                      />
                    </ListItem>
                    {i < displayNotifs.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Quick Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Button fullWidth variant="contained" startIcon={<QrCodeScanner sx={{ fontSize: 17 }} />}
                  onClick={() => navigate('/employee/checkin')}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, py: 1.1, background: 'linear-gradient(135deg,#2e7d32,#66bb6a)', boxShadow: '0 4px 12px rgba(46,125,50,0.3)' }}>
                  Check In
                </Button>
                <Button fullWidth variant="outlined" onClick={() => navigate('/employee/schedule')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1.1 }}>
                  View Schedule
                </Button>
                <Button fullWidth variant="outlined" onClick={() => navigate('/employee/payments')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1.1 }}>
                  Payment History
                </Button>
                <Button fullWidth variant="outlined" onClick={() => navigate('/employee/leave')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1.1 }}>
                  Request Leave
                </Button>
                <Button fullWidth variant="outlined" startIcon={<Campaign sx={{ fontSize: 17 }} />}
                  onClick={() => navigate('/employee/messaging')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1.1, borderColor: '#ffa726', color: '#f57c00', '&:hover': { bgcolor: '#fff3e0', borderColor: '#f57c00' } }}>
                  Announcements
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardOverview;
