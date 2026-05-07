import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Slider,
  TextField,
  Typography
} from '@mui/material';
import { LocationOn, MyLocation, Save } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';
import { getStoredUser } from '../../utils/authSession';

// Fix broken default Leaflet marker icons in webpack/CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DEFAULT_CENTER = [4.1025, 9.3908];
const DEFAULT_ZOOM = 17;

// Handles map clicks to place the marker
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

// Re-centres the map whenever the saved position changes
const MapCentre = ({ position, zoom }) => {
  const map = useMapEvents({});
  const didCentre = useRef(false);
  useEffect(() => {
    if (position && !didCentre.current) {
      map.setView(position, zoom || map.getZoom());
      didCentre.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);
  return null;
};

// Fixes blank-map issue when rendered inside a hidden/animated container
const MapInvalidator = () => {
  const map = useMapEvents({});
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

// Single-shot getCurrentPosition — simpler and more reliable than watchPosition
const getAccurateLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  pos.coords.accuracy
      }),
      (err) => {
        if (err.code === 1)
          reject(new Error('Location access denied. Please allow location in your browser settings.'));
        else if (err.code === 2)
          reject(new Error('Location unavailable. Make sure GPS / location services are enabled.'));
        else
          reject(new Error('Location request timed out. Please try again.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

const GeofenceSettings = () => {
  const [markerPos, setMarkerPos] = useState(null);
  const [radius, setRadius] = useState(100);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const markerRef = useRef(null);

  const user = getStoredUser() || {};
  const isBranch = user.role === 'branch_manager' || user.role === 'branch_hr';
  const geofenceEndpoint = isBranch ? '/branches/mine/geofence' : '/locations/geofence';

  // Load existing geofence on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest(geofenceEndpoint);
        if (data?.success && data.geofence?.latitude) {
          const { latitude, longitude, radius: r, address: a } = data.geofence;
          setMarkerPos([latitude, longitude]);
          setRadius(r || 100);
          setAddress(a || '');
        }
      } catch { /* no saved geofence yet */ }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocationSelect = useCallback((lat, lng) => {
    setMarkerPos([lat, lng]);
  }, []);

  // Draggable marker drop
  const handleMarkerDragEnd = useCallback(() => {
    const latLng = markerRef.current?.getLatLng();
    if (latLng) setMarkerPos([latLng.lat, latLng.lng]);
  }, []);

  // Nominatim address search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setAlert(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      if (!results.length) {
        setAlert({ severity: 'warning', message: 'No results found. Try a more specific address.' });
        return;
      }
      const { lat, lon, display_name } = results[0];
      setMarkerPos([parseFloat(lat), parseFloat(lon)]);
      setAddress(display_name);
    } catch {
      setAlert({ severity: 'error', message: 'Address search failed. Check your internet connection.' });
    } finally {
      setSearching(false);
    }
  };

  // High-accuracy GPS location
  const handleUseMyLocation = async () => {
    setLocating(true);
    setLocationAccuracy(null);
    setAlert(null);
    try {
      const loc = await getAccurateLocation();
      setMarkerPos([loc.latitude, loc.longitude]);
      setLocationAccuracy(loc.accuracy);
      setAlert({
        severity: 'success',
        message: `Location captured with ±${Math.round(loc.accuracy)} m accuracy. Drag the pin to fine-tune if needed.`
      });
    } catch (err) {
      setAlert({ severity: 'error', message: err.message });
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!markerPos) {
      setAlert({ severity: 'error', message: 'Please place a marker on the map first.' });
      return;
    }
    setSaving(true);
    setAlert(null);
    try {
      const data = await apiRequest(geofenceEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: markerPos[0],
          longitude: markerPos[1],
          radius,
          address
        })
      });
      if (data?.success) {
        setAlert({
          severity: 'success',
          message: `Geofence saved! Employees must be within ${radius} m of the pinned location to clock in or out.`
        });
      } else {
        setAlert({ severity: 'error', message: data?.message || 'Failed to save geofence.' });
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.message || 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Geofence Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pin your {isBranch ? 'branch' : 'company'} location and set the radius. Employees must be inside the circle to clock in or out.
      </Typography>

      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Search + GPS row */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Find Location</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <TextField
              size="small"
              placeholder="Search address or place name…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={searching}
              startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <LocationOn />}
            >
              {searching ? 'Searching…' : 'Search'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleUseMyLocation}
              disabled={locating}
              startIcon={locating ? <CircularProgress size={16} color="inherit" /> : <MyLocation />}
            >
              {locating ? 'Getting location…' : 'Use My Location'}
            </Button>
          </Box>

          {locating && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Acquiring high-accuracy GPS fix (up to 8 s)…
              </Typography>
              <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />
            </Box>
          )}

          {address && !locating && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {address}
            </Typography>
          )}
          {locationAccuracy != null && !locating && (
            <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
              GPS accuracy: ±{Math.round(locationAccuracy)} m
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2, pt: 1.5, pb: 0.5 }}>
            Click on the map to place the centre, or drag the pin to reposition.
          </Typography>
          <Box sx={{ height: 440, width: '100%' }}>
            <MapContainer
              center={markerPos || DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapInvalidator />
              <MapClickHandler onLocationSelect={handleLocationSelect} />
              {markerPos && <MapCentre position={markerPos} zoom={18} />}
              {markerPos && (
                <>
                  <Marker
                    position={markerPos}
                    draggable
                    ref={markerRef}
                    eventHandlers={{ dragend: handleMarkerDragEnd }}
                  />
                  <Circle
                    center={markerPos}
                    radius={radius}
                    pathOptions={{ color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.13, weight: 2 }}
                  />
                </>
              )}
            </MapContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Radius slider */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Geofence Radius:&nbsp;
            <Typography component="span" fontWeight={700} color="primary">{radius} m</Typography>
          </Typography>
          <Slider
            value={radius}
            min={30}
            max={200}
            step={5}
            onChange={(_, v) => setRadius(v)}
            marks={[
              { value: 30, label: '30 m' },
              { value: 75, label: '75 m' },
              { value: 125, label: '125 m' },
              { value: 200, label: '200 m' }
            ]}
            valueLabelDisplay="auto"
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            Employees must be within this radius to clock in or out.
          </Typography>
        </CardContent>
      </Card>

      {/* Coords summary */}
      {markerPos && (
        <Card sx={{ mb: 2, bgcolor: '#f0f4f8' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Lat/Lng:</strong> {markerPos[0].toFixed(6)}, {markerPos[1].toFixed(6)}
              &nbsp;·&nbsp;
              <strong>Radius:</strong> {radius} m
            </Typography>
          </CardContent>
        </Card>
      )}

      <Button
        variant="contained"
        size="large"
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
        onClick={handleSave}
        disabled={saving || !markerPos}
        sx={{ px: 5 }}
      >
        {saving ? 'Saving…' : 'Save Geofence'}
      </Button>
    </Box>
  );
};

export default GeofenceSettings;
