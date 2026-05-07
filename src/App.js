import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getSession } from './utils/authSession';
import LandingPage from './components/LandingPage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import EmployeeOnboarding from './components/admin/EmployeeOnboarding';
import AdminDashboard from './components/admin/AdminDashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import DashboardOverview from './components/admin/DashboardOverview';
import MessagingDashboard from './components/messaging/MessagingDashboard';
import AnnouncementForm from './components/admin/AnnouncementForm';
import EmployeeManagement from './components/admin/EmployeeManagement';
import ShiftScheduling from './components/admin/ShiftScheduling';
import PayrollProcessing from './components/admin/PayrollProcessing';
import LeaveManagement from './components/admin/LeaveManagement';
import LeaveRequest from './components/employee/LeaveRequest';
import Schedule from './components/employee/Schedule';
import Payments from './components/employee/Payments';
import AttendanceDashboard from './components/admin/AttendanceDashboard';
import ChangePassword from './components/employee/ChangePassword';
import EmployeeDashboardOverview from './components/employee/DashboardOverview';
import QRScanner from './components/employee/QRScanner';
import Settings from './components/settings/Settings';
import Profile from './components/profile/Profile';
import GeofenceSettings from './components/admin/GeofenceSettings';
import CompanyQRCode from './components/admin/CompanyQRCode';
import LateDeductions from './components/admin/LateDeductions';
import BranchManagement from './components/admin/BranchManagement';
import MyDeductions from './components/employee/MyDeductions';
import BranchDashboard from './components/branch/BranchDashboard';
import BranchDashboardOverview from './components/branch/BranchDashboardOverview';
import BranchQRCode from './components/branch/BranchQRCode';
import './App.css';

const THEME_STORAGE_KEY = 'autopayroll-theme-mode';
const THEME_EVENT = 'autopayroll:theme-change';

const App = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const session = getSession();
    const userPreference = session?.user?.preferences?.theme;
    if (userPreference === 'dark') return true;
    if (userPreference === 'light') return false;

    const savedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedPreference) {
      return savedPreference === 'dark';
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleThemeEvent = (event) => {
      const nextMode = event.detail?.mode;
      if (nextMode === 'light' || nextMode === 'dark') {
        setDarkMode(nextMode === 'dark');
      }
    };

    const handleStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY && event.newValue) {
        setDarkMode(event.newValue === 'dark');
      }
    };

    window.addEventListener(THEME_EVENT, handleThemeEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  let theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#246bce',
      },
      secondary: {
        main: '#00897b',
      },
      background: darkMode
        ? {
            default: '#0b1220',
            paper: '#111c30'
          }
        : {
            default: '#f3f6fb',
            paper: '#ffffff'
          },
      divider: darkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.08)',
      text: darkMode
        ? {
            primary: '#e5eefb',
            secondary: '#94a3b8'
          }
        : {
            primary: '#10213f',
            secondary: '#5f6f89'
          }
    },
    shape: {
      borderRadius: 16
    },
    typography: {
      fontFamily: '"Segoe UI Variable", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      h4: {
        fontWeight: 800
      },
      h5: {
        fontWeight: 750
      },
      h6: {
        fontWeight: 700
      }
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderRadius: 20,
            backgroundImage: 'none',
            border: `1px solid ${t.palette.divider}`
          })
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            textTransform: 'none',
            fontWeight: 600
          }
        }
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined'
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            '& .MuiTableCell-head': {
              fontWeight: 700,
              fontSize: 13,
              color: t.palette.text.secondary,
              backgroundColor: t.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(15,23,42,0.03)'
            }
          })
        }
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme: t }) => ({
            '&:hover': {
              backgroundColor: t.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(15,23,42,0.02)'
            }
          })
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme: t }) => ({
            backgroundImage: 'none',
            border: `1px solid ${t.palette.divider}`
          })
        }
      }
    },
  });
  theme = responsiveFontSizes(theme);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
       <SocketProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Admin Routes */}               
               <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><AdminDashboard toggleDarkMode={toggleDarkMode} darkMode={darkMode} /></ProtectedRoute>}>
                <Route index element={<DashboardOverview />} />
                <Route path="dashboard" element={<DashboardOverview />} />
                <Route path="employees" element={<EmployeeManagement />} />
                 <Route path="messaging" element={<MessagingDashboard />} />
                 <Route path="messaging/announcements" element={<AnnouncementForm />} />
                <Route path="scheduling" element={<ShiftScheduling />} />
                <Route path="payroll" element={<PayrollProcessing />} />
                <Route path="attendance" element={<AttendanceDashboard />} />
                <Route path="leave" element={<LeaveManagement />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
                <Route path="geofence" element={<GeofenceSettings />} />
                <Route path="company-qr" element={<CompanyQRCode />} />
                <Route path="late-deductions" element={<LateDeductions />} />
                <Route path="employee-onboarding" element={<EmployeeOnboarding />} />
                <Route path="branches" element={<BranchManagement />} />
              </Route>
              
              {/* Branch Manager / Branch HR Routes */}
              <Route path="/branch" element={<ProtectedRoute allowedRoles={['branch_manager', 'branch_hr']}><BranchDashboard toggleDarkMode={toggleDarkMode} darkMode={darkMode} /></ProtectedRoute>}>
                <Route index element={<BranchDashboardOverview />} />
                <Route path="dashboard" element={<BranchDashboardOverview />} />
                <Route path="employees" element={<EmployeeManagement />} />
                <Route path="scheduling" element={<ShiftScheduling />} />
                <Route path="attendance" element={<AttendanceDashboard />} />
                <Route path="leave" element={<LeaveManagement />} />
                <Route path="payroll" element={<PayrollProcessing />} />
                <Route path="messaging" element={<MessagingDashboard />} />
                <Route path="geofence" element={<GeofenceSettings />} />
                <Route path="branch-qr" element={<BranchQRCode />} />
                <Route path="late-deductions" element={<LateDeductions />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Employee Routes */}
              <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeDashboard toggleDarkMode={toggleDarkMode} darkMode={darkMode} /></ProtectedRoute>}>
                <Route index element={<EmployeeDashboardOverview />} />
                <Route path="dashboard" element={<EmployeeDashboardOverview />} />
                <Route path="messaging" element={<MessagingDashboard />} />
                <Route path="checkin" element={<QRScanner />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="payments" element={<Payments />} />
                <Route path="leave" element={<LeaveRequest />} />
                <Route path="change-password" element={<ChangePassword />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="my-deductions" element={<MyDeductions />} />

              </Route>
            </Routes>
          </div>
        </Router>
      </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const user = currentUser || session.user;

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    const fallbacks = {
      employee:       '/employee/dashboard',
      branch_manager: '/branch/dashboard',
      branch_hr:      '/branch/dashboard',
      admin:          '/admin/dashboard',
      hr:             '/admin/dashboard'
    };
    return <Navigate to={fallbacks[user.role] || '/login'} replace />;
  }

  return children;
}

export default App;
