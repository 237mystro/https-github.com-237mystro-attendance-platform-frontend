import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, IconButton, Chip, Alert, LinearProgress, Tooltip, Avatar, Divider,
  Slider, CircularProgress
} from '@mui/material';
import { Add, Edit, Delete, People, Person, Refresh, Store, MyLocation, LocationOn, Save } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiRequest } from '../../utils/api';

// Fix broken Leaflet default marker icons in webpack/CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl:       require('leaflet/dist/images/marker-icon.png'),
  shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
});

const DEFAULT_CENTER = [4.1025, 9.3908];

const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({ click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const MapCentre = ({ position }) => {
  const map = useMapEvents({});
  const done = useRef(false);
  useEffect(() => {
    if (position && !done.current) { map.setView(position, 17); done.current = true; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);
  return null;
};

// Fixes blank tiles when the map first renders inside a Dialog
const MapInvalidator = () => {
  const map = useMapEvents({});
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

// Single-shot getCurrentPosition — more reliable than watchPosition
const getAccurateLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation is not supported by this browser.')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        if (err.code === 1) reject(new Error('Location access denied. Please allow location in your browser settings.'));
        else if (err.code === 2) reject(new Error('Location unavailable. Make sure GPS / location services are enabled.'));
        else reject(new Error('Location request timed out. Please try again.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

const AVATAR_COLORS = ['#1976d2','#388e3c','#d32f2f','#f57c00','#7b1fa2','#0288d1'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const BranchManagement = () => {
  const [branches, setBranches]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Create / Edit branch dialog
  const [branchOpen, setBranchOpen]       = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm]       = useState({ name: '', address: '' });
  const [branchErr, setBranchErr]         = useState('');
  const [saving, setSaving]               = useState(false);

  // Assign role dialog
  const [assignOpen, setAssignOpen]     = useState(false);
  const [assignBranch, setAssignBranch] = useState(null);
  const [assignForm, setAssignForm]     = useState({ userId: '', role: 'branch_manager' });
  const [assignErr, setAssignErr]       = useState('');
  const [assigning, setAssigning]       = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);

  // Geofence dialog
  const [geoOpen, setGeoOpen]           = useState(false);
  const [geoBranch, setGeoBranch]       = useState(null);
  const [geoMarker, setGeoMarker]       = useState(null);
  const [geoRadius, setGeoRadius]       = useState(100);
  const [geoAddress, setGeoAddress]     = useState('');
  const [geoSearch, setGeoSearch]       = useState('');
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoLocating, setGeoLocating]   = useState(false);
  const [geoSaving, setGeoSaving]       = useState(false);
  const [geoLoading, setGeoLoading]     = useState(false);
  const [geoAlert, setGeoAlert]         = useState(null);
  const markerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [brRes, empRes] = await Promise.all([
        apiRequest('/branches'),
        apiRequest('/employees')
      ]);
      if (brRes?.success)  setBranches(brRes.data || []);
      if (empRes?.success) setEmployees(empRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Branch CRUD ─────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', address: '' });
    setBranchErr('');
    setBranchOpen(true);
  };

  const openEdit = (branch) => {
    setEditingBranch(branch);
    setBranchForm({ name: branch.name, address: branch.address || '' });
    setBranchErr('');
    setBranchOpen(true);
  };

  const saveBranch = async () => {
    if (!branchForm.name.trim()) { setBranchErr('Branch name is required.'); return; }
    setSaving(true);
    try {
      const url    = editingBranch ? `/branches/${editingBranch._id}` : '/branches';
      const method = editingBranch ? 'PUT' : 'POST';
      const data   = await apiRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchForm)
      });
      if (data?.success) {
        setSuccess(editingBranch ? 'Branch updated.' : 'Branch created.');
        setBranchOpen(false);
        fetchAll();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setBranchErr(data?.message || 'Save failed.');
      }
    } catch (err) {
      setBranchErr(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const data = await apiRequest(`/branches/${deleteId}`, { method: 'DELETE' });
      if (data?.success) {
        setSuccess('Branch removed.');
        setDeleteId(null);
        fetchAll();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data?.message || 'Delete failed.');
        setDeleteId(null);
      }
    } catch (err) {
      setError(err.message || 'Delete failed.');
      setDeleteId(null);
    }
  };

  // ── Role assignment ──────────────────────────────────────────────────────────

  const openAssign = (branch) => {
    setAssignBranch(branch);
    setAssignForm({ userId: '', role: 'branch_manager' });
    setAssignErr('');
    setAssignOpen(true);
  };

  const submitAssign = async () => {
    if (!assignForm.userId) { setAssignErr('Please select an employee.'); return; }
    setAssigning(true);
    try {
      const data = await apiRequest(`/branches/${assignBranch._id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm)
      });
      if (data?.success) {
        setSuccess('Role assigned successfully.');
        setAssignOpen(false);
        fetchAll();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setAssignErr(data?.message || 'Assignment failed.');
      }
    } catch (err) {
      setAssignErr(err.message || 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  // ── Geofence ─────────────────────────────────────────────────────────────────

  const openGeofence = async (branch) => {
    setGeoBranch(branch);
    setGeoMarker(null);
    setGeoRadius(100);
    setGeoAddress('');
    setGeoSearch('');
    setGeoAlert(null);
    setGeoOpen(true);
    setGeoLoading(true);
    try {
      const data = await apiRequest(`/branches/${branch._id}/geofence`);
      if (data?.success && data.geofence?.latitude) {
        const { latitude, longitude, radius: r, address: a } = data.geofence;
        setGeoMarker([latitude, longitude]);
        setGeoRadius(r || 100);
        setGeoAddress(a || '');
      }
    } catch { /* no geofence set yet */ }
    finally { setGeoLoading(false); }
  };

  const handleGeoSearch = async () => {
    if (!geoSearch.trim()) return;
    setGeoSearching(true);
    setGeoAlert(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geoSearch)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      if (!results.length) { setGeoAlert({ severity: 'warning', message: 'No results found.' }); return; }
      const { lat, lon, display_name } = results[0];
      setGeoMarker([parseFloat(lat), parseFloat(lon)]);
      setGeoAddress(display_name);
    } catch {
      setGeoAlert({ severity: 'error', message: 'Address search failed.' });
    } finally {
      setGeoSearching(false);
    }
  };

  const handleGeoLocate = async () => {
    setGeoLocating(true);
    setGeoAlert(null);
    try {
      const loc = await getAccurateLocation();
      setGeoMarker([loc.latitude, loc.longitude]);
      setGeoAlert({ severity: 'success', message: `Location captured (±${Math.round(loc.accuracy)} m). Drag pin to fine-tune.` });
    } catch (err) {
      setGeoAlert({ severity: 'error', message: err.message });
    } finally {
      setGeoLocating(false);
    }
  };

  const handleMarkerDragEnd = useCallback(() => {
    const ll = markerRef.current?.getLatLng();
    if (ll) setGeoMarker([ll.lat, ll.lng]);
  }, []);

  const saveGeofence = async () => {
    if (!geoMarker) { setGeoAlert({ severity: 'error', message: 'Place a marker on the map first.' }); return; }
    setGeoSaving(true);
    setGeoAlert(null);
    try {
      const data = await apiRequest(`/branches/${geoBranch._id}/geofence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: geoMarker[0], longitude: geoMarker[1], radius: geoRadius, address: geoAddress })
      });
      if (data?.success) {
        setGeoAlert({ severity: 'success', message: `Geofence saved — ${geoRadius} m radius.` });
        fetchAll();
      } else {
        setGeoAlert({ severity: 'error', message: data?.message || 'Save failed.' });
      }
    } catch (err) {
      setGeoAlert({ severity: 'error', message: err.message || 'Save failed.' });
    } finally {
      setGeoSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1a2f52' }}>Branch Management</Typography>
          <Typography variant="body2" color="text.secondary">
            {branches.length} branch{branches.length !== 1 ? 'es' : ''} registered
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh"><IconButton onClick={fetchAll}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>New Branch</Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Branch Cards */}
      {!loading && branches.length === 0 && (
        <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3, p: 6, textAlign: 'center' }}>
          <Store sx={{ fontSize: 48, color: '#90a4ae', mb: 2 }} />
          <Typography color="text.secondary">No branches yet. Click "New Branch" to add your first one.</Typography>
        </Card>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {branches.map(branch => (
          <Card key={branch._id} elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                {/* Branch info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, background: 'linear-gradient(135deg,#1565c0,#42a5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Store sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{branch.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{branch.address || 'No address set'}</Typography>
                  </Box>
                </Box>

                {/* Stats + actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Chip icon={<People sx={{ fontSize: 14 }} />} label={`${branch.employeeCount ?? 0} employees`} size="small" variant="outlined" />
                  <Chip
                    icon={<MyLocation sx={{ fontSize: 14 }} />}
                    label={branch.geofence?.latitude ? `Geofence: ${branch.geofence.radius ?? 100} m` : 'No geofence'}
                    size="small"
                    color={branch.geofence?.latitude ? 'success' : 'warning'}
                    variant="outlined"
                    onClick={() => openGeofence(branch)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Tooltip title="Set Geofence">
                    <Button size="small" variant="outlined" color="success" startIcon={<MyLocation />} onClick={() => openGeofence(branch)}>
                      Geofence
                    </Button>
                  </Tooltip>
                  <Tooltip title="Assign Manager/HR">
                    <Button size="small" variant="outlined" startIcon={<Person />} onClick={() => openAssign(branch)}>
                      Assign Role
                    </Button>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(branch)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(branch._id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Geofence address preview */}
              {branch.geofence?.address && (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MyLocation sx={{ fontSize: 13, color: '#388e3c' }} />
                  <Typography variant="caption" color="text.secondary">{branch.geofence.address}</Typography>
                </Box>
              )}

              {/* Manager / HR row */}
              {(branch.managerId || branch.hrId) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {branch.managerId && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: avatarColor(branch.managerId.name), fontSize: 13, fontWeight: 700 }}>
                          {branch.managerId.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Branch Manager</Typography>
                          <Typography variant="body2" fontWeight={600}>{branch.managerId.name}</Typography>
                        </Box>
                      </Box>
                    )}
                    {branch.hrId && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: avatarColor(branch.hrId.name), fontSize: 13, fontWeight: 700 }}>
                          {branch.hrId.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Branch HR</Typography>
                          <Typography variant="body2" fontWeight={600}>{branch.hrId.name}</Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ── Create / Edit Branch Dialog ── */}
      <Dialog open={branchOpen} onClose={() => setBranchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editingBranch ? 'Edit Branch' : 'New Branch'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {branchErr && <Alert severity="error" sx={{ mb: 2 }}>{branchErr}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Branch Name" value={branchForm.name} onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))} fullWidth required />
            <TextField label="Address (optional)" value={branchForm.address} onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBranchOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveBranch} disabled={saving}>
            {saving ? 'Saving…' : editingBranch ? 'Update' : 'Create Branch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign Role Dialog ── */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Assign Role — {assignBranch?.name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {assignErr && <Alert severity="error" sx={{ mb: 2 }}>{assignErr}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select an employee from your company to act as manager or HR for this branch. They will gain access to the branch dashboard.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select value={assignForm.userId} label="Employee" onChange={e => setAssignForm(p => ({ ...p, userId: e.target.value }))}>
                {employees.map(emp => (
                  <MenuItem key={emp._id} value={emp.userId?._id || emp.userId || emp._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: avatarColor(emp.name), fontSize: 11, fontWeight: 700 }}>
                        {emp.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{emp.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{emp.position}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={assignForm.role} label="Role" onChange={e => setAssignForm(p => ({ ...p, role: e.target.value }))}>
                <MenuItem value="branch_manager">Branch Manager — full branch access + payroll</MenuItem>
                <MenuItem value="branch_hr">Branch HR — employee & attendance management</MenuItem>
                <MenuItem value="employee">Remove role (revert to Employee)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignOpen(false)} disabled={assigning}>Cancel</Button>
          <Button variant="contained" onClick={submitAssign} disabled={assigning}>
            {assigning ? 'Saving…' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Geofence Dialog ── */}
      <Dialog open={geoOpen} onClose={() => setGeoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          Geofence — {geoBranch?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 1, px: 2 }}>
          {geoLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <>
              {geoAlert && (
                <Alert severity={geoAlert.severity} sx={{ mb: 1.5 }} onClose={() => setGeoAlert(null)}>
                  {geoAlert.message}
                </Alert>
              )}

              {/* Search + GPS row */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <TextField
                  size="small"
                  placeholder="Search address or place name…"
                  value={geoSearch}
                  onChange={e => setGeoSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGeoSearch()}
                  sx={{ flex: 1, minWidth: 180 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleGeoSearch}
                  disabled={geoSearching}
                  startIcon={geoSearching ? <CircularProgress size={14} color="inherit" /> : <LocationOn />}
                >
                  {geoSearching ? 'Searching…' : 'Search'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGeoLocate}
                  disabled={geoLocating}
                  startIcon={geoLocating ? <CircularProgress size={14} color="inherit" /> : <MyLocation />}
                >
                  {geoLocating ? 'Locating…' : 'My Location'}
                </Button>
              </Box>

              {geoAddress && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {geoAddress}
                </Typography>
              )}

              {/* Map — only mount once dialog is open and API call is done */}
              <Box sx={{ height: 380, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #e8ecf3', mb: 2 }}>
                {geoOpen && !geoLoading && (
                  <MapContainer
                    key={geoBranch?._id}
                    center={geoMarker || DEFAULT_CENTER}
                    zoom={17}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <MapInvalidator />
                    <MapClickHandler onLocationSelect={(lat, lng) => setGeoMarker([lat, lng])} />
                    {geoMarker && <MapCentre position={geoMarker} />}
                    {geoMarker && (
                      <>
                        <Marker
                          position={geoMarker}
                          draggable
                          ref={markerRef}
                          eventHandlers={{ dragend: handleMarkerDragEnd }}
                        />
                        <Circle
                          center={geoMarker}
                          radius={geoRadius}
                          pathOptions={{ color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.13, weight: 2 }}
                        />
                      </>
                    )}
                  </MapContainer>
                )}
              </Box>

              {/* Radius slider */}
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Radius:&nbsp;
                  <Typography component="span" fontWeight={700} color="primary.main">{geoRadius} m</Typography>
                </Typography>
                <Slider
                  value={geoRadius}
                  min={30} max={200} step={5}
                  onChange={(_, v) => setGeoRadius(v)}
                  marks={[
                    { value: 30, label: '30 m' },
                    { value: 100, label: '100 m' },
                    { value: 200, label: '200 m' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>

              {geoMarker && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Lat/Lng: {geoMarker[0].toFixed(6)}, {geoMarker[1].toFixed(6)} · Radius: {geoRadius} m
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGeoOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={geoSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={saveGeofence}
            disabled={geoSaving || !geoMarker || geoLoading}
          >
            {geoSaving ? 'Saving…' : 'Save Geofence'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Remove Branch?</DialogTitle>
        <DialogContent>
          <Typography>
            This will deactivate the branch and remove all branch manager/HR assignments. Employees in this branch will become unassigned. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Remove</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BranchManagement;
