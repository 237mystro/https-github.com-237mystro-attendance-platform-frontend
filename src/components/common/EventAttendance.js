import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Typography, TextField,
  Alert, CircularProgress, MenuItem, Stack
} from '@mui/material';
import {
  Send, LocationOn, CheckCircle, Event as EventIcon,
  GpsFixed, GpsOff, AccessTime
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

// Simple Haversine distance for the public form (no shared import needed)
const calcDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fmtDist = d => d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;

const EventAttendance = () => {
  const { companyId, eventId } = useParams();

  const [event, setEvent]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [formData, setFormData]   = useState({});

  // Location state
  const [location, setLocation]       = useState(null);
  const [locStatus, setLocStatus]     = useState('getting'); // getting | inside | outside | unavailable
  const [distance, setDistance]       = useState(null);

  // ── Fetch event ─────────────────────────────────────────────────────────────

  const fetchEvent = useCallback(async () => {
    try {
      const data = await apiRequest(`/events/public/${companyId}/${eventId}`, { auth: false });
      setEvent(data.data);
    } catch (err) {
      setError(err.message || 'Event not found or no longer active.');
    } finally {
      setLoading(false);
    }
  }, [companyId, eventId]);

  // ── Attempt geolocation ─────────────────────────────────────────────────────

  const getLocation = useCallback((eventData) => {
    if (!navigator.geolocation) { setLocStatus('unavailable'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocation({ latitude: lat, longitude: lon });
        if (eventData?.location?.latitude != null) {
          const d = calcDistance(lat, lon, eventData.location.latitude, eventData.location.longitude);
          setDistance(d);
          setLocStatus(d <= (eventData.location.radius || 100) ? 'inside' : 'outside');
        } else {
          setLocStatus('inside'); // no geofence → allow
        }
      },
      () => setLocStatus('unavailable'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    fetchEvent().then(() => {}); // location triggered after event loads below
  }, [fetchEvent]);

  // When event loads, start geolocation
  useEffect(() => {
    if (event) getLocation(event);
  }, [event, getLocation]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all required fields
    for (const field of (event?.requiredFields || [])) {
      if (field.required && !formData[field.name]?.toString().trim()) {
        setError(`"${field.label}" is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const customFields = {};
      (event.requiredFields || []).forEach(field => {
        if (!['name', 'email', 'phone', 'age'].includes(field.name)) {
          customFields[field.name] = formData[field.name] || '';
        }
      });

      await apiRequest(`/events/${companyId}/${eventId}/attend`, {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, customFields, userLocation: location })
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f3f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography color="text.secondary">Loading event…</Typography>
        </Box>
      </Box>
    );
  }

  // ── Event not found ─────────────────────────────────────────────────────────

  if (!event) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f3f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <EventIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Event Not Found</Typography>
            <Typography color="text.secondary">{error || 'This event link is invalid or the event has ended.'}</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f3f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card sx={{ maxWidth: 440, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mb: 1 }}>
              You're In!
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>{event.title}</Typography>
            <Typography color="text.secondary">
              Your attendance has been recorded. See you at the event!
            </Typography>
            {event.date && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ── Event inactive ──────────────────────────────────────────────────────────

  if (event.status && event.status !== 'active') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f3f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <EventIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Event {event.status === 'completed' ? 'Ended' : 'Cancelled'}</Typography>
            <Typography color="text.secondary">
              {event.title} is no longer accepting attendance submissions.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ── Geofence blocked ────────────────────────────────────────────────────────

  const geofenceBlocks = locStatus === 'outside' && event.location?.radius;

  // ── Main form ───────────────────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f3f6fb', py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 520, mx: 'auto' }}>
        {/* Event header card */}
        <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #1976d2 0%, #246bce 100%)', color: '#fff' }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 2 }}>
              ATTENDANCE
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 1 }}>
              {event.title}
            </Typography>
            {event.description && (
              <Typography variant="body2" sx={{ opacity: 0.85, mb: 1.5 }}>
                {event.description}
              </Typography>
            )}
            {event.date && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 15, opacity: 0.75 }} />
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Location status indicator */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            {locStatus === 'getting' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">Checking your location…</Typography>
              </Box>
            )}
            {locStatus === 'inside' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GpsFixed sx={{ fontSize: 18, color: 'success.main' }} />
                <Typography variant="body2" color="success.main" fontWeight={600}>
                  You are within the event area
                  {distance != null ? ` (${fmtDist(distance)} from the venue)` : ''}
                </Typography>
              </Box>
            )}
            {locStatus === 'outside' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GpsOff sx={{ fontSize: 18, color: 'error.main' }} />
                <Typography variant="body2" color="error.main" fontWeight={600}>
                  You are {distance != null ? fmtDist(distance) : 'too far'} from the venue
                  {event.location?.radius ? ` (must be within ${fmtDist(event.location.radius)})` : ''}
                </Typography>
              </Box>
            )}
            {locStatus === 'unavailable' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Location unavailable — attendance will still be submitted.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Geofence block */}
        {geofenceBlocks && (
          <Alert severity="error" sx={{ mb: 2 }}>
            You must be at the venue to submit attendance. Please move closer and refresh the page.
          </Alert>
        )}

        {/* Attendance form */}
        <Card>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
              Fill in your details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              All fields marked with * are required.
            </Typography>

            {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {(event.requiredFields || []).map(field => (
                  <Box key={field.name}>
                    {field.type === 'select' ? (
                      <TextField
                        select
                        fullWidth
                        label={field.label + (field.required ? ' *' : '')}
                        value={formData[field.name] || ''}
                        onChange={e => handleChange(field.name, e.target.value)}
                        required={field.required}
                      >
                        {(field.options || []).map(opt => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <TextField
                        fullWidth
                        label={field.label + (field.required ? ' *' : '')}
                        type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={formData[field.name] || ''}
                        onChange={e => handleChange(field.name, e.target.value)}
                        required={field.required}
                        InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                      />
                    )}
                  </Box>
                ))}
              </Stack>

              <Box sx={{ mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={submitting || geofenceBlocks}
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                  sx={{ py: 1.5, fontWeight: 700, fontSize: 16 }}
                >
                  {submitting ? 'Submitting…' : 'Submit Attendance'}
                </Button>
                {geofenceBlocks && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                    You must be at the event location to submit.
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Location footnote */}
        {location && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <LocationOn sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">
              Location: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default EventAttendance;
