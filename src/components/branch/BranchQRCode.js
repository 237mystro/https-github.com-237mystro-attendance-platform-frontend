import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { QrCode2, Refresh, Download } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const BranchQRCode = () => {
  const [qrCode, setQrCode]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);
  const [branchName, setBranchName]   = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/branches/mine/qr');
      if (data?.success) {
        setQrCode(data.qrCode);
        setGeneratedAt(data.generatedAt);
        setBranchName(data.branchName || '');
      } else {
        setError(data?.message || 'Failed to load QR code.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load QR code.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQR(); }, [fetchQR]);

  const handleRegenerate = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      const data = await apiRequest('/branches/mine/qr/regenerate', { method: 'POST' });
      if (data?.success) {
        setQrCode(data.qrCode);
        setGeneratedAt(data.generatedAt);
        setSuccess('QR code regenerated. The previous code remains valid for 10 minutes.');
        setTimeout(() => setSuccess(''), 6000);
      } else {
        setError(data?.message || 'Failed to regenerate.');
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `${branchName || 'branch'}-qr-code.png`;
    link.href = qrCode;
    link.click();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} sx={{ color: '#1a2f52', mb: 1 }}>Branch QR Code</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Display this QR code at your branch entrance. Employees scan it to check in and out.
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3 }}>
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          {qrCode ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                <QrCode2 sx={{ color: '#1565c0' }} />
                <Typography variant="subtitle1" fontWeight={700}>{branchName} — Attendance QR</Typography>
              </Box>
              <Box sx={{ display: 'inline-block', p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', mb: 2 }}>
                <img src={qrCode} alt="Branch QR Code" style={{ display: 'block', width: 280, height: 280 }} />
              </Box>
              {generatedAt && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Generated: {new Date(generatedAt).toLocaleString()}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<Download />} onClick={handleDownload}>
                  Download PNG
                </Button>
                <Button variant="outlined" startIcon={<Refresh />} onClick={() => setConfirmOpen(true)}>
                  Regenerate
                </Button>
              </Box>
            </>
          ) : !loading && (
            <Box sx={{ py: 4 }}>
              <QrCode2 sx={{ fontSize: 64, color: '#90a4ae', mb: 2 }} />
              <Typography color="text.secondary">No QR code yet.</Typography>
              <Button variant="contained" sx={{ mt: 2 }} onClick={fetchQR}>Generate QR</Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Regenerate QR Code?</DialogTitle>
        <DialogContent>
          <Typography>
            The current QR code will be replaced. The old code stays valid for 10 minutes so employees mid-scan aren't disrupted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRegenerate}>Regenerate</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BranchQRCode;
