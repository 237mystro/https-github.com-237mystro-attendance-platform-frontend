import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Container, Grid, Typography, Button, Card, CardContent,
  AppBar, Toolbar, Chip
} from '@mui/material';
import {
  QrCode, AutoGraph, Payment, Schedule, People, Security,
  ArrowForward, CheckCircle, Campaign, Analytics, EventNote,
  RemoveCircle, Chat, MyLocation, QrCode2, PersonAdd,
  Dashboard, AssignmentTurnedIn, AccountCircle
} from '@mui/icons-material';

const features = [
  {
    icon: <QrCode sx={{ fontSize: 30 }} />,
    title: 'QR Attendance',
    description: 'GPS-verified QR check-ins with geofence enforcement. Real-time attendance visible on your admin dashboard the moment employees scan.',
    color: '#1976d2', bg: 'linear-gradient(135deg,#e3f2fd,#bbdefb)'
  },
  {
    icon: <AutoGraph sx={{ fontSize: 30 }} />,
    title: 'Payroll Automation',
    description: 'Salaries calculated automatically from attendance and shift data. Late deductions are applied with zero manual work.',
    color: '#388e3c', bg: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)'
  },
  {
    icon: <Payment sx={{ fontSize: 30 }} />,
    title: 'Mobile Money',
    description: 'Pay your entire team via MTN or Orange Money in seconds. Direct to employee wallets with full transaction records.',
    color: '#f57c00', bg: 'linear-gradient(135deg,#fff3e0,#ffe0b2)'
  },
  {
    icon: <Schedule sx={{ fontSize: 30 }} />,
    title: 'Shift Scheduling',
    description: 'Create and assign shifts with an accept/decline workflow. Staff see invitations instantly and confirm their schedules.',
    color: '#7b1fa2', bg: 'linear-gradient(135deg,#f3e5f5,#e1bee7)'
  },
  {
    icon: <People sx={{ fontSize: 30 }} />,
    title: 'Employee Management',
    description: 'Complete employee profiles, role-based access, and a guided onboarding workflow from a single admin screen.',
    color: '#0288d1', bg: 'linear-gradient(135deg,#e1f5fe,#b3e5fc)'
  },
  {
    icon: <EventNote sx={{ fontSize: 30 }} />,
    title: 'Leave Management',
    description: 'Employees submit leave requests; admins approve or decline. Full history with status tracking built in.',
    color: '#ef5350', bg: 'linear-gradient(135deg,#ffebee,#ffcdd2)'
  },
  {
    icon: <RemoveCircle sx={{ fontSize: 30 }} />,
    title: 'Late Deductions',
    description: 'Configurable buffer windows, per-minute deduction rates, and monthly deduction summaries per employee.',
    color: '#e64a19', bg: 'linear-gradient(135deg,#fbe9e7,#ffccbc)'
  },
  {
    icon: <Chat sx={{ fontSize: 30 }} />,
    title: 'Team Messaging',
    description: 'Built-in direct messaging and company-wide announcements with live unread badges and real-time notifications.',
    color: '#7c4dff', bg: 'linear-gradient(135deg,#ede7f6,#d1c4e9)'
  },
  {
    icon: <Security sx={{ fontSize: 30 }} />,
    title: 'Enterprise Security',
    description: 'JWT authentication, bcrypt encryption, geofence boundaries, and role-based access control on every route.',
    color: '#d32f2f', bg: 'linear-gradient(135deg,#ffebee,#ffcdd2)'
  },
];

const adminModules = [
  { icon: <Dashboard sx={{ fontSize: 20 }} />, label: 'Dashboard Overview', color: '#42a5f5' },
  { icon: <People sx={{ fontSize: 20 }} />, label: 'Employee Management', color: '#66bb6a' },
  { icon: <PersonAdd sx={{ fontSize: 20 }} />, label: 'Employee Onboarding', color: '#fb8c00' },
  { icon: <Schedule sx={{ fontSize: 20 }} />, label: 'Shift Scheduling', color: '#ab47bc' },
  { icon: <AssignmentTurnedIn sx={{ fontSize: 20 }} />, label: 'Attendance Dashboard', color: '#ffa726' },
  { icon: <EventNote sx={{ fontSize: 20 }} />, label: 'Leave Management', color: '#ef5350' },
  { icon: <Payment sx={{ fontSize: 20 }} />, label: 'Payroll Processing', color: '#26a69a' },
  { icon: <Chat sx={{ fontSize: 20 }} />, label: 'Team Messaging', color: '#7c4dff' },
  { icon: <MyLocation sx={{ fontSize: 20 }} />, label: 'Geofence Settings', color: '#00acc1' },
  { icon: <QrCode2 sx={{ fontSize: 20 }} />, label: 'Company QR Code', color: '#43a047' },
  { icon: <RemoveCircle sx={{ fontSize: 20 }} />, label: 'Late Deductions', color: '#e53935' },
];

