import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import {
  CloudDownload,
  Key,
  Notifications,
  Palette,
  PhotoCamera,
  Save,
  Security
} from '@mui/icons-material';
import { getStoredToken, getStoredUser, storeSession } from '../../utils/authSession';
import { apiRequest } from '../../utils/api';
import {
  getNotificationPermission,
  requestNotificationPermission
} from '../../utils/deviceNotifications';

const THEME_EVENT = 'autopayroll:theme-change';
const THEME_STORAGE_KEY = 'autopayroll-theme-mode';

const emptyPassword = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

const Settings = () => {
  const fileInputRef = useRef(null);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true
    },
    preferences: {
      theme: 'light',
      language: 'en'
    },
    security: {
      twoFactorAuth: false
    }
  });
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    momoNumber: '',
    position: '',
    avatarUrl: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [password, setPassword] = useState(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }
    return profile.avatarUrl || '';
  }, [avatarFile, profile.avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarFile, avatarPreview]);

  useEffect(() => {
    const promptHandler = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };

    const installHandler = () => {
      setInstalled(true);
      setDeferredInstallPrompt(null);
    };

    setInstalled(
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone === true
    );

    window.addEventListener('beforeinstallprompt', promptHandler);
    window.addEventListener('appinstalled', installHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', promptHandler);
      window.removeEventListener('appinstalled', installHandler);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/settings');
      if (data.success) {
        const payload = data.data || {};
        setSettings((prev) => ({
          notifications: payload.notifications || prev.notifications,
          preferences: payload.preferences || prev.preferences,
          security: payload.security || prev.security
        }));
      } else {
        setError(data.message || 'Failed to fetch settings.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    const user = getStoredUser() || {};
    setProfile({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      momoNumber: user.momoNumber || '',
      position: user.position || '',
      avatarUrl: user.avatarUrl || ''
    });
  };

  useEffect(() => {
    fetchSettings();
    fetchProfile();
  }, []);

  const syncSessionUser = (nextFields) => {
    const user = getStoredUser() || {};
    storeSession(getStoredToken(), { ...user, ...nextFields });
  };

  const handleNotificationChange = (field) => async (event) => {
    const checked = event.target.checked;

    if (field === 'push' && checked && notificationPermission !== 'granted') {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') {
        setError('Device notifications were not enabled. Please allow notification access in your browser.');
        return;
      }
    }

    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: checked
      }
    }));
  };

  const handlePreferenceChange = (field) => (event) => {
    setSettings((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: event.target.value
      }
    }));
  };

  const handleProfileChange = (field) => (event) => {
    setProfile((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePasswordChange = (field) => (event) => {
    setPassword((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file for your profile picture.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile image must be 5 MB or smaller.');
      return;
    }

    setError('');
    setAvatarFile(file);
  };

  const saveSettings = async () => {
    try {
      setSavingSection('settings');
      setError('');
      setSuccess('');

      const data = await apiRequest('/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!data.success) {
        setError(data.message || 'Failed to save settings.');
        return;
      }

      const themeMode = settings.preferences.theme || 'light';
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
      window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { mode: themeMode } }));
      syncSessionUser({
        preferences: settings.preferences,
        notifications: settings.notifications
      });
      setSuccess('Settings saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSavingSection('');
    }
  };

  const saveProfile = async () => {
    try {
      setSavingSection('profile');
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('email', profile.email);
      formData.append('phone', profile.phone);
      formData.append('momoNumber', profile.momoNumber);
      formData.append('position', profile.position);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const data = await apiRequest('/settings/profile', {
        method: 'PUT',
        body: formData
      });

      if (!data.success) {
        setError(data.message || 'Failed to update profile.');
        return;
      }

      storeSession(getStoredToken(), data.data.user);
      setProfile((prev) => ({
        ...prev,
        avatarUrl: data.data.user.avatarUrl || prev.avatarUrl
      }));
      setAvatarFile(null);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSavingSection('');
    }
  };

  const changePassword = async () => {
    try {
      setSavingSection('password');
      setError('');
      setSuccess('');

      if (!password.currentPassword || !password.newPassword || !password.confirmPassword) {
        setError('Please complete all password fields.');
        return;
      }
      if (password.newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (password.newPassword !== password.confirmPassword) {
        setError('New passwords do not match.');
        return;
      }

      const data = await apiRequest('/settings/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword
        })
      });

      if (!data.success) {
        setError(data.message || 'Failed to change password.');
        return;
      }

      setPassword(emptyPassword);
      setSuccess('Password changed successfully.');
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setSavingSection('');
    }
  };

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) {
      if (!installed) {
        setError('Install is not currently available on this device. Try opening the site in Chrome or Edge.');
      }
      return;
    }

    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result?.outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredInstallPrompt(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Settings
        </Typography>
        <Typography color="text.secondary">
          Manage your profile, notifications, appearance, and account security from one place.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
                <Avatar
                  src={avatarPreview || undefined}
                  sx={{
                    width: 92,
                    height: 92,
                    bgcolor: 'primary.main',
                    fontSize: 34,
                    fontWeight: 700
                  }}
                >
                  {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={700}>Profile Information</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
                    Upload a profile picture and keep your personal details up to date.
                  </Typography>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarSelect}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<PhotoCamera />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ textTransform: 'none' }}
                  >
                    Upload Photo
                  </Button>
                </Box>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Full Name" value={profile.name} onChange={handleProfileChange('name')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Email Address" value={profile.email} onChange={handleProfileChange('email')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Phone Number" value={profile.phone} onChange={handleProfileChange('phone')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Mobile Money Number" value={profile.momoNumber} onChange={handleProfileChange('momoNumber')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Position" value={profile.position} onChange={handleProfileChange('position')} />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={savingSection === 'profile' ? <CircularProgress size={18} color="inherit" /> : <Save />}
                  onClick={saveProfile}
                  disabled={savingSection === 'profile'}
                >
                  Save Profile
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={2.5}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Notifications color="primary" /> Notification Preferences
                </Typography>
                <Stack spacing={1.5}>
                  <FormControlLabel
                    control={<Switch checked={settings.notifications.email} onChange={handleNotificationChange('email')} />}
                    label="Email notifications"
                  />
                  <FormControlLabel
                    control={<Switch checked={settings.notifications.sms} onChange={handleNotificationChange('sms')} />}
                    label="SMS notifications"
                  />
                  <FormControlLabel
                    control={<Switch checked={settings.notifications.push} onChange={handleNotificationChange('push')} />}
                    label="Device notifications"
                  />
                </Stack>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    color={notificationPermission === 'granted' ? 'success' : notificationPermission === 'denied' ? 'error' : 'default'}
                    label={
                      notificationPermission === 'granted'
                        ? 'Device alerts enabled'
                        : notificationPermission === 'denied'
                          ? 'Notifications blocked'
                          : 'Notifications not enabled'
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    Messages and announcements will trigger device alerts when permission is granted.
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Palette color="primary" /> Appearance & Install
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="theme-label">Theme</InputLabel>
                      <Select
                        labelId="theme-label"
                        value={settings.preferences.theme}
                        label="Theme"
                        onChange={handlePreferenceChange('theme')}
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="language-label">Language</InputLabel>
                      <Select
                        labelId="language-label"
                        value={settings.preferences.language}
                        label="Language"
                        onChange={handlePreferenceChange('language')}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box>
                    <Typography fontWeight={700}>Install on your phone</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add AutoPayroll to the home screen for an app-like experience on mobile.
                    </Typography>
                  </Box>
                  <Button
                    variant={installed ? 'outlined' : 'contained'}
                    startIcon={<CloudDownload />}
                    onClick={handleInstallApp}
                    disabled={installed}
                  >
                    {installed ? 'Installed' : 'Install App'}
                  </Button>
                </Box>

                <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={savingSection === 'settings' ? <CircularProgress size={18} color="inherit" /> : <Save />}
                    onClick={saveSettings}
                    disabled={savingSection === 'settings'}
                  >
                    Save Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Security color="primary" /> Security
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.security.twoFactorAuth}
                    onChange={(event) => setSettings((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        twoFactorAuth: event.target.checked
                      }
                    }))}
                  />
                }
                label="Two-factor authentication"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    value={password.currentPassword}
                    onChange={handlePasswordChange('currentPassword')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    value={password.newPassword}
                    onChange={handlePasswordChange('newPassword')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type="password"
                    value={password.confirmPassword}
                    onChange={handlePasswordChange('confirmPassword')}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={savingSection === 'password' ? <CircularProgress size={18} color="inherit" /> : <Key />}
                  onClick={changePassword}
                  disabled={savingSection === 'password'}
                >
                  Change Password
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
