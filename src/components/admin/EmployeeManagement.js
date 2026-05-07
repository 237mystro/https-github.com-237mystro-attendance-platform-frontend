// src/components/admin/EmployeeManagement.js (updated)
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Grid,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert as MuiAlert
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore, AddCircle, RemoveCircle, ContentCopy } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [tempCredentials, setTempCredentials] = useState({ email: '', password: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    momoNumber: '',
    position: '',
    department: '',
    salary: '',
    payPerShift: '',
    shifts: [{ day: '', date: '', startTime: '', endTime: '' }]
  });

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await apiRequest('/employees');
      
      if (data.success) {
        setEmployees(data.data);
      } else {
        setError(data.message || 'Failed to fetch employees');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Fetch employees error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle shift input changes
  const handleShiftChange = (index, field, value) => {
    const newShifts = [...formData.shifts];
    newShifts[index][field] = value;
    setFormData({
      ...formData,
      shifts: newShifts
    });
  };

  // Add new shift field
  const addShift = () => {
    setFormData({
      ...formData,
      shifts: [...formData.shifts, { day: '', date: '', startTime: '', endTime: '' }]
    });
  };

  // Remove shift field
  const removeShift = (index) => {
    if (formData.shifts.length > 1) {
      const newShifts = formData.shifts.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        shifts: newShifts
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone || 
          !formData.momoNumber || !formData.position || !formData.salary || 
          !formData.payPerShift) {
        setError('Please fill in all required fields');
        return;
      }
      
      // Validate shifts
      for (let shift of formData.shifts) {
        if ((shift.day || shift.date || shift.startTime || shift.endTime) && 
            (!shift.day || !shift.date || !shift.startTime || !shift.endTime)) {
          setError('Please complete all shift fields or leave them empty');
          return;
        }
      }
      
      // Filter out empty shifts
      const validShifts = formData.shifts.filter(shift => 
        shift.day && shift.date && shift.startTime && shift.endTime
      );
      
      const submitData = {
        ...formData,
        salary: Number(formData.salary),
        payPerShift: Number(formData.payPerShift),
        shifts: validShifts
      };
      
      const url = editingEmployee 
        ? `/employees/${editingEmployee._id}`
        : '/employees';
        
      const method = editingEmployee ? 'PUT' : 'POST';
      
      const data = await apiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      if (data.success) {
        if (!editingEmployee && data.data.temporaryPassword) {
          // Show temporary password for new employees
          setTempPassword(data.data.temporaryPassword);
          setTempCredentials({
            email: submitData.email,
            password: data.data.temporaryPassword
          });
          setShowTempPassword(true);
        }
        
        setOpen(false);
        setEditingEmployee(null);
        setFormData({
          name: '',
          email: '',
          phone: '',
          momoNumber: '',
          position: '',
          department: '',
          salary: '',
          payPerShift: '',
          shifts: [{ day: '', date: '', startTime: '', endTime: '' }]
        });
        fetchEmployees(); // Refresh the list
        
        setSuccess(editingEmployee 
          ? 'Employee updated successfully!' 
          : 'Employee created successfully!');
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Submit error:', err);
    }
  };

  // Handle edit employee
  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      momoNumber: employee.momoNumber,
      position: employee.position,
      department: employee.department || '',
      salary: employee.salary,
      payPerShift: employee.payPerShift,
      shifts: [{ day: '', date: '', startTime: '', endTime: '' }] // Reset shifts for edit
    });
    setOpen(true);
  };

  // Handle delete employee
  const handleDelete = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee? This will also delete their account and all associated data.')) {
      try {
        const data = await apiRequest(`/employees/${employeeId}`, {
          method: 'DELETE'
        });
        
        if (data.success) {
          fetchEmployees(); // Refresh the list
          setSuccess('Employee deleted successfully!');
        } else {
          setError(data.message || 'Failed to delete employee');
        }
      } catch (err) {
        setError('Network error. Please try again.');
        console.error('Delete error:', err);
      }
    }
  };

  // Handle add new employee
  const handleAddNew = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      momoNumber: '',
      position: '',
      department: '',
      salary: '',
      payPerShift: '',
      shifts: [{ day: '', date: '', startTime: '', endTime: '' }]
    });
    setOpen(true);
    setShowTempPassword(false);
    setTempPassword('');
    setTempCredentials({ email: '', password: '' });
  };

  // Close dialog
  const handleClose = () => {
    setOpen(false);
    setEditingEmployee(null);
    setError('');
    setShowTempPassword(false);
    setTempPassword('');
    setTempCredentials({ email: '', password: '' });
  };

  // Close snackbars
  const handleCloseSnackbar = () => {
    setError('');
    setSuccess('');
  };

  return (
    <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Employee Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
          sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
        >
          Add Employee
        </Button>
      </Box>
      
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <MuiAlert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </MuiAlert>
      </Snackbar>
      
      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <MuiAlert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {success}
        </MuiAlert>
      </Snackbar>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Salary (FCFA)</TableCell>
                <TableCell>Pay/Shift (FCFA)</TableCell>
                <TableCell>Shifts</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee._id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.salary.toLocaleString()}</TableCell>
                  <TableCell>{employee.payPerShift.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${employee.shifts || 0} shifts`} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      startIcon={<Edit />} 
                      onClick={() => handleEdit(employee)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<Delete />} 
                      color="error"
                      onClick={() => handleDelete(employee._id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Employee Form Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Mobile Money Number"
                  name="momoNumber"
                  value={formData.momoNumber}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Monthly Salary (FCFA)"
                  name="salary"
                  type="number"
                  value={formData.salary}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Pay per Shift (FCFA)"
                  name="payPerShift"
                  type="number"
                  value={formData.payPerShift}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
            
            <Accordion sx={{ mt: 3 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Employee Shifts</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {formData.shifts.map((shift, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={3}>
                        <FormControl fullWidth>
                          <InputLabel>Day</InputLabel>
                          <Select
                            value={shift.day}
                            onChange={(e) => handleShiftChange(index, 'day', e.target.value)}
                          >
                            <MenuItem value="Monday">Monday</MenuItem>
                            <MenuItem value="Tuesday">Tuesday</MenuItem>
                            <MenuItem value="Wednesday">Wednesday</MenuItem>
                            <MenuItem value="Thursday">Thursday</MenuItem>
                            <MenuItem value="Friday">Friday</MenuItem>
                            <MenuItem value="Saturday">Saturday</MenuItem>
                            <MenuItem value="Sunday">Sunday</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          label="Date"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={shift.date}
                          onChange={(e) => handleShiftChange(index, 'date', e.target.value)}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          label="Start Time"
                          type="time"
                          InputLabelProps={{ shrink: true }}
                          value={shift.startTime}
                          onChange={(e) => handleShiftChange(index, 'startTime', e.target.value)}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          label="End Time"
                          type="time"
                          InputLabelProps={{ shrink: true }}
                          value={shift.endTime}
                          onChange={(e) => handleShiftChange(index, 'endTime', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                    
                    {formData.shifts.length > 1 && (
                      <Box sx={{ mt: 1, textAlign: 'right' }}>
                        <IconButton 
                          onClick={() => removeShift(index)}
                          color="error"
                        >
                          <RemoveCircle />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                ))}
                
                <Button 
                  startIcon={<AddCircle />} 
                  onClick={addShift}
                  variant="outlined"
                  fullWidth
                >
                  Add Another Shift
                </Button>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEmployee ? 'Update Employee' : 'Add Employee'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Temporary Password Dialog */}
      <Dialog open={showTempPassword} onClose={() => setShowTempPassword(false)}>
        <DialogTitle>Employee Created Successfully</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Share these credentials with the employee:
          </Alert>
          
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
            <Typography variant="body1">
              <strong>Email:</strong> {tempCredentials.email}
            </Typography>
            <Typography variant="body1">
              <strong>Temporary Password:</strong> {tempCredentials.password || tempPassword}
            </Typography>
          </Box>
          
          <Button 
            startIcon={<ContentCopy />} 
            onClick={() => copyToClipboard(`Email: ${tempCredentials.email}\nTemporary Password: ${tempCredentials.password || tempPassword}`)}
            variant="outlined"
            fullWidth
          >
            Copy Credentials
          </Button>
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Employee must change password on first login
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTempPassword(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeeManagement;
