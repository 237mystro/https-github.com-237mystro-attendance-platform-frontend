import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Box, Button, Card, CardContent, Typography, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, Slider, CircularProgress, Stepper, Step, StepLabel,
  Divider, Tooltip, Stack, Badge, Tab, Tabs
} from '@mui/material';
import {
  Add, Delete, QrCode, Download, LocationOn, ContentCopy, MyLocation,
  People, AccessTime, CheckCircle, ArrowForward, ArrowBack,
  TableChart, Event as EventIcon, Close, Visibility
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';
import { getUserLocation } from '../../utils/locationVerification';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// ── Map helpers ───────────────────────────────────────────────────────────────

const MapClickHandler = ({ onSelect }) => {
  useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const MapCentre = ({ position }) => {
  const map = useMapEvents({});
  useEffect(() => { if (position) map.setView(position, 17); }, [map, position]);
  return null;
};

const MapInvalidator = () => {
  const map = useMapEvents({});
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 250); return () => clearTimeout(t); }, [map]);
  return null;
};

// ── Excel export (no external package needed) ────────────────────────────────

const exportToExcel = (headers, rows, filename) => {
  const table = `
    <table>
      <thead><tr>${headers.map(h => `<th style="background:#1976d2;color:#fff;font-weight:bold;padding:8px;border:1px solid #ccc">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row, i) =>
        `<tr style="background:${i % 2 ? '#f5f5f5' : '#fff'}">${row.map(cell =>
          `<td style="padding:6px;border:1px solid #e0e0e0">${cell == null ? '' : String(cell).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`
        ).join('')}</tr>`
      ).join('')}</tbody>
    </table>`;
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body>${table}</body></html>`;
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.xls';
  a.click();
  URL.revokeObjectURL(url);
};

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CENTER = [4.1025, 9.3908];
const WIZARD_STEPS = ['Select Fields', 'Set Location', 'Event Details'];

const PRESET_FIELDS = [
  { name: 'name',         label: 'Full Name',     type: 'text' },
  { name: 'email',        label: 'Email',         type: 'email' },
  { name: 'phone',        label: 'Phone',         type: 'text' },
  { name: 'age',          label: 'Age',           type: 'number' },
  { name: 'gender',       label: 'Gender',        type: 'select', options: ['Male', 'Female', 'Prefer not to say'] },
  { name: 'organization', label: 'Organization',  type: 'text' },
  { name: 'occupation',   label: 'Occupation',    type: 'text' },
  { name: 'nationality',  label: 'Nationality',   type: 'text' },
];

const FIELD_TYPES = ['text', 'email', 'number', 'date', 'select'];

const emptyForm = () => ({
  title: '',
  description: '',
  date: '',
  location: { latitude: '', longitude: '', radius: 100, address: '' },
  requiredFields: [],
});

const emptyNewField = () => ({ name: '', label: '', type: 'text', options: '' });

// ── Helper to get attendee cell value ────────────────────────────────────────

const cellValue = (attendee, field) => {
  if (['name', 'email', 'phone', 'age'].includes(field.name)) return attendee[field.name] ?? '';
  return attendee.customFields?.[field.name] ?? '';
};

// ── Main component ────────────────────────────────────────────────────────────

