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
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  BadgeOutlined,
  CalendarToday,
  CameraAlt,
  Edit,
  EmailOutlined,
  LocationOnOutlined,
  PaymentsOutlined,
  PhoneOutlined,
  Save,
  WorkOutlined
} from '@mui/icons-material';
import { getStoredToken, getStoredUser, storeSession } from '../../utils/authSession';
import { apiRequest } from '../../utils/api';

const ROLE_LABEL = {
  admin: 'Administrator',
  hr: 'HR Manager',
  branch_manager: 'Branch Manager',
  branch_hr: 'Branch HR',
  employee: 'Employee'
};

const ROLE_COLOR = {
  admin: 'primary',
  hr: 'secondary',
  branch_manager: 'info',
  branch_hr: 'info',
  employee: 'default'
};

const AVATAR_COLORS = ['#1976d2','#388e3c','#d32f2f','#f57c00','#7b1fa2','#0288d1','#c2185b','#00796b'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const Profile = () => {
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(getStoredUser() || {});
  const [employee, setEmployee] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', momoNumber: '', position: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const avatarPreview = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    return user.avatarUrl || '';
  }, [avatarFile, user.avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarFile, avatarPreview]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const stored = getStoredUser() || {};
        setUser(stored);
        setForm({
          name: stored.name || '',
          phone: stored.phone || '',
          momoNumber: stored.momoNumber || '',
          position: stored.position || ''
        });

        if (stored.role === 'employee') {
          const data = await apiRequest('/employees/me');
          if (data?.success) setEmployee(data.employee || data.data);
        }
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSnack({ open: true, message: 'Please select an image file.', severity: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSnack({ open: true, message: 'Image must be 5 MB or smaller.', severity: 'error' });
      return;
    }
    setAvatarFile(file);
    if (!editing) setEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('phone', form.phone.trim());
      formData.append('momoNumber', form.momoNumber.trim());
      formData.append('position', form.position.trim());
      if (avatarFile) formData.append('avatar', avatarFile);

      const data = await apiRequest('/settings/profile', { method: 'PUT', body: formData });

      if (!data.success) {
        setSnack({ open: true, message: data.message || 'Failed to save profile.', severity: 'error' });
        return;
      }

      // Backend returns { data: { user: { ... } } }
      const serverUser = data.data?.user || {};
      const updated = { ...user, ...form, ...serverUser };
      storeSession(getStoredToken(), updated);
      setUser(updated);
      setAvatarFile(null);
      setEditing(false);
      // Notify dashboards so the navbar avatar updates without a page reload
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updated }));
      setSnack({ open: true, message: 'Profile updated successfully.', severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.message || 'Network error.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const displayData = employee || user;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>My Profile</Typography>

      <Grid container spacing={3}>
        {/* Avatar + identity card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pt: 4, pb: 3 }}>
              {/* Avatar with upload overlay */}
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                <Avatar
                  key={avatarPreview}
                  src={avatarPreview || undefined}
                  sx={{
                    width: 110,
                    height: 110,
                    bgcolor: avatarColor(user.name),
                    fontSize: 40,
                    fontWeight: 700,
                    border: '3px solid',
                    borderColor: 'primary.main'
                  }}
                >
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Tooltip title="Change profile picture">
                  <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 2,
                      right: 2,
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 30,
                      height: 30,
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <CameraAlt sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarSelect}
                />
              </Box>

              {editing ? (
                <TextField
                  size="small"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  sx={{ mb: 1, width: '100%' }}
                  label="Display name"
                />
              ) : (
                <Typography variant="h6" fontWeight={700}>{user.name}</Typography>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {user.email}
              </Typography>

              <Chip
                label={ROLE_LABEL[user.role] || user.role}
                color={ROLE_COLOR[user.role] || 'default'}
                size="small"
                sx={{ mb: 2.5 }}
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {!editing ? (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setEditing(true)}
                    fullWidth
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                      onClick={handleSave}
                      disabled={saving}
                      fullWidth
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => {
                        setEditing(false);
                        setAvatarFile(null);
                        const stored = getStoredUser() || {};
                        setForm({ name: stored.name || '', phone: stored.phone || '', momoNumber: stored.momoNumber || '', position: stored.position || '' });
                      }}
                      fullWidth
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </Box>

              {avatarFile && (
                <Alert severity="info" sx={{ mt: 1.5, textAlign: 'left', fontSize: 12 }}>
                  New photo selected — save to apply it.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Details panel */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Contact Information
              </Typography>
              <List dense disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}><EmailOutlined color="action" fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Email" secondary={user.email} />
                </ListItem>

                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}><PhoneOutlined color="action" fontSize="small" /></ListItemIcon>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      label="Phone number"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  ) : (
                    <ListItemText primary="Phone" secondary={user.phone || displayData?.phone || '—'} />
                  )}
                </ListItem>

                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}><PaymentsOutlined color="action" fontSize="small" /></ListItemIcon>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      label="Mobile money number"
                      value={form.momoNumber}
                      onChange={(e) => setForm(f => ({ ...f, momoNumber: e.target.value }))}
                    />
                  ) : (
                    <ListItemText primary="Mobile Money" secondary={user.momoNumber || displayData?.momoNumber || '—'} />
                  )}
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Employment Information
              </Typography>
              <List dense disablePadding>
                {displayData?.employeeId && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}><BadgeOutlined color="action" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Employee ID" secondary={displayData.employeeId} />
                  </ListItem>
                )}

                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}><WorkOutlined color="action" fontSize="small" /></ListItemIcon>
                  {editing ? (
                    <TextField
                      size="small"
                      fullWidth
                      label="Position / title"
                      value={form.position}
                      onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))}
                    />
                  ) : (
                    <ListItemText primary="Position" secondary={user.position || displayData?.position || '—'} />
                  )}
                </ListItem>

                {displayData?.department && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}><LocationOnOutlined color="action" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Department" secondary={displayData.department} />
                  </ListItem>
                )}

                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}><WorkOutlined color="action" fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primary="Company"
                    secondary={user.company}
                  />
                </ListItem>

                {displayData?.salary > 0 && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}><PaymentsOutlined color="action" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Monthly Salary" secondary={`${Number(displayData.salary).toLocaleString()} FCFA`} />
                  </ListItem>
                )}

                {displayData?.startDate && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}><CalendarToday color="action" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Start Date"
                      secondary={new Date(displayData.startDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                  </ListItem>
                )}

                {displayData?.status && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}><BadgeOutlined color="action" fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary="Status"
                      secondary={
                        <Chip
                          label={displayData.status}
                          color={displayData.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;
