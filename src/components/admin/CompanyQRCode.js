import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Typography
} from '@mui/material';
import { Download, Print, Refresh, QrCode2 } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';
import { getStoredUser } from '../../utils/authSession';

const CompanyQRCode = () => {
  const [qrCode, setQrCode] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [alert, setAlert] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const user = getStoredUser() || {};
  const imgRef = useRef(null);

  const loadQR = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const data = await apiRequest('/locations/company-qr');
      if (data?.success) {
        setQrCode(data.qrCode);
        setGeneratedAt(data.generatedAt ? new Date(data.generatedAt) : null);
      } else {
        setAlert({ severity: 'error', message: data?.message || 'Failed to load QR code.' });
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.message || 'Failed to load QR code.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQR(); }, []);

  const handleRegenerate = async () => {
    setConfirmOpen(false);
    setRegenerating(true);
    setAlert(null);
    try {
      const data = await apiRequest('/locations/company-qr/regenerate', { method: 'POST' });
      if (data?.success) {
        setQrCode(data.qrCode);
        setGeneratedAt(data.generatedAt ? new Date(data.generatedAt) : new Date());
        setAlert({ severity: 'success', message: 'QR code regenerated. The old QR code no longer works.' });
      } else {
        setAlert({ severity: 'error', message: data?.message || 'Failed to regenerate QR code.' });
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.message || 'Failed to regenerate QR code.' });
    } finally {
      setRegenerating(false);
    }
  };

  // Download the QR code as a PNG file
  const handleDownload = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${user.company || 'company'}-attendance-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open a print-friendly window with just the QR and instructions
  const handlePrint = () => {
    if (!qrCode) return;
    const printWin = window.open('', '_blank', 'width=600,height=700');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${user.company || 'Company'} — Attendance QR</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #fff; }
            h1 { font-size: 24px; margin-bottom: 4px; color: #1a2f52; }
            p  { font-size: 14px; color: #555; margin: 6px 0; }
            img { width: 280px; height: 280px; margin: 24px auto; display: block; border: 1px solid #e0e0e0; padding: 12px; border-radius: 8px; }
            .note { margin-top: 20px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 14px; }
          </style>
        </head>
        <body>
          <h1>${user.company || 'Company'}</h1>
          <p>Scan this QR code to clock in or out</p>
          <img src="${qrCode}" alt="Attendance QR Code" />
          <p style="font-size:13px; color:#1976d2; font-weight:bold;">AutoPayroll · Attendance Check-In</p>
          <div class="note">
            <p>Point your phone camera at this code when you arrive or leave.</p>
            <p>You must be within the company premises (geofence) for it to work.</p>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <QrCode2 sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Company Attendance QR</Typography>
          <Typography variant="body2" color="text.secondary">
            Print and post this QR at your workplace. Employees scan it to clock in or out.
          </Typography>
        </Box>
      </Box>

      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          {loading ? (
            <Box sx={{ py: 6 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading QR code…
              </Typography>
            </Box>
          ) : qrCode ? (
            <>
              {/* Company label above QR */}
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {user.company || 'Your Company'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scan to clock in / clock out
              </Typography>

              {/* QR image */}
              <Box sx={{
                display: 'inline-block',
                border: '2px solid #e3e8f0',
                borderRadius: 3,
                p: 2,
                bgcolor: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
              }}>
                <img
                  ref={imgRef}
                  src={qrCode}
                  alt="Company Attendance QR Code"
                  style={{ width: 260, height: 260, display: 'block' }}
                />
              </Box>

              {generatedAt && (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
                  Generated: {generatedAt.toLocaleString()}
                </Typography>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Action buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleDownload}
                  size="large"
                >
                  Download PNG
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handlePrint}
                  size="large"
                >
                  Print
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={regenerating ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
                  onClick={() => setConfirmOpen(true)}
                  disabled={regenerating}
                  size="large"
                >
                  Regenerate
                </Button>
              </Box>

              <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                <strong>How it works</strong>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, fontSize: 13 }}>
                  <li>Only employees of <strong>{user.company}</strong> can use this QR.</li>
                  <li>Employees must be within the geofence radius to check in.</li>
                  <li>First scan = check-in · Second scan = check-out.</li>
                  <li>Regenerating creates a new code — the old printed one stops working.</li>
                </ul>
              </Alert>
            </>
          ) : (
            <Box sx={{ py: 4 }}>
              <Typography color="text.secondary">Could not load QR code.</Typography>
              <Button sx={{ mt: 2 }} onClick={loadQR}>Retry</Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Regenerate confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Regenerate QR Code?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will create a brand-new QR code. Any previously printed or saved copies
            will <strong>stop working immediately</strong>. You will need to print and
            distribute the new code.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleRegenerate} color="warning" variant="contained">
            Yes, Regenerate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyQRCode;