const EventManagement = () => {
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [tab, setTab]               = useState(0); // 0 = upcoming, 1 = past

  // Wizard
  const [wizardOpen, setWizardOpen]     = useState(false);
  const [activeStep, setActiveStep]     = useState(0);
  const [formData, setFormData]         = useState(emptyForm());
  const [allFields, setAllFields]       = useState(PRESET_FIELDS);
  const [newField, setNewField]         = useState(emptyNewField());
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [locating, setLocating]         = useState(false);
  const [creating, setCreating]         = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null); // QR step after creation
  const markerRef = useRef(null);

  // Detail / attendee dialog
  const [detailEvent, setDetailEvent]       = useState(null);
  const [attendees, setAttendees]           = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/events');
      setEvents(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (event) => {
    setDetailEvent(event);
    setAttendees([]);
    setLoadingAttendees(true);
    try {
      const data = await apiRequest(`/events/${event._id}/attendees`);
      setAttendees(data.data || []);
    } catch {
      setAttendees(event.attendees || []);
    } finally {
      setLoadingAttendees(false);
    }
  };

  // ── Wizard helpers ─────────────────────────────────────────────────────────

  const openWizard = () => {
    setFormData(emptyForm());
    setAllFields(PRESET_FIELDS);
    setNewField(emptyNewField());
    setCreatedEvent(null);
    setActiveStep(0);
    setError('');
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setCreatedEvent(null);
  };

  const toggleField = (field) => {
    const exists = formData.requiredFields.find(f => f.name === field.name);
    setFormData(prev => ({
      ...prev,
      requiredFields: exists
        ? prev.requiredFields.filter(f => f.name !== field.name)
        : [...prev.requiredFields, { ...field, required: true }]
    }));
  };

  const addCustomField = () => {
    if (!newField.label.trim()) { setError('Please enter a field label.'); return; }
    const name = newField.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field_' + Date.now();
    if (allFields.find(f => f.name === name)) { setError('A field with that name already exists.'); return; }
    const field = {
      name,
      label: newField.label.trim(),
      type: newField.type,
      options: newField.type === 'select' ? newField.options.split(',').map(s => s.trim()).filter(Boolean) : [],
      required: true
    };
    setAllFields(prev => [...prev, field]);
    setFormData(prev => ({ ...prev, requiredFields: [...prev.requiredFields, field] }));
    setNewField(emptyNewField());
    setAddFieldOpen(false);
    setError('');
  };

  const setMapLocation = (lat, lng) => {
    setFormData(prev => ({ ...prev, location: { ...prev.location, latitude: lat, longitude: lng } }));
  };

  const handleMarkerDrag = useCallback(() => {
    const ll = markerRef.current?.getLatLng();
    if (ll) setFormData(prev => ({ ...prev, location: { ...prev.location, latitude: ll.lat, longitude: ll.lng } }));
  }, []);

  const handleUseMyLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const loc = await getUserLocation();
      setMapLocation(loc.latitude, loc.longitude);
    } catch (err) {
      setError(err.message || 'Failed to get your location.');
    } finally {
      setLocating(false);
    }
  };

  const canAdvance = () => {
    if (activeStep === 0) return formData.requiredFields.length > 0;
    if (activeStep === 1) return !!formData.location.latitude && !!formData.location.longitude;
    if (activeStep === 2) return formData.title.trim() && formData.date;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) { setError(stepValidationMessage()); return; }
    setError('');
    setActiveStep(s => s + 1);
  };

  const stepValidationMessage = () => {
    if (activeStep === 0) return 'Select at least one field for attendees to fill in.';
    if (activeStep === 1) return 'Click on the map or use "My Location" to set the event location.';
    if (activeStep === 2) return 'Please enter an event title and date.';
    return '';
  };

  const handleCreate = async () => {
    if (!canAdvance()) { setError(stepValidationMessage()); return; }
    setError('');
    setCreating(true);
    try {
      const payload = {
        ...formData,
        location: {
          ...formData.location,
          latitude:  Number(formData.location.latitude),
          longitude: Number(formData.location.longitude),
          radius:    Number(formData.location.radius) || 100,
        }
      };
      const data = await apiRequest('/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setCreatedEvent(data.data);
      fetchEvents();
    } catch (err) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event and all its attendee data?')) return;
    try {
      await apiRequest(`/events/${eventId}`, { method: 'DELETE' });
      fetchEvents();
      if (detailEvent?._id === eventId) setDetailEvent(null);
    } catch (err) {
      setError(err.message || 'Failed to delete event.');
    }
  };

  // ── Excel download ─────────────────────────────────────────────────────────

  const downloadExcel = (event, rows) => {
    const fields = event.requiredFields?.length
      ? event.requiredFields
      : [{ name: 'name', label: 'Name' }, { name: 'email', label: 'Email' }];
    const headers = [...fields.map(f => f.label || f.name), 'Submitted At'];
    const data = rows.map(a => [
      ...fields.map(f => cellValue(a, f)),
      new Date(a.submittedAt).toLocaleString()
    ]);
    exportToExcel(headers, data, (event.title || 'event') + '-attendees');
  };

  const downloadQR = (event) => {
    const a = document.createElement('a');
    a.href = event.qrCode;
    a.download = (event.title || 'event') + '-qr.png';
    a.click();
  };

  // ── Split events ───────────────────────────────────────────────────────────

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past     = events.filter(e => new Date(e.date) <  now).sort((a, b) => new Date(b.date) - new Date(a.date));
  const displayed = tab === 0 ? upcoming : past;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Event Management</Typography>
          <Typography variant="body2" color="text.secondary">Create events, set geofences, generate QR codes and track attendance.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openWizard} size="large">
          Create Event
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={
          <Badge badgeContent={upcoming.length} color="primary" max={99}>
            <span style={{ paddingRight: upcoming.length > 0 ? 12 : 0 }}>Upcoming</span>
          </Badge>
        } />
        <Tab label={
          <Badge badgeContent={past.length} color="default" max={99}>
            <span style={{ paddingRight: past.length > 0 ? 12 : 0 }}>Past Events</span>
          </Badge>
        } />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : displayed.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
          <EventIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {tab === 0 ? 'No upcoming events. Create one to get started.' : 'No past events yet.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {displayed.map(event => (
            <Grid item xs={12} sm={6} lg={4} key={event._id}>
              <EventCard
                event={event}
                onView={() => openDetail(event)}
                onDownloadQR={() => downloadQR(event)}
                onDelete={() => handleDelete(event._id)}
                onDownloadExcel={() => downloadExcel(event, event.attendees || [])}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Create Wizard Dialog ──────────────────────────────────────────── */}
      <Dialog open={wizardOpen} onClose={closeWizard} maxWidth="md" fullWidth
        PaperProps={{ sx: { minHeight: 560 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
            {createdEvent ? '🎉 Event Created!' : 'Create New Event'}
          </Typography>
          <IconButton onClick={closeWizard}><Close /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {createdEvent ? (
            /* ── QR Code display after creation ── */
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>{createdEvent.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your event has been created. Share the QR code below with attendees.
              </Typography>
              <Box sx={{ display: 'inline-block', p: 2, border: '2px solid', borderColor: 'primary.main', borderRadius: 3, mb: 2 }}>
                <img src={createdEvent.qrCode} alt="Event QR Code"
                  style={{ width: 220, height: 220, display: 'block' }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, wordBreak: 'break-all' }}>
                {createdEvent.link}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center">
                <Button variant="contained" startIcon={<Download />} onClick={() => downloadQR(createdEvent)}>
                  Download QR
                </Button>
                <Button variant="outlined" startIcon={<ContentCopy />}
                  onClick={() => navigator.clipboard?.writeText(createdEvent.link)}>
                  Copy Link
                </Button>
              </Stack>
            </Box>
          ) : (
            <>
              {/* Stepper */}
              <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                {WIZARD_STEPS.map(label => (
                  <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
              </Stepper>

              {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

              {/* ── Step 0: Select Fields ── */}
              {activeStep === 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    What information do you need from attendees?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Click a field to select it. Selected fields will appear on the attendance form.
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    {allFields.map(field => {
                      const selected = !!formData.requiredFields.find(f => f.name === field.name);
                      return (
                        <Chip
                          key={field.name}
                          label={field.label}
                          onClick={() => toggleField(field)}
                          color={selected ? 'primary' : 'default'}
                          variant={selected ? 'filled' : 'outlined'}
                          icon={selected ? <CheckCircle /> : undefined}
                          sx={{ cursor: 'pointer', fontWeight: selected ? 700 : 400 }}
                        />
                      );
                    })}
                  </Box>

                  {formData.requiredFields.length > 0 && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Selected: {formData.requiredFields.map(f => f.label).join(', ')}
                    </Alert>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Need a field that's not listed?
                  </Typography>
                  <Button variant="outlined" startIcon={<Add />} onClick={() => setAddFieldOpen(true)} size="small">
                    Add Custom Field
                  </Button>
                </Box>
              )}

              {/* ── Step 1: Set Location ── */}
              {activeStep === 1 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Set the Event Location & Geofence
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Click on the map to place the event pin, or use your current location. Drag the pin to adjust.
                  </Typography>
                  <Box sx={{ height: 340, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', mb: 2 }}>
                    <MapContainer
                      center={
                        formData.location.latitude && formData.location.longitude
                          ? [Number(formData.location.latitude), Number(formData.location.longitude)]
                          : DEFAULT_CENTER
                      }
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors' />
                      <MapInvalidator />
                      <MapClickHandler onSelect={setMapLocation} />
                      {formData.location.latitude && formData.location.longitude && (
                        <>
                          <MapCentre position={[Number(formData.location.latitude), Number(formData.location.longitude)]} />
                          <Marker
                            position={[Number(formData.location.latitude), Number(formData.location.longitude)]}
                            draggable
                            ref={markerRef}
                            eventHandlers={{ dragend: handleMarkerDrag }}
                          />
                          <Circle
                            center={[Number(formData.location.latitude), Number(formData.location.longitude)]}
                            radius={Number(formData.location.radius) || 100}
                            pathOptions={{ color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.13, weight: 2 }}
                          />
                        </>
                      )}
                    </MapContainer>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Button variant="outlined" startIcon={locating ? <CircularProgress size={16} /> : <MyLocation />}
                      onClick={handleUseMyLocation} disabled={locating} size="small">
                      {locating ? 'Getting location…' : 'Use My Location'}
                    </Button>
                    {formData.location.latitude && formData.location.longitude && (
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        📍 {Number(formData.location.latitude).toFixed(5)}, {Number(formData.location.longitude).toFixed(5)}
                      </Typography>
                    )}
                  </Stack>

                  <TextField fullWidth label="Venue name or address (optional)"
                    value={formData.location.address}
                    onChange={e => setFormData(p => ({ ...p, location: { ...p.location, address: e.target.value } }))}
                    sx={{ mb: 2 }} size="small" />

                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Check-in radius: <strong>{formData.location.radius} m</strong>
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (attendees must be within this distance to submit)
                    </Typography>
                  </Typography>
                  <Slider
                    value={Number(formData.location.radius) || 100}
                    min={10} max={1000} step={10}
                    marks={[{ value: 50, label: '50m' }, { value: 200, label: '200m' }, { value: 500, label: '500m' }, { value: 1000, label: '1km' }]}
                    valueLabelDisplay="auto"
                    onChange={(_, v) => setFormData(p => ({ ...p, location: { ...p.location, radius: v } }))}
                  />
                </Box>
              )}

              {/* ── Step 2: Event Details ── */}
              {activeStep === 2 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Event Details
                  </Typography>
                  <TextField fullWidth required label="Event Title"
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    sx={{ mb: 2 }} />
                  <TextField fullWidth multiline rows={3} label="Description (optional)"
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    sx={{ mb: 2 }} />
                  <TextField fullWidth required label="Event Date & Time" type="datetime-local"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }} />

                  {/* Summary */}
                  <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>SUMMARY</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Fields:</strong> {formData.requiredFields.map(f => f.label).join(', ') || '—'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Location:</strong> {formData.location.address || (formData.location.latitude ? `${Number(formData.location.latitude).toFixed(4)}, ${Number(formData.location.longitude).toFixed(4)}` : '—')} · radius {formData.location.radius} m
                    </Typography>
                  </Paper>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          {createdEvent ? (
            <Button variant="contained" onClick={closeWizard}>Done</Button>
          ) : (
            <>
              <Button onClick={closeWizard} color="inherit">Cancel</Button>
              <Box sx={{ flex: 1 }} />
              {activeStep > 0 && (
                <Button startIcon={<ArrowBack />} onClick={() => { setError(''); setActiveStep(s => s - 1); }}>
                  Back
                </Button>
              )}
              {activeStep < WIZARD_STEPS.length - 1 ? (
                <Button variant="contained" endIcon={<ArrowForward />} onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button variant="contained" color="success" onClick={handleCreate}
                  disabled={creating}
                  startIcon={creating ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}>
                  {creating ? 'Creating…' : 'Create Event & Generate QR'}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Add Custom Field Dialog ───────────────────────────────────────── */}
      <Dialog open={addFieldOpen} onClose={() => setAddFieldOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Custom Field</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="Field Label (what attendees will see)" required
            value={newField.label}
            onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
            sx={{ mb: 2, mt: 1 }} />
          <TextField select fullWidth label="Input Type"
            value={newField.type}
            onChange={e => setNewField(p => ({ ...p, type: e.target.value }))}
            sx={{ mb: 2 }}>
            {FIELD_TYPES.map(t => (
              <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>
            ))}
          </TextField>
          {newField.type === 'select' && (
            <TextField fullWidth label="Options (comma separated)" multiline rows={2}
              value={newField.options}
              onChange={e => setNewField(p => ({ ...p, options: e.target.value }))}
              helperText="e.g. Option A, Option B, Option C"
              sx={{ mb: 1 }} />
          )}
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setAddFieldOpen(false); setError(''); }}>Cancel</Button>
          <Button variant="contained" onClick={addCustomField} disabled={!newField.label.trim()}>
            Add Field
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Event Detail / Attendees Dialog ──────────────────────────────── */}
      <Dialog open={!!detailEvent} onClose={() => setDetailEvent(null)} maxWidth="lg" fullWidth>
        {detailEvent && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>{detailEvent.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(detailEvent.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
              <IconButton onClick={() => setDetailEvent(null)}><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {/* QR Section */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm="auto">
                  <Box sx={{ textAlign: 'center' }}>
                    <img src={detailEvent.qrCode} alt="QR Code"
                      style={{ width: 180, height: 180, display: 'block', margin: '0 auto', border: '2px solid #e0e0e0', borderRadius: 8 }} />
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                      <Tooltip title="Download QR Code">
                        <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => downloadQR(detailEvent)}>
                          Download QR
                        </Button>
                      </Tooltip>
                      <Tooltip title="Copy attendance link">
                        <Button size="small" variant="outlined" startIcon={<ContentCopy />}
                          onClick={() => navigator.clipboard?.writeText(detailEvent.link)}>
                          Copy Link
                        </Button>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Grid>
                <Grid item xs={12} sm>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, wordBreak: 'break-all' }}>
                    <strong>Link:</strong> {detailEvent.link}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Location:</strong> {detailEvent.location?.address || `${detailEvent.location?.latitude?.toFixed(4)}, ${detailEvent.location?.longitude?.toFixed(4)}`} · {detailEvent.location?.radius} m radius
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Required fields:</strong> {(detailEvent.requiredFields || []).map(f => f.label).join(', ') || 'None set'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Status:</strong> {detailEvent.status}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Attendees Table */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Attendees ({loadingAttendees ? '…' : attendees.length})
                </Typography>
                <Button size="small" variant="outlined" startIcon={<TableChart />}
                  onClick={() => downloadExcel(detailEvent, attendees)}
                  disabled={attendees.length === 0}>
                  Download Excel
                </Button>
              </Box>

              {loadingAttendees ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
              ) : attendees.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
                  <People sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No attendees yet. Share the QR code to get started.</Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 420, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        {(detailEvent.requiredFields?.length
                          ? detailEvent.requiredFields
                          : [{ name: 'name', label: 'Name' }, { name: 'email', label: 'Email' }]
                        ).map(f => <TableCell key={f.name} sx={{ fontWeight: 700 }}>{f.label || f.name}</TableCell>)}
                        <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendees.map((a, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          {(detailEvent.requiredFields?.length
                            ? detailEvent.requiredFields
                            : [{ name: 'name', label: 'Name' }, { name: 'email', label: 'Email' }]
                          ).map(f => <TableCell key={f.name}>{cellValue(a, f)}</TableCell>)}
                          <TableCell>{new Date(a.submittedAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
              <Button color="error" startIcon={<Delete />} onClick={() => handleDelete(detailEvent._id)}>Delete Event</Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={() => setDetailEvent(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

// ── Event Card sub-component ──────────────────────────────────────────────────

const EventCard = ({ event, onView, onDownloadQR, onDownloadExcel, onDelete }) => {
  const isUpcoming = new Date(event.date) >= new Date();
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Status badge + title */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start' }}>
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1, mr: 1 }} noWrap>{event.title}</Typography>
          <Chip
            label={isUpcoming ? 'Upcoming' : 'Past'}
            size="small"
            color={isUpcoming ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>

        {event.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.description}
          </Typography>
        )}

        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {event.location?.address || `${event.location?.latitude?.toFixed(3)}, ${event.location?.longitude?.toFixed(3)}`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <People sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {event.attendees?.length || 0} attendee{event.attendees?.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Stack>

        {/* Fields preview */}
        {event.requiredFields?.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {event.requiredFields.slice(0, 4).map(f => (
              <Chip key={f.name} label={f.label} size="small" variant="outlined" />
            ))}
            {event.requiredFields.length > 4 && (
              <Chip label={`+${event.requiredFields.length - 4} more`} size="small" variant="outlined" color="default" />
            )}
          </Box>
        )}

        <Box sx={{ mt: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" startIcon={<Visibility />} onClick={onView}>
            View Details
          </Button>
          <Button size="small" variant="outlined" startIcon={<QrCode />} onClick={onDownloadQR}>
            QR
          </Button>
          {(event.attendees?.length || 0) > 0 && (
            <Button size="small" variant="outlined" startIcon={<TableChart />} onClick={onDownloadExcel}>
              Excel
            </Button>
          )}
          <Tooltip title="Delete event">
            <IconButton size="small" color="error" onClick={onDelete} sx={{ ml: 'auto' }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EventManagement;
