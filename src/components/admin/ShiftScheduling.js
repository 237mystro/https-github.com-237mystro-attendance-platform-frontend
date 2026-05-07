import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, IconButton, Chip, Alert, LinearProgress, Tooltip, Divider
} from '@mui/material';
import { Add, Edit, Delete, Refresh, CalendarMonth } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_SHORT    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const DURATION_PRESETS = [
  { label: '1 Week',   months: 0, days: 7  },
  { label: '1 Month',  months: 1, days: 0  },
  { label: '3 Months', months: 3, days: 0  },
  { label: '6 Months', months: 6, days: 0  },
  { label: '1 Year',   months: 12, days: 0 },
  { label: 'Custom',   months: 0, days: -1 }, // -1 = custom
];

const ASSIGN_CHIP = {
  pending:  { label: 'Pending',  color: 'warning' },
  accepted: { label: 'Accepted', color: 'success' },
  declined: { label: 'Declined', color: 'error'   }
};
const STATUS_CHIP = {
  scheduled:     { label: 'Scheduled',   color: 'primary' },
  'in-progress': { label: 'In Progress', color: 'warning' },
  completed:     { label: 'Completed',   color: 'success' },
  missed:        { label: 'Missed',      color: 'error'   }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const dayFromDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const local = new Date(y, m - 1, d);
  return DAYS_OF_WEEK[local.getDay() === 0 ? 6 : local.getDay() - 1];
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '--';

const todayStr = () => new Date().toISOString().split('T')[0];

const addDuration = (startDateStr, preset) => {
  if (!startDateStr || preset.days === -1) return '';
  const [y, m, d] = startDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (preset.months) {
    dt.setMonth(dt.getMonth() + preset.months);
    dt.setDate(dt.getDate() - 1); // inclusive end
  } else {
    dt.setDate(dt.getDate() + preset.days - 1);
  }
  return dt.toISOString().split('T')[0];
};

const countPreviewShifts = (days, startDate, endDate) => {
  if (!days.length || !startDate || !endDate) return 0;
  const JS_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const start = new Date(startDate + 'T00:00:00');
  const end   = new Date(endDate   + 'T00:00:00');
  if (start > end) return 0;
  let n = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (days.includes(JS_DAYS[cur.getDay()])) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
};

// ── Empty forms ───────────────────────────────────────────────────────────────

const EMPTY_SINGLE = { employeeId: '', date: '', startTime: '', endTime: '' };

const EMPTY_BULK = {
  employeeId: '',
  days:       [],
  startTime:  '',
  endTime:    '',
  startDate:  todayStr(),
  endDate:    '',
  preset:     '1 Month',
};

// ── Component ─────────────────────────────────────────────────────────────────

const ShiftScheduling = () => {
  const [shifts, setShifts]       = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Single-shift dialog
  const [singleOpen, setSingleOpen] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_SINGLE);
  const [formError, setFormError]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk-schedule dialog
  const [bulkOpen, setBulkOpen]       = useState(false);
  const [bulk, setBulk]               = useState(EMPTY_BULK);
  const [bulkError, setBulkError]     = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes] = await Promise.all([
        apiRequest('/employees'),
        apiRequest('/schedules')
      ]);
      if (empRes?.success)   setEmployees(empRes.data   || []);
      if (shiftRes?.success) setShifts(shiftRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const onResponse = (e) => {
      fetchAll();
      const { employeeName, assignmentStatus } = e.detail || {};
      if (employeeName && assignmentStatus) {
        setSuccess(`${employeeName} has ${assignmentStatus} their shift.`);
        setTimeout(() => setSuccess(''), 5000);
      }
    };
    window.addEventListener('shiftResponse', onResponse);
    return () => window.removeEventListener('shiftResponse', onResponse);
  }, [fetchAll]);

  // ── Single shift ──────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_SINGLE);
    setFormError('');
    setSingleOpen(true);
  };

  const openEdit = (shift) => {
    setEditingId(shift._id);
    setForm({
      employeeId: shift.employeeId?._id || shift.employeeId || '',
      date:       shift.date ? new Date(shift.date).toISOString().split('T')[0] : '',
      startTime:  shift.startTime || '',
      endTime:    shift.endTime   || ''
    });
    setFormError('');
    setSingleOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.date || !form.startTime || !form.endTime) {
      setFormError('All fields are required.'); return;
    }
    if (form.startTime >= form.endTime) {
      setFormError('Start time must be before end time.'); return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const body   = { ...form, day: dayFromDate(form.date) };
      const url    = editingId ? `/schedules/${editingId}` : '/schedules';
      const method = editingId ? 'PUT' : 'POST';
      const data   = await apiRequest(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (data?.success) {
        setSuccess(editingId ? 'Shift updated.' : 'Shift assigned — employee notified.');
        setSingleOpen(false);
        fetchAll();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setFormError(data?.message || data?.error || 'Save failed.');
      }
    } catch (err) {
      setFormError(err.message || 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const data = await apiRequest(`/schedules/${deleteId}`, { method: 'DELETE' });
      if (data?.success) {
        setSuccess('Shift deleted.');
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

  // ── Bulk schedule ─────────────────────────────────────────────────────────

  const openBulk = () => {
    const start = todayStr();
    const preset = DURATION_PRESETS.find(p => p.label === '1 Month');
    setBulk({ ...EMPTY_BULK, startDate: start, endDate: addDuration(start, preset), preset: '1 Month' });
    setBulkError('');
    setBulkOpen(true);
  };

  const toggleDay = (day) => {
    setBulk(p => ({
      ...p,
      days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day]
    }));
  };

  const applyPreset = (presetLabel) => {
    const preset = DURATION_PRESETS.find(p => p.label === presetLabel);
    setBulk(p => ({
      ...p,
      preset: presetLabel,
      endDate: preset.days === -1 ? p.endDate : addDuration(p.startDate, preset)
    }));
  };

  const handleBulkStartChange = (e) => {
    const newStart = e.target.value;
    const preset = DURATION_PRESETS.find(p => p.label === bulk.preset);
    setBulk(p => ({
      ...p,
      startDate: newStart,
      endDate: preset?.days === -1 ? p.endDate : addDuration(newStart, preset)
    }));
  };

  const previewCount = useMemo(
    () => countPreviewShifts(bulk.days, bulk.startDate, bulk.endDate),
    [bulk.days, bulk.startDate, bulk.endDate]
  );

  const handleBulkSave = async () => {
    if (!bulk.employeeId)    { setBulkError('Please select an employee.'); return; }
    if (!bulk.days.length)   { setBulkError('Select at least one day of the week.'); return; }
    if (!bulk.startTime || !bulk.endTime) { setBulkError('Start and end times are required.'); return; }
    if (bulk.startTime >= bulk.endTime)  { setBulkError('Start time must be before end time.'); return; }
    if (!bulk.startDate || !bulk.endDate){ setBulkError('Start and end dates are required.'); return; }
    if (bulk.startDate > bulk.endDate)   { setBulkError('Start date must be before end date.'); return; }

    setBulkError('');
    setBulkSubmitting(true);
    try {
      const data = await apiRequest('/schedules/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: bulk.employeeId,
          days:       bulk.days,
          startTime:  bulk.startTime,
          endTime:    bulk.endTime,
          startDate:  bulk.startDate,
          endDate:    bulk.endDate
        })
      });
      if (data?.success) {
        setSuccess(`${data.count} shift${data.count === 1 ? '' : 's'} created — employee notified.`);
        setBulkOpen(false);
        fetchAll();
        setTimeout(() => setSuccess(''), 6000);
      } else {
        setBulkError(data?.message || data?.error || 'Save failed.');
      }
    } catch (err) {
      setBulkError(err.message || 'Save failed.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const pendingCount = shifts.filter(s => s.assignmentStatus === 'pending').length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1a2f52' }}>Shift Scheduling</Typography>
          {pendingCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {pendingCount} shift{pendingCount > 1 ? 's' : ''} awaiting employee response
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAll}><Refresh /></IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<CalendarMonth />} onClick={openBulk}>
            Recurring Schedule
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>
            Add Shift
          </Button>
        </Box>
      </Box>

      {loading  && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error    && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success  && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Shifts table */}
      <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Start</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>End</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Assignment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && shifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No shifts yet. Use "Recurring Schedule" for bulk setup or "Add Shift" for a single day.
                    </TableCell>
                  </TableRow>
                )}
                {shifts.map(shift => {
                  const assign = ASSIGN_CHIP[shift.assignmentStatus] || ASSIGN_CHIP.pending;
                  const stat   = STATUS_CHIP[shift.status]           || STATUS_CHIP.scheduled;
                  return (
                    <TableRow key={shift._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{shift.employeeId?.name || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{shift.employeeId?.position}</Typography>
                      </TableCell>
                      <TableCell>{fmtDate(shift.date)}</TableCell>
                      <TableCell>{shift.day}</TableCell>
                      <TableCell>{shift.startTime}</TableCell>
                      <TableCell>{shift.endTime}</TableCell>
                      <TableCell><Chip label={stat.label}   color={stat.color}   size="small" /></TableCell>
                      <TableCell><Chip label={assign.label} color={assign.color} size="small" /></TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(shift)}><Edit fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDeleteId(shift._id)}><Delete fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ── Single shift dialog ───────────────────────────────────────────── */}
      <Dialog open={singleOpen} onClose={() => setSingleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editingId ? 'Edit Shift' : 'Assign Single Shift'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select name="employeeId" value={form.employeeId} label="Employee"
                onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                {employees.length === 0 && <MenuItem disabled>No employees found</MenuItem>}
                {employees.map(emp => (
                  <MenuItem key={emp._id} value={emp._id}>{emp.name} — {emp.position}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth label="Date" type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: todayStr() }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth label="Start Time" type="time" value={form.startTime}
                onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
              <TextField fullWidth label="End Time" type="time" value={form.endTime}
                onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Box>
            {form.date && (
              <Alert severity="info" sx={{ py: 0.5 }}>Day: <strong>{dayFromDate(form.date)}</strong></Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSingleOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving…' : editingId ? 'Update Shift' : 'Assign & Notify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Recurring / Bulk schedule dialog ─────────────────────────────── */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            Recurring Schedule Setup
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {bulkError && <Alert severity="error" sx={{ mb: 2 }}>{bulkError}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>

            {/* Employee */}
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select value={bulk.employeeId} label="Employee"
                onChange={e => setBulk(p => ({ ...p, employeeId: e.target.value }))}>
                {employees.length === 0 && <MenuItem disabled>No employees found</MenuItem>}
                {employees.map(emp => (
                  <MenuItem key={emp._id} value={emp._id}>{emp.name} — {emp.position}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Days of week */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Working Days <Typography component="span" variant="caption" color="text.secondary">(select all that apply)</Typography>
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                {DAYS_OF_WEEK.map((day, i) => {
                  const selected = bulk.days.includes(day);
                  return (
                    <Chip
                      key={day}
                      label={DAY_SHORT[i]}
                      onClick={() => toggleDay(day)}
                      color={selected ? 'primary' : 'default'}
                      variant={selected ? 'filled' : 'outlined'}
                      sx={{ fontWeight: selected ? 700 : 400, cursor: 'pointer', minWidth: 52 }}
                    />
                  );
                })}
              </Box>
              {/* Quick-select buttons */}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button size="small" variant="text" sx={{ fontSize: 11 }}
                  onClick={() => setBulk(p => ({ ...p, days: ['Monday','Tuesday','Wednesday','Thursday','Friday'] }))}>
                  Weekdays
                </Button>
                <Button size="small" variant="text" sx={{ fontSize: 11 }}
                  onClick={() => setBulk(p => ({ ...p, days: ['Saturday','Sunday'] }))}>
                  Weekends
                </Button>
                <Button size="small" variant="text" sx={{ fontSize: 11 }}
                  onClick={() => setBulk(p => ({ ...p, days: [...DAYS_OF_WEEK] }))}>
                  All Days
                </Button>
                <Button size="small" variant="text" color="error" sx={{ fontSize: 11 }}
                  onClick={() => setBulk(p => ({ ...p, days: [] }))}>
                  Clear
                </Button>
              </Box>
            </Box>

            {/* Time range */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Shift Hours</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth label="Start Time" type="time" value={bulk.startTime}
                  onChange={e => setBulk(p => ({ ...p, startTime: e.target.value }))}
                  InputLabelProps={{ shrink: true }} />
                <TextField fullWidth label="End Time" type="time" value={bulk.endTime}
                  onChange={e => setBulk(p => ({ ...p, endTime: e.target.value }))}
                  InputLabelProps={{ shrink: true }} />
              </Box>
            </Box>

            <Divider />

            {/* Start date */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Schedule Period</Typography>
              <TextField fullWidth label="Start Date" type="date" value={bulk.startDate}
                onChange={handleBulkStartChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: todayStr() }} />
            </Box>

            {/* Duration presets */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Duration</Typography>
              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 1.5 }}>
                {DURATION_PRESETS.map(p => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    onClick={() => applyPreset(p.label)}
                    color={bulk.preset === p.label ? 'primary' : 'default'}
                    variant={bulk.preset === p.label ? 'filled' : 'outlined'}
                    sx={{ fontWeight: bulk.preset === p.label ? 700 : 400, cursor: 'pointer' }}
                  />
                ))}
              </Box>
              <TextField fullWidth label="End Date" type="date" value={bulk.endDate}
                onChange={e => setBulk(p => ({ ...p, endDate: e.target.value, preset: 'Custom' }))}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: bulk.startDate || todayStr() }} />
            </Box>

            {/* Live preview */}
            {previewCount > 0 && (
              <Alert severity="success" icon={<CalendarMonth fontSize="small" />}>
                This will create <strong>{previewCount} shift{previewCount !== 1 ? 's' : ''}</strong>
                {bulk.days.length > 0 && ` — ${bulk.days.map(d => d.slice(0,3)).join(', ')}`}
                {bulk.startTime && bulk.endTime && `, ${bulk.startTime}–${bulk.endTime}`}
              </Alert>
            )}
            {bulk.days.length > 0 && bulk.startDate && bulk.endDate && previewCount === 0 && (
              <Alert severity="warning">
                No matching dates found. Check that your selected days fall within the chosen period.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkOpen(false)} disabled={bulkSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkSave}
            disabled={bulkSubmitting || previewCount === 0}
          >
            {bulkSubmitting ? 'Creating…' : `Create ${previewCount > 0 ? previewCount + ' ' : ''}Shifts`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Delete Shift?</DialogTitle>
        <DialogContent>
          <Typography>This shift will be permanently removed and the employee will no longer see it.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShiftScheduling;
