import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Avatar, List,
  ListItem, ListItemAvatar, ListItemText, Chip, Button, CircularProgress
} from '@mui/material';
import {
  People, Schedule, Payment, Assignment, Warning,
  Info, QrCode, ArrowUpward, Campaign
} from '@mui/icons-material';
import QRCodeDisplay from './QRCodeDisplay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getStoredUser } from '../../utils/authSession';
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

const MetricCard = ({ title, value, icon, gradient, trendLabel }) => (
  <Card sx={{ height: '100%', borderRadius: 3, border: 'none', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' } }}>
    <Box sx={{ background: gradient, p: 2.5, color: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500, mb: 0.5 }}>{title}</Typography>
          <Typography variant="h4" fontWeight={800}>{value}</Typography>
          {trendLabel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
              <ArrowUpward sx={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{trendLabel}</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 2, p: 1.25, display: 'flex' }}>
          {React.cloneElement(icon, { sx: { fontSize: 26, color: 'white' } })}
        </Box>
      </Box>
    </Box>
  </Card>
);

const DashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState('—');
  const [todayShifts, setTodayShifts] = useState('—');
  const [payrollTotal, setPayrollTotal] = useState('—');
  const [attendanceRate, setAttendanceRate] = useState('—');
  const [pieData, setPieData] = useState([
    { name: 'Present', value: 0, color: '#4caf50' },
    { name: 'Late', value: 0, color: '#ff9800' },
    { name: 'Absent', value: 0, color: '#f44336' },
  ]);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();
  const user = getStoredUser() || {};

  useEffect(() => {
    const load = async () => {
      const newAlerts = [];

      // Active employees
      try {
        const res = await apiRequest('/employees');
        if (res.success) {
          const active = (res.data || []).filter(e => e.status === 'active');
          setEmployeeCount(active.length);
        }
      } catch {}

      // Today's shifts
      try {
        const res = await apiRequest('/schedules');
        if (res.success) {
          const todayStr = new Date().toDateString();
          const count = (res.data || []).filter(s => new Date(s.date).toDateString() === todayStr).length;
          setTodayShifts(count);
        }
      } catch {}

      // Cumulative payroll total
      try {
        const res = await apiRequest('/payrolls');
        if (res.success && (res.data || []).length > 0) {
          const total = res.data.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
          setPayrollTotal(
            total >= 1000000
              ? `XAF ${(total / 1000000).toFixed(1)}M`
              : `XAF ${Math.round(total / 1000)}K`
          );
        }
      } catch {}

      // Today's attendance
      try {
        const res = await apiRequest('/attendance/admin-dashboard');
        if (res.success) {
          const { totalEmployees = 1, present = 0, late = 0, absent = 0 } = res.data;
          const rate = Math.round(((present + late) / Math.max(totalEmployees, 1)) * 100);
          setAttendanceRate(`${rate}%`);
          setPieData([
            { name: 'Present', value: present, color: '#4caf50' },
            { name: 'Late', value: late, color: '#ff9800' },
            { name: 'Absent', value: absent, color: '#f44336' },
          ]);
          if (absent > 0) newAlerts.push({ message: `${absent} employee${absent > 1 ? 's' : ''} absent today`, severity: 'warning' });
          if (late > 0) newAlerts.push({ message: `${late} employee${late > 1 ? 's' : ''} checked in late`, severity: 'info' });
        }
      } catch {}

      // Pending leave requests
      try {
        const res = await apiRequest('/leave/all');
        const list = res.requests || res.data || [];
        const pending = list.filter(l => l.status === 'pending').length;
        if (pending > 0) newAlerts.push({ message: `${pending} leave request${pending > 1 ? 's' : ''} awaiting approval`, severity: 'warning' });
      } catch {}

      if (newAlerts.length === 0) {
        newAlerts.push({ message: 'Payroll processing due at end of month', severity: 'info' });
      }
      setAlerts(newAlerts);
      setLoading(false);
    };

    load();
  }, []);

  // Static weekly data — requires a dedicated weekly endpoint to make fully live
  const attendanceData = [
    { name: 'Mon', present: 38, absent: 4 },
    { name: 'Tue', present: 40, absent: 2 },
    { name: 'Wed', present: 39, absent: 3 },
    { name: 'Thu', present: 41, absent: 1 },
    { name: 'Fri', present: 37, absent: 5 },
    { name: 'Sat', present: 25, absent: 0 },
    { name: 'Sun', present: 18, absent: 0 },
  ];

  const metricCards = [
    { title: 'Active Employees', value: `${employeeCount}`, icon: <People />, gradient: 'linear-gradient(135deg,#1565c0,#42a5f5)' },
    { title: "Today's Shifts", value: `${todayShifts}`, icon: <Schedule />, gradient: 'linear-gradient(135deg,#2e7d32,#66bb6a)' },
    { title: 'Total Payroll', value: payrollTotal, icon: <Payment />, gradient: 'linear-gradient(135deg,#e65100,#ffa726)' },
    { title: 'Attendance Rate', value: attendanceRate, icon: <Assignment />, gradient: 'linear-gradient(135deg,#4a148c,#ab47bc)' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* Welcome banner */}
      <Box sx={{
        background: 'linear-gradient(135deg,#0d1b4b 0%,#1565c0 60%,#1976d2 100%)',
        borderRadius: 3, p: { xs: 2.5, md: 3.5 }, mb: 3, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2, boxShadow: '0 8px 30px rgba(21,101,192,0.35)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: avatarColor(user.name), fontWeight: 800, fontSize: 22, border: '3px solid rgba(255,255,255,0.25)' }}>
            {user.name?.charAt(0)?.toUpperCase() || 'A'}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>{greet()}, {user.name?.split(' ')[0] || 'Admin'} 👋</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.25 }}>
              {user.position || 'Administrator'} · {user.company || 'Your Company'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" startIcon={<Campaign sx={{ fontSize: 15 }} />}
            onClick={() => navigate('/admin/messaging/announcements')}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'white' } }}>
            Announce
          </Button>
          <Button variant="contained" size="small" startIcon={<QrCode sx={{ fontSize: 15 }} />}
            onClick={() => navigate('/admin/attendance')}
            sx={{ bgcolor: 'rgba(255,255,255,0.18)', textTransform: 'none', borderRadius: 2, fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
            Attendance
          </Button>
        </Box>
      </Box>

      {/* Metric cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {metricCards.map((m, i) => (
          <Grid item xs={12} sm={6} lg={3} key={i}>
            <MetricCard {...m} />
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h6" fontWeight={700}>Weekly Attendance</Typography>
                <Chip label="This Week" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
              </Box>
              <Box sx={{ height: { xs: 240, md: 280 } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#78909c' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#78909c' }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e8ecf3', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Bar dataKey="present" fill="#1976d2" name="Present" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="#ef5350" name="Absent" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Today's Attendance</Typography>
              <Typography variant="caption" color="text.secondary">Live — as of now</Typography>
              <Box sx={{ height: { xs: 220, md: 240 }, mt: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, value }) => value > 0 ? `${name} ${value}` : ''}
                      labelLine={false}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts + QR */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent Alerts</Typography>
              <List disablePadding>
                {alerts.map((alert, i) => (
                  <ListItem key={i} disableGutters
                    sx={{ py: 1.25, borderBottom: i < alerts.length - 1 ? '1px solid #f5f7fb' : 'none' }}>
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      {alert.severity === 'warning'
                        ? <Warning sx={{ color: '#ffa726', fontSize: 22 }} />
                        : <Info sx={{ color: '#42a5f5', fontSize: 22 }} />
                      }
                    </ListItemAvatar>
                    <ListItemText
                      primary={alert.message}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    />
                    <Button size="small" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', minWidth: 60, fontSize: 12 }}>View</Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Office QR Code</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <QRCodeDisplay shiftId="demo-shift-id" locationName="Main Office" />
              </Box>
              <Button variant="outlined" fullWidth startIcon={<QrCode />}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                Download QR
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2.5, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf3' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Quick Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Button variant="contained" fullWidth onClick={() => navigate('/admin/payroll')}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg,#1565c0,#42a5f5)', boxShadow: '0 4px 12px rgba(25,118,210,0.35)' }}>
                  Process Payroll
                </Button>
                <Button variant="outlined" fullWidth onClick={() => navigate('/admin/scheduling')}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                  Schedule Shifts
                </Button>
                <Button variant="outlined" fullWidth onClick={() => navigate('/admin/messaging')}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                  Send Message
                </Button>
                <Button variant="outlined" fullWidth onClick={() => navigate('/admin/leave')}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                  Review Leaves
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
