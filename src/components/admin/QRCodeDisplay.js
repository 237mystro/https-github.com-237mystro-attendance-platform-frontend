// src/components/admin/QRCodeDisplay.js
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import { generateShiftQRData } from '../../utils/qrCodeGenerator';

const QRCodeDisplay = ({ shiftId, shiftInfo }) => {
  const [qrData, setQrData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate QR code data
  const generateQRCode = () => {
    setLoading(true);
    setError('');
    
    try {
      // In a real app, this would come from the backend
      // For demo, we'll generate it client-side
      const data = generateShiftQRData(shiftId);
      setQrData(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to generate QR code');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shiftId) {
      generateQRCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]);

  // Mock shift info for demo
  // const mockShiftInfo = shiftInfo || {
  //   employee: 'John Smith',
  //   position: 'Cashier',
  //   date: new Date().toLocaleDateString(),
  //   startTime: '08:00 AM',
  //   endTime: '04:00 PM',
  //   location: 'Buea Office (47WP+W6J)'
  // };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Attendance QR Code
          </Typography>
          <Button 
            startIcon={<Refresh />} 
            onClick={generateQRCode}
            disabled={loading}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography>Generating QR Code...</Typography>
            </Box>
          ) : qrData ? (
            <Box sx={{ textAlign: 'center' }}>
              <QRCodeCanvas 
                value={qrData} 
                size={256}
                level="H"
                includeMargin={true}
                style={{ border: '12px solid white', borderRadius: 8 }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                Scan this QR code to check in
              </Typography>
            </Box>
          ) : (
            <Typography>No QR code available</Typography>
          )}
        </Box>
        
        {/* <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Shift Details:
          </Typography>
          <Typography variant="body2">
            <strong>Employee:</strong> {mockShiftInfo.employee}<br />
            <strong>Position:</strong> {mockShiftInfo.position}<br />
            <strong>Date:</strong> {mockShiftInfo.date}<br />
            <strong>Time:</strong> {mockShiftInfo.startTime} - {mockShiftInfo.endTime}<br />
            <strong>Location:</strong> {mockShiftInfo.location}
          </Typography>
        </Box> */}
        </CardContent>
        </Card>
  );
};
export default QRCodeDisplay;
