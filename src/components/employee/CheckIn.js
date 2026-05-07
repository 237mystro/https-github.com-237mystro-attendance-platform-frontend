import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { QrCodeScanner, LocationOn, Warning } from '@mui/icons-material';

const CheckIn = () => {
  const [scanning, setScanning] = useState(false);
  const [locationValid] = useState(true);
  const [checkInStatus, setCheckInStatus] = useState(null); // null, 'success', 'error'

  const handleScan = () => {
    setScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setScanning(false);
      setCheckInStatus('success');
    }, 2000);
  };

  const handleRaiseConcern = () => {
    // Logic to raise concern
    alert('Concern raised successfully');
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Check-In
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Shift
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="body1">Cashier Shift</Typography>
              <Typography variant="body2" color="text.secondary">
                Monday, August 13, 2025
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body1">08:00 AM - 05:00 PM</Typography>
              <Typography variant="body2" color="text.secondary">
                8 hours
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LocationOn color={locationValid ? "success" : "error"} sx={{ mr: 1 }} />
            <Typography variant="body2" color={locationValid ? "success.main" : "error.main"}>
              {locationValid ? "Location verified" : "Location not verified"}
            </Typography>
          </Box>
          
          {!locationValid && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Your location does not match the workplace. Please move to the correct location.
            </Alert>
          )}
          
          <Box sx={{ textAlign: 'center', my: 3 }}>
            {scanning ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography>Scanning QR Code...</Typography>
              </Box>
            ) : checkInStatus === 'success' ? (
              <Box>
                <Typography variant="h5" color="success.main" sx={{ mb: 2 }}>
                  Successfully Checked In!
                </Typography>
                <Typography variant="body1">
                  Checked in at: 08:03 AM
                </Typography>
              </Box>
            ) : (
              <Button 
                variant="contained" 
                size="large" 
                startIcon={<QrCodeScanner />}
                onClick={handleScan}
                disabled={!locationValid}
                sx={{ py: 1.5, px: 4 }}
              >
                Scan QR Code to Check In
              </Button>
            )}
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Button 
              variant="outlined" 
              color="warning" 
              startIcon={<Warning />}
              onClick={handleRaiseConcern}
            >
              Raise Concern
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upcoming Shifts
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">Thursday</Typography>
            <Typography variant="body1">08:00 AM - 05:00 PM</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">Friday</Typography>
            <Typography variant="body1">08:00 AM - 04:00 PM</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1">Saturday</Typography>
            <Typography variant="body1">08:00 AM - 01:00 PM</Typography>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckIn;