const employeeModules = [
  { icon: <Dashboard sx={{ fontSize: 20 }} />, label: 'My Dashboard', color: '#42a5f5' },
  { icon: <QrCode sx={{ fontSize: 20 }} />, label: 'QR Check-In', color: '#66bb6a' },
  { icon: <Schedule sx={{ fontSize: 20 }} />, label: 'My Schedule', color: '#ab47bc' },
  { icon: <Payment sx={{ fontSize: 20 }} />, label: 'My Payments', color: '#26a69a' },
  { icon: <EventNote sx={{ fontSize: 20 }} />, label: 'Leave Requests', color: '#ef5350' },
  { icon: <RemoveCircle sx={{ fontSize: 20 }} />, label: 'My Deductions', color: '#e53935' },
  { icon: <Chat sx={{ fontSize: 20 }} />, label: 'Messaging', color: '#7c4dff' },
  { icon: <AccountCircle sx={{ fontSize: 20 }} />, label: 'Profile', color: '#ffa726' },
];

const stats = [
  { value: '500+', label: 'Businesses Served' },
  { value: '12,000+', label: 'Employees Managed' },
  { value: 'XAF 2B+', label: 'Payroll Processed' },
];

const steps = [
  { num: '01', title: 'Register Your Business', desc: 'Create your company account in under 2 minutes. No credit card required.' },
  { num: '02', title: 'Add Your Employees', desc: 'Import or manually add employees. Set salaries, shifts, and roles instantly.' },
  { num: '03', title: 'Automate & Pay', desc: 'QR check-ins feed into payroll. Approve and send payments to mobile money wallets.' },
];

const ModuleTile = ({ icon, label, color }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.1,
    borderRadius: 2, border: '1px solid #e8ecf3', bgcolor: 'white',
    transition: 'all 0.2s ease',
    '&:hover': { borderColor: color, boxShadow: `0 4px 12px ${color}22`, transform: 'translateY(-1px)' }
  }}>
    <Box sx={{ color, flexShrink: 0, display: 'flex' }}>{icon}</Box>
    <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12.5, color: '#374151' }}>{label}</Typography>
  </Box>
);

