import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography
} from '@mui/material';
import {
  AccessTime,
  CameraAlt,
  CheckCircle,
  Fingerprint,
  FaceRetouchingNatural,
  LocationOn,
  QrCodeScanner,
  Replay,
  Schedule,
  VideocamOff
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { apiRequest } from '../../utils/api';
import { calculateDistance, formatDistance, getUserLocation } from '../../utils/locationVerification';
import { generateDeviceFingerprint, getBiometricLabel } from '../../utils/deviceFingerprint';

// ── Helpers ──────────────────────────────────────────────────────────────────

const isBiometricSupported = async () => {
  if (!window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

const QRScanner = () => {
  // Location + geofence state
  const [location, setLocation]               = useState(null);
  const [locationStatus, setLocationStatus]   = useState('pending');
  const [locationError, setLocationError]     = useState('');
  const [geofence, setGeofence]               = useState(null);
  const [distance, setDistance]               = useState(null);

  // Method selection
  const [methodSelected, setMethodSelected]   = useState(null); // null | 'qr' | 'biometric'
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // QR scanning
  const [scanning, setScanning]               = useState(false);
  const [qrData, setQrData]                   = useState(null);
  const [shiftInfo, setShiftInfo]             = useState(null);

  // Selfie / confirmation dialog
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [selfieStep, setSelfieStep]           = useState(false);
  const [selfieImage, setSelfieImage]         = useState(null);

  // Biometric flow
  const [biometricStep, setBiometricStep]     = useState('idle'); // idle | registering | authenticating | success | error
  const [biometricError, setBiometricError]   = useState('');
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  // Shared
  const [checkInStatus, setCheckInStatus]     = useState('idle'); // idle | processing | success | error
  const [deviceFingerprint, setDeviceFingerprint] = useState('');

  const navigate     = useNavigate();
  const webcamRef    = useRef(null);
  const selfieWebcamRef = useRef(null);
  const intervalRef  = useRef(null);

  // ── On mount: check biometric support + generate device fingerprint ────────
  useEffect(() => {
    isBiometricSupported().then(setBiometricAvailable);
    generateDeviceFingerprint().then(setDeviceFingerprint);
  }, []);

  useEffect(() => () => clearScanInterval(), []);

  // ── QR scanning helpers ────────────────────────────────────────────────────
  const clearScanInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resolveGeofenceForQr = useCallback(async (parsedQr) => {
    if (parsedQr.branchId) {
      const data = await apiRequest(`/branches/${parsedQr.branchId}/geofence`);
      return data?.success && data.geofence?.latitude ? data.geofence : null;
    }
    const data = await apiRequest('/locations/geofence');
    return data?.success && data.geofence?.latitude ? data.geofence : null;
  }, []);

  const captureAndDecodeQR = () => {
    if (!webcamRef.current?.video || webcamRef.current.video.readyState !== 4) return;
    const video  = webcamRef.current.video;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) handleQrScan(code.data);
  };

  const startQRScanning = () => {
    clearScanInterval();
    intervalRef.current = setInterval(captureAndDecodeQR, 500);
  };

  const buildShiftInfo = (parsed) => {
    if (parsed.type === 'company_checkin') {
      return {
        isCompanyQR: true,
        employeeName: 'You',
        date: new Date().toISOString().split('T')[0],
        startTime: null,
        endTime: null,
        location: parsed.branchName || parsed.company || 'Office'
      };
    }
    return {
      isCompanyQR: false,
      shiftId: parsed.shiftId || '',
      employeeName: parsed.employeeName || 'You',
      date: parsed.date || new Date().toISOString().split('T')[0],
      startTime: parsed.startTime || '--:--',
      endTime:   parsed.endTime   || '--:--',
      location:  parsed.location  || 'Office'
    };
  };

  // ── Step 1: Verify location (common to both methods) ──────────────────────
  const verifyLocation = async () => {
    setLocationStatus('verifying');
    setLocationError('');
    setMethodSelected(null);
    setQrData(null);
    setCheckInStatus('idle');
    setSelfieStep(false);
    setSelfieImage(null);
    setGeofence(null);
    setDistance(null);

    try {
      const userLocation = await getUserLocation();
      setLocation(userLocation);
      setLocationStatus('ready');
    } catch (error) {
      setLocationStatus('failed');
      setLocationError(error.message || 'Failed to capture your location.');
    }
  };

  // ── Step 2a: User chose QR — start camera scan ────────────────────────────
  const chooseQR = () => {
    setMethodSelected('qr');
    setScanning(true);
    setLocationError('');
    startQRScanning();
  };

  // ── Step 2b: User chose biometrics ────────────────────────────────────────
  const chooseBiometric = async () => {
    setMethodSelected('biometric');
    setLocationError('');
    setBiometricError('');

    try {
      const statusData = await apiRequest('/attendance/biometric/status');
      setNeedsRegistration(!statusData.registered);
      setShowBiometricDialog(true);
    } catch (err) {
      setLocationError(err.message || 'Failed to check biometric status.');
      setMethodSelected(null);
    }
  };

  // ── Biometric registration flow ───────────────────────────────────────────
  const handleBiometricRegister = async () => {
    setBiometricStep('registering');
    setBiometricError('');
    try {
      const startData = await apiRequest('/attendance/biometric/register-start', { method: 'POST' });
      const attResp   = await startRegistration(startData.options);
      await apiRequest('/attendance/biometric/register-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp)
      });
      // Registration succeeded — proceed straight to authentication
      setNeedsRegistration(false);
      await handleBiometricAuthenticate();
    } catch (err) {
      setBiometricStep('error');
      setBiometricError(
        err.name === 'NotAllowedError'
          ? 'Biometric prompt was cancelled. Please try again.'
          : err.message || 'Registration failed. Please try again.'
      );
    }
  };

  // ── Biometric authentication + check-in ───────────────────────────────────
  const handleBiometricAuthenticate = async () => {
    setBiometricStep('authenticating');
    setBiometricError('');
    try {
      // 1. Get challenge
      const startData = await apiRequest('/attendance/biometric/auth-start', { method: 'POST' });

      // 2. Prompt Face ID / fingerprint on device
      const authResp = await startAuthentication(startData.options);

      // 3. Submit check-in with assertion + location
      const result = await apiRequest('/attendance/biometric/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assertion:         authResp,
          userLocation:      location,
          deviceFingerprint
        })
      });

      if (!result.success) throw new Error(result.message || 'Check-in failed');

      setBiometricStep('success');
      setCheckInStatus('success');
      setShowBiometricDialog(false);
      setTimeout(() => navigate('/employee/dashboard'), 1800);
    } catch (err) {
      setBiometricStep('error');
      setBiometricError(
        err.name === 'NotAllowedError'
          ? 'Biometric prompt was cancelled. Please try again.'
          : err.message || 'Authentication failed. Please try again.'
      );
    }
  };

  // ── QR scan handler ───────────────────────────────────────────────────────
  const handleQrScan = async (data) => {
    if (!data) return;
    clearScanInterval();
    setScanning(false);
    setLocationError('');
    setOpenConfirmation(false);

    let parsed;
    try { parsed = JSON.parse(data); } catch {
      setLocationStatus('failed');
      setLocationError('Invalid QR code format. Please scan a valid attendance QR code.');
      return;
    }

    try {
      setLocationStatus('verifying');
      const currentLocation  = location || (await getUserLocation());
      const activeGeofence   = await resolveGeofenceForQr(parsed);

      if (!activeGeofence) {
        setLocationStatus('failed');
        setLocation(currentLocation);
        setLocationError('No geofence configured for this QR code. Please contact your administrator.');
        return;
      }

      const computedDistance = calculateDistance(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        { latitude: activeGeofence.latitude,  longitude: activeGeofence.longitude }
      );

      setLocation(currentLocation);
      setGeofence(activeGeofence);
      setDistance(computedDistance);

      if (computedDistance > activeGeofence.radius) {
        setLocationStatus('failed');
        setLocationError(`You are ${formatDistance(computedDistance)} away. You must be within ${activeGeofence.radius} m to continue.`);
        return;
      }

      setLocationStatus('verified');
      setQrData(data);
      setShiftInfo(buildShiftInfo(parsed));
      setOpenConfirmation(true);
    } catch (error) {
      setLocationStatus('failed');
      setLocationError(error.message || 'Failed to verify this QR code.');
    }
  };

  // ── Selfie capture ────────────────────────────────────────────────────────
  const captureSelfie = useCallback(() => {
    if (!selfieWebcamRef.current) return;
    setSelfieImage(selfieWebcamRef.current.getScreenshot());
  }, []);

  // ── QR check-in submit ────────────────────────────────────────────────────
  const confirmCheckIn = async () => {
    if (!selfieImage) {
      setLocationError('Please take a selfie before confirming.');
      return;
    }
    try {
      setCheckInStatus('processing');
      const data = await apiRequest('/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData,
          userLocation:      location,
          selfieBase64:      selfieImage,
          deviceFingerprint
        })
      });
      if (!data.success) throw new Error(data.message || 'Check-in failed');
      setCheckInStatus('success');
      setOpenConfirmation(false);
      setTimeout(() => navigate('/employee/dashboard'), 1800);
    } catch (error) {
      setCheckInStatus('error');
      setLocationError(error.message || 'Check-in failed. Please try again.');
      setOpenConfirmation(false);
    }
  };

  // ── Cancel / reset ────────────────────────────────────────────────────────
  const cancelScanning = () => {
    clearScanInterval();
    setScanning(false);
    setLocation(null);
    setLocationStatus('pending');
    setLocationError('');
    setGeofence(null);
    setDistance(null);
    setQrData(null);
    setCheckInStatus('idle');
    setOpenConfirmation(false);
    setShiftInfo(null);
    setSelfieStep(false);
    setSelfieImage(null);
    setMethodSelected(null);
    setShowBiometricDialog(false);
    setBiometricStep('idle');
    setBiometricError('');
  };

  // ── Derived UI helpers ────────────────────────────────────────────────────
  const biometricLabel = getBiometricLabel(navigator.userAgent);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Attendance Check-In / Check-Out
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your location is verified first, then you can check in using the QR code or your device biometrics (Face&nbsp;ID&nbsp;/&nbsp;fingerprint).
      </Typography>

      {/* ── Location status card ─────────────────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <LocationOn
              color={
                locationStatus === 'verified'  ? 'success' :
                locationStatus === 'failed'    ? 'error'   :
                locationStatus === 'verifying' ? 'warning' :
                locationStatus === 'ready'     ? 'info'    : 'disabled'
              }
              sx={{ mr: 1 }}
            />
            <Box>
              <Typography
                variant="body1"
                color={
                  locationStatus === 'verified'  ? 'success.main' :
                  locationStatus === 'failed'    ? 'error.main'   :
                  locationStatus === 'verifying' ? 'warning.main' :
                  locationStatus === 'ready'     ? 'info.main'    : 'text.primary'
                }
              >
                {locationStatus === 'pending'   && 'Location verification required'}
                {locationStatus === 'verifying' && 'Checking your live location…'}
                {locationStatus === 'ready'     && 'Location captured — choose how to check in'}
                {locationStatus === 'verified'  && `Inside the required geofence (${geofence?.radius} m radius)`}
                {locationStatus === 'failed'    && 'Location verification failed'}
              </Typography>
              {location && ['ready', 'verified'].includes(locationStatus) && (
                <Typography variant="caption" color="text.secondary">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} · accuracy ±{Math.round(location.accuracy)} m
                </Typography>
              )}
            </Box>
          </Box>

          {locationStatus === 'verifying' && <CircularProgress size={24} />}

          {(locationStatus === 'failed' || (locationError && locationStatus !== 'verified')) && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {locationError}
              {distance != null && geofence && (
                <Box sx={{ mt: 0.5 }}>
                  <strong>Your distance:</strong> {formatDistance(distance)} ·{' '}
                  <strong>Required:</strong> within {geofence.radius} m
                </Box>
              )}
            </Alert>
          )}

          {/* ── Step 1: initial verify button ─────────────────────────────── */}
          {locationStatus === 'pending' && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<LocationOn />}
                onClick={verifyLocation}
                sx={{ py: 1.5, px: 4 }}
              >
                Verify My Location
              </Button>
            </Box>
          )}

          {/* ── Step 2: method selection (after location captured) ─────────── */}
          {locationStatus === 'ready' && !scanning && !methodSelected && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>
                Choose how you'd like to mark your attendance:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                {/* QR Code option */}
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<QrCodeScanner />}
                  onClick={chooseQR}
                  sx={{ py: 2, px: 3, minWidth: 160, flexDirection: 'column', gap: 0.5 }}
                >
                  <span>Scan QR Code</span>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none' }}>
                    Point camera at QR
                  </Typography>
                </Button>

                {/* Biometric option */}
                <Button
                  variant="outlined"
                  size="large"
                  color={biometricAvailable ? 'secondary' : 'inherit'}
                  startIcon={<Fingerprint />}
                  onClick={chooseBiometric}
                  disabled={!biometricAvailable}
                  sx={{ py: 2, px: 3, minWidth: 160, flexDirection: 'column', gap: 0.5 }}
                >
                  <span>Use Biometrics</span>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none' }}>
                    {biometricAvailable ? biometricLabel : 'Not supported'}
                  </Typography>
                </Button>
              </Box>

              {!biometricAvailable && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                  Biometrics require a device with Face ID, Touch ID, or a fingerprint sensor.
                </Typography>
              )}
            </Box>
          )}

          {/* ── QR camera view ────────────────────────────────────────────── */}
          {scanning && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 260, sm: 320 },
                  border: '2px dashed #1976d2',
                  borderRadius: 2,
                  mb: 2,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: { ideal: 'environment' } }}
                  onUserMediaError={() => {
                    clearScanInterval();
                    setScanning(false);
                    setMethodSelected(null);
                    setLocationError('Camera access failed. Please allow camera permissions and try again.');
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <Box sx={{ width: 190, height: 190, border: '3px solid rgba(255,255,255,0.85)', borderRadius: 2 }} />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>
                Point your camera at the attendance QR code.
              </Typography>
              <Box sx={{ textAlign: 'center' }}>
                <Button variant="outlined" startIcon={<VideocamOff />} onClick={cancelScanning}>
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Result banners ───────────────────────────────────────────────── */}
      {checkInStatus === 'success' && (
        <Alert severity="success" icon={<CheckCircle />}>
          <strong>Success!</strong> Your attendance has been recorded at {new Date().toLocaleTimeString()}.
        </Alert>
      )}
      {checkInStatus === 'error' && locationError && (
        <Alert severity="error">{locationError}</Alert>
      )}

      {/* ── Biometric dialog ─────────────────────────────────────────────── */}
      <Dialog open={showBiometricDialog} onClose={cancelScanning} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {biometricStep === 'success' ? <CheckCircle color="success" /> : <Fingerprint color="secondary" />}
          {needsRegistration ? 'Register Biometric' : `${biometricLabel} Check-In`}
        </DialogTitle>
        <DialogContent>
          {biometricStep === 'idle' && needsRegistration && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                You haven't registered your biometrics yet. Register once and you can use{' '}
                <strong>{biometricLabel}</strong> to check in from this device going forward.
              </Typography>
              <Alert severity="info" sx={{ mb: 1 }}>
                Your device will prompt for <strong>{biometricLabel}</strong> to confirm registration.
              </Alert>
            </>
          )}

          {biometricStep === 'idle' && !needsRegistration && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Your device will prompt for <strong>{biometricLabel}</strong>. Once confirmed, your attendance will be marked instantly.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" fontSize="small" />
                <Typography variant="body2">
                  You are inside the required geofence
                  {distance != null ? ` (${formatDistance(distance)} from pin)` : ''}.
                </Typography>
              </Box>
            </>
          )}

          {(biometricStep === 'registering' || biometricStep === 'authenticating') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 2 }}>
              <CircularProgress size={48} color="secondary" />
              <Typography variant="body2" color="text.secondary">
                {biometricStep === 'registering'
                  ? 'Follow the biometric prompt on your device…'
                  : 'Verify your biometric to check in…'}
              </Typography>
            </Box>
          )}

          {biometricStep === 'success' && (
            <Alert severity="success">
              Attendance recorded at {new Date().toLocaleTimeString()}.
            </Alert>
          )}

          {biometricStep === 'error' && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {biometricError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {biometricStep !== 'success' && (
            <Button onClick={cancelScanning} color="inherit"
              disabled={biometricStep === 'registering' || biometricStep === 'authenticating'}>
              Cancel
            </Button>
          )}

          {biometricStep === 'idle' && needsRegistration && (
            <Button variant="contained" color="secondary" startIcon={<Fingerprint />}
              onClick={handleBiometricRegister}>
              Register &amp; Check In
            </Button>
          )}

          {biometricStep === 'idle' && !needsRegistration && (
            <Button variant="contained" color="secondary" startIcon={<FaceRetouchingNatural />}
              onClick={handleBiometricAuthenticate}>
              Activate {biometricLabel}
            </Button>
          )}

          {biometricStep === 'error' && (
            <Button variant="contained" color="secondary"
              onClick={needsRegistration ? handleBiometricRegister : handleBiometricAuthenticate}>
              Try Again
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── QR confirmation dialog (selfie + confirm) ────────────────────── */}
      <Dialog open={openConfirmation} onClose={cancelScanning} maxWidth="sm" fullWidth>
        <DialogTitle>{selfieStep ? 'Take a Selfie' : 'Confirm Attendance'}</DialogTitle>
        <DialogContent>
          {!selfieStep ? (
            <>
              {shiftInfo && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip label="QR Code" size="small" icon={<QrCodeScanner />} color="primary" variant="outlined" />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {shiftInfo.isCompanyQR ? 'Attendance QR Details' : 'Shift Details'}
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemAvatar><Avatar><Schedule /></Avatar></ListItemAvatar>
                      <ListItemText primary="Date" secondary={new Date(shiftInfo.date).toLocaleDateString()} />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar><Avatar><LocationOn /></Avatar></ListItemAvatar>
                      <ListItemText primary="Location" secondary={shiftInfo.location} />
                    </ListItem>
                    {!shiftInfo.isCompanyQR && shiftInfo.startTime && (
                      <ListItem>
                        <ListItemAvatar><Avatar><AccessTime /></Avatar></ListItemAvatar>
                        <ListItemText primary="Time" secondary={`${shiftInfo.startTime} - ${shiftInfo.endTime}`} />
                      </ListItem>
                    )}
                  </List>
                  <Divider sx={{ my: 1.5 }} />
                </>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                <Typography>
                  You are inside the required geofence
                  {distance != null ? ` (${formatDistance(distance)} from the pin).` : '.'}
                </Typography>
              </Box>
              <Alert severity="info" sx={{ mt: 1 }}>
                Next, take a quick selfie to complete your check-in.
              </Alert>
            </>
          ) : (
            <Box>
              {!selfieImage ? (
                <>
                  <Box sx={{ width: '100%', height: 280, border: '2px dashed #1976d2', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                    <Webcam
                      audio={false}
                      ref={selfieWebcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'user' }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>
                    Look straight at the camera, then capture your selfie.
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button variant="contained" startIcon={<CameraAlt />} onClick={captureSelfie}>
                      Capture Selfie
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <img
                      src={selfieImage}
                      alt="Your selfie"
                      style={{ width: '100%', maxHeight: 260, borderRadius: 12, objectFit: 'cover', border: '2px solid #e0e0e0' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button variant="outlined" startIcon={<Replay />} onClick={() => setSelfieImage(null)}>
                      Retake
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cancelScanning} color="inherit">Cancel</Button>
          {!selfieStep ? (
            <Button variant="contained" onClick={() => setSelfieStep(true)}>
              Next: Take Selfie
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={confirmCheckIn}
              disabled={!selfieImage || checkInStatus === 'processing'}
              startIcon={
                checkInStatus === 'processing'
                  ? <CircularProgress size={16} color="inherit" />
                  : <CheckCircle />
              }
            >
              {checkInStatus === 'processing' ? 'Submitting…' : 'Confirm'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QRScanner;