const LandingPage = () => (
  <Box sx={{ bgcolor: '#f8faff', minHeight: '100vh' }}>

    {/* ── Navbar ── */}
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid #e8ecf3' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ py: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexGrow: 1 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg,#1565c0,#42a5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Payment sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#1565c0,#1976d2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AutoPayroll
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button component={Link} to="/login" sx={{ color: '#546e7a', fontWeight: 500, textTransform: 'none', fontSize: 15 }}>Login</Button>
            <Button component={Link} to="/register" variant="contained"
              sx={{ textTransform: 'none', fontWeight: 700, px: 2.5, py: 0.85, fontSize: 15, background: 'linear-gradient(135deg,#1565c0,#1976d2)', borderRadius: 2.5, boxShadow: '0 4px 14px rgba(25,118,210,0.4)', '&:hover': { background: 'linear-gradient(135deg,#0d47a1,#1565c0)' } }}>
              Get Started
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>

    {/* ── Hero ── */}
    <Box sx={{ background: 'linear-gradient(135deg,#0d1b4b 0%,#1565c0 55%,#1976d2 100%)', pt: { xs: 8, md: 12 }, pb: { xs: 10, md: 16 }, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -80, right: -80, width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <Box sx={{ position: 'absolute', bottom: -100, left: -60, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Chip label="Trusted by 500+ SMEs across Cameroon" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', mb: 3, fontWeight: 500, fontSize: 12 }} />
            <Typography variant="h2" fontWeight={800} color="white" sx={{ lineHeight: 1.15, mb: 2.5, fontSize: { xs: '2.2rem', md: '3.2rem' } }}>
              Payroll That{' '}
              <Box component="span" sx={{ color: '#64b5f6' }}>Works</Box>{' '}
              While You Sleep
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 400, lineHeight: 1.7, mb: 4, fontSize: { xs: '1rem', md: '1.15rem' } }}>
              Automate attendance, scheduling, and salary payments for your team. QR check-ins, instant mobile money transfers, and real-time reports — all in one dashboard.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button component={Link} to="/register" variant="contained" size="large" endIcon={<ArrowForward />}
                sx={{ bgcolor: 'white', color: '#1565c0', fontWeight: 700, textTransform: 'none', px: 3.5, py: 1.5, fontSize: 16, borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', '&:hover': { bgcolor: '#f5f5f5', boxShadow: '0 12px 32px rgba(0,0,0,0.25)' } }}>
                Start Free Trial
              </Button>
              <Button component={Link} to="/login" variant="outlined" size="large"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'none', px: 3, py: 1.5, fontSize: 16, borderRadius: 3, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'white' } }}>
                Sign In
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, mt: 4.5, flexWrap: 'wrap' }}>
              {['No credit card', 'Free onboarding', '24/7 support'].map(t => (
                <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CheckCircle sx={{ fontSize: 16, color: '#a5d6a7' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{t}</Typography>
                </Box>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 4, boxShadow: '0 40px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                <Box sx={{ p: 2, background: 'linear-gradient(135deg,#1565c0,#42a5f5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Payroll Dashboard — {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Typography>
                  <Analytics sx={{ fontSize: 18, opacity: 0.8 }} />
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                    {[{ label: 'Employees', value: '42', color: '#1976d2' }, { label: 'Present', value: '38', color: '#388e3c' }, { label: 'Payroll', value: '4.2M', color: '#f57c00' }].map(m => (
                      <Grid item xs={4} key={m.label}>
                        <Box sx={{ bgcolor: '#f8faff', p: 1.25, borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={800} sx={{ color: m.color, fontSize: '1rem' }}>{m.value}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{m.label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => (
                    <Box key={d} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">{d}</Typography>
                        <Typography variant="caption" color="text.secondary">{[95, 88, 92, 97, 85][i]}%</Typography>
                      </Box>
                      <Box sx={{ height: 6, bgcolor: '#eef2f7', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${[95, 88, 92, 97, 85][i]}%`, bgcolor: '#1976d2', borderRadius: 3 }} />
                      </Box>
                    </Box>
                  ))}
                  <Button variant="contained" fullWidth sx={{ mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: 2, py: 1 }}>
                    Process Payroll
                  </Button>
                </CardContent>
              </Card>

              <Box sx={{ position: 'absolute', top: -14, right: { xs: 4, md: -14 }, bgcolor: 'white', borderRadius: 3, px: 2, py: 1, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: '#388e3c', fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 12, display: 'block' }}>Payment Sent!</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>38 employees paid</Typography>
                </Box>
              </Box>

              <Box sx={{ position: 'absolute', bottom: 16, left: { xs: 4, md: -14 }, bgcolor: 'white', borderRadius: 3, px: 1.75, py: 0.9, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCode sx={{ color: '#1565c0', fontSize: 18 }} />
                <Box>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11, display: 'block' }}>QR Check-In</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Live attendance</Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>

    {/* ── Stats bar ── */}
    <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e8ecf3', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      <Container maxWidth="lg">
        <Grid container>
          {stats.map((s, i) => (
            <Grid item xs={12} md={4} key={s.label}>
              <Box sx={{ py: 4, px: 2, textAlign: 'center', borderRight: i < 2 ? { md: '1px solid #e8ecf3' } : 'none' }}>
                <Typography variant="h3" fontWeight={800} sx={{ color: '#1565c0', mb: 0.5 }}>{s.value}</Typography>
                <Typography variant="body1" color="text.secondary" fontWeight={500}>{s.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    {/* ── Features ── */}
    <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
      <Box sx={{ textAlign: 'center', mb: 7 }}>
        <Chip label="Features" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600, mb: 2 }} />
        <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: '1.9rem', md: '2.5rem' } }}>Everything You Need</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', fontWeight: 400, lineHeight: 1.65 }}>
          A complete payroll suite built for African SMEs. Simple enough for a 5-person team, powerful enough for 500.
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {features.map(f => (
          <Grid item xs={12} sm={6} md={4} key={f.title}>
            <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid #e8ecf3', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', transition: 'all 0.25s ease', '&:hover': { boxShadow: '0 12px 40px rgba(0,0,0,0.12)', transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 2.5, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, mb: 2.5 }}>
                  {f.icon}
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{f.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{f.description}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>

    {/* ── Platform Modules ── */}
    <Box sx={{ bgcolor: 'white', py: { xs: 7, md: 10 }, borderTop: '1px solid #e8ecf3', borderBottom: '1px solid #e8ecf3' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 7 }}>
          <Chip label="Platform Modules" sx={{ bgcolor: '#f3e5f5', color: '#7b1fa2', fontWeight: 600, mb: 2 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: '1.9rem', md: '2.5rem' } }}>Two Portals, One System</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', fontWeight: 400, lineHeight: 1.65 }}>
            Admins manage the business. Employees manage their work. Both get exactly what they need.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Admin Portal */}
          <Grid item xs={12} md={6}>
            <Box sx={{ borderRadius: 4, border: '1px solid #e8ecf3', overflow: 'hidden', height: '100%' }}>
              <Box sx={{ p: 2.5, background: 'linear-gradient(135deg,#0d1b4b,#1565c0)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Dashboard sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="white">Admin Portal</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Full business management</Typography>
                </Box>
                <Chip label={`${adminModules.length} modules`} size="small" sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 11 }} />
              </Box>
              <Box sx={{ p: 2.5, bgcolor: '#f8faff' }}>
                <Grid container spacing={1}>
                  {adminModules.map(m => (
                    <Grid item xs={12} sm={6} key={m.label}>
                      <ModuleTile {...m} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Grid>

          {/* Employee Portal */}
          <Grid item xs={12} md={6}>
            <Box sx={{ borderRadius: 4, border: '1px solid #e8ecf3', overflow: 'hidden', height: '100%' }}>
              <Box sx={{ p: 2.5, background: 'linear-gradient(135deg,#0d2137,#0a3d62)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccountCircle sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="white">Employee Portal</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Personal workspace</Typography>
                </Box>
                <Chip label={`${employeeModules.length} modules`} size="small" sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 11 }} />
              </Box>
              <Box sx={{ p: 2.5, bgcolor: '#f8faff' }}>
                <Grid container spacing={1}>
                  {employeeModules.map(m => (
                    <Grid item xs={12} sm={6} key={m.label}>
                      <ModuleTile {...m} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>

    {/* ── How it works ── */}
    <Container maxWidth="md" sx={{ py: { xs: 7, md: 10 } }}>
      <Box sx={{ textAlign: 'center', mb: 7 }}>
        <Chip label="How It Works" sx={{ bgcolor: '#e8f5e9', color: '#388e3c', fontWeight: 600, mb: 2 }} />
        <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: '1.9rem', md: '2.5rem' } }}>Up and Running in Minutes</Typography>
      </Box>
      <Grid container spacing={4}>
        {steps.map(s => (
          <Grid item xs={12} md={4} key={s.num}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2.5, background: 'linear-gradient(135deg,#1565c0,#42a5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="white">{s.num}</Typography>
              </Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{s.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{s.desc}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>

    {/* ── CTA ── */}
    <Box sx={{ background: 'linear-gradient(135deg,#0d1b4b 0%,#1565c0 100%)', py: { xs: 8, md: 12 } }}>
      <Container maxWidth="md" sx={{ textAlign: 'center' }}>
        <Campaign sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
        <Typography variant="h3" fontWeight={800} color="white" sx={{ mb: 2, fontSize: { xs: '1.9rem', md: '2.6rem' } }}>
          Ready to Automate Your Payroll?
        </Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.72)', mb: 4.5, fontWeight: 400, lineHeight: 1.6 }}>
          Join hundreds of businesses saving hours every month with AutoPayroll.
        </Typography>
        <Button component={Link} to="/register" variant="contained" size="large" endIcon={<ArrowForward />}
          sx={{ bgcolor: 'white', color: '#1565c0', fontWeight: 700, textTransform: 'none', px: 4.5, py: 1.75, fontSize: 17, borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', '&:hover': { bgcolor: '#f5f5f5' } }}>
          Get Started Free
        </Button>
      </Container>
    </Box>

    {/* ── Footer ── */}
    <Box sx={{ bgcolor: '#0f1729', py: 5 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, background: 'linear-gradient(135deg,#1565c0,#42a5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Payment sx={{ color: 'white', fontSize: 17 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: 'white' }}>AutoPayroll</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} AutoPayroll. Built for African businesses.
          </Typography>
        </Box>
      </Container>
    </Box>
  </Box>
);

export default LandingPage;
