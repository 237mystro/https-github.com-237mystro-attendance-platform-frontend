import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, MenuItem, Select,
  Slider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tab, Tabs, Tooltip, Typography
} from '@mui/material';
import {
  CheckCircle, Download, Email, ExpandMore, ExpandLess,
  PlaylistAddCheck, Refresh, Timer
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '--';

const statusChip = (s) => ({
  draft:    <Chip label="Draft"    size="small" color="default" />,
  approved: <Chip label="Approved" size="small" color="success" />,
  paid:     <Chip label="Paid"     size="small" color="primary" />
}[s] || <Chip label={s} size="small" />);

export default function LateDeductions() {
  const [tab, setTab] = useState(0);

  // ── Buffer ──────────────────────────────────────────────
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [bufferSaving, setBufferSaving] = useState(false);
  const [bufferAlert, setBufferAlert] = useState(null);

  // ── Late records (raw) ──────────────────────────────────
  const [records, setRecords] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recMonth, setRecMonth] = useState(new Date().getMonth() + 1);
  const [recYear,  setRecYear]  = useState(new Date().getFullYear());

  // ── Reports ─────────────────────────────────────────────
  const [reports, setReports] = useState([]);
  const [repLoading, setRepLoading] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear,  setGenYear]  = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [repAlert, setRepAlert] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [approveConfirm, setApproveConfirm] = useState(false);
  const [payConfirm, setPayConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Load buffer ─────────────────────────────────────────
  useEffect(() => {
    apiRequest('/deductions/buffer').then(d => {
      if (d?.success) setBufferMinutes(d.bufferMinutes ?? 0);
    }).catch(() => {});
  }, []);

  const saveBuffer = async () => {
    setBufferSaving(true);
    setBufferAlert(null);
    try {
      const d = await apiRequest('/deductions/buffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bufferMinutes })
      });
      if (d?.success) setBufferAlert({ severity: 'success', message: `Buffer set to ${bufferMinutes} minutes.` });
      else setBufferAlert({ severity: 'error', message: d?.message || 'Failed to save.' });
    } catch (err) {
      setBufferAlert({ severity: 'error', message: err.message });
    } finally {
      setBufferSaving(false);
    }
  };

  // ── Load late records ───────────────────────────────────
  const loadRecords = useCallback(async () => {
    setRecLoading(true);
    try {
      const d = await apiRequest(`/deductions/records?month=${recMonth}&year=${recYear}`);
      setRecords(d?.data || []);
    } catch { setRecords([]); }
    setRecLoading(false);
  }, [recMonth, recYear]);

  useEffect(() => { if (tab === 1) loadRecords(); }, [tab, loadRecords]);

  // ── Load reports ────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setRepLoading(true);
    try {
      const d = await apiRequest('/deductions/reports');
      setReports(d?.data || []);
    } catch { setReports([]); }
    setRepLoading(false);
  }, []);

  useEffect(() => { if (tab === 2) loadReports(); }, [tab, loadReports]);

  const loadDetail = async (id) => {
    setDetailLoading(true);
    try {
      const d = await apiRequest(`/deductions/reports/${id}`);
      setReportDetail(d?.data || null);
    } catch { setReportDetail(null); }
    setDetailLoading(false);
  };

  const openReport = (r) => { setSelectedReport(r); loadDetail(r._id); };

  // ── Generate report ─────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    setRepAlert(null);
    try {
      const d = await apiRequest('/deductions/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: genMonth, year: genYear })
      });
      if (d?.success) {
        setRepAlert({ severity: 'success', message: `Report for ${MONTHS[genMonth - 1]} ${genYear} generated.` });
        loadReports();
      } else {
        setRepAlert({ severity: 'error', message: d?.message || 'Failed to generate.' });
      }
    } catch (err) {
      setRepAlert({ severity: 'error', message: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // ── Approve ──────────────────────────────────────────────
  const handleApprove = async () => {
    setApproveConfirm(false);
    setActionLoading(true);
    try {
      const d = await apiRequest(`/deductions/reports/${selectedReport._id}/approve`, { method: 'PUT' });
      if (d?.success) {
        setRepAlert({ severity: 'success', message: 'Report approved.' });
        loadReports();
        loadDetail(selectedReport._id);
        setSelectedReport(r => ({ ...r, status: 'approved' }));
      } else {
        setRepAlert({ severity: 'error', message: d?.message || 'Failed to approve.' });
      }
    } catch (err) {
      setRepAlert({ severity: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Pay & Send ──────────────────────────────────────────
  const handlePayAndSend = async () => {
    setPayConfirm(false);
    setActionLoading(true);
    try {
      const d = await apiRequest(`/deductions/reports/${selectedReport._id}/pay-and-send`, { method: 'POST' });
      if (d?.success) {
        setRepAlert({ severity: 'success', message: 'Report marked as paid and emails sent to employees.' });
        loadReports();
        loadDetail(selectedReport._id);
        setSelectedReport(r => ({ ...r, status: 'paid' }));
      } else {
        setRepAlert({ severity: 'error', message: d?.message || 'Failed.' });
      }
    } catch (err) {
      setRepAlert({ severity: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Download CSV ────────────────────────────────────────
  const downloadCSV = () => {
    if (!reportDetail) return;
    const lines = ['Employee,Position,Late Minutes,Deduction,Base Salary,Net Salary'];
    for (const e of reportDetail.employees) {
      lines.push(`"${e.name}","${e.position}",${e.totalLateMinutes},${e.deductionAmount},${e.baseSalary},${e.finalSalary}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `deduction-${reportDetail.period?.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Timer sx={{ fontSize: 30, color: 'warning.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Late Deductions</Typography>
          <Typography variant="body2" color="text.secondary">
            Track late arrivals, set buffer time, generate monthly deduction reports.
          </Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Tab label="Buffer Settings" />
        <Tab label="Late Records" />
        <Tab label="Monthly Reports" />
      </Tabs>

      {/* ── TAB 0: Buffer Settings ── */}
      {tab === 0 && (
        <Card sx={{ maxWidth: 520 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Grace Period (Buffer Time)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              If a shift starts at 8:00 am and the buffer is 30 minutes, any employee
              who checks in after 8:30 am will be marked late and a deduction will be calculated.
            </Typography>
            {bufferAlert && (
              <Alert severity={bufferAlert.severity} sx={{ mb: 2 }} onClose={() => setBufferAlert(null)}>
                {bufferAlert.message}
              </Alert>
            )}
            <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
              Buffer: <span style={{ color: '#1976d2' }}>{bufferMinutes} minutes</span>
              {bufferMinutes === 0 && <span style={{ color: '#999', fontWeight: 400 }}> (no buffer — any lateness is penalised)</span>}
            </Typography>
            <Slider
              value={bufferMinutes}
              min={0} max={120} step={5}
              marks={[{value:0,label:'0'},{value:30,label:'30 min'},{value:60,label:'1 h'},{value:120,label:'2 h'}]}
              onChange={(_, v) => setBufferMinutes(v)}
              valueLabelDisplay="auto"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={saveBuffer}
              disabled={bufferSaving}
              startIcon={bufferSaving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
            >
              {bufferSaving ? 'Saving…' : 'Save Buffer'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 1: Late Records ── */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Month</InputLabel>
              <Select value={recMonth} label="Month" onChange={e => setRecMonth(e.target.value)}>
                {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <InputLabel>Year</InputLabel>
              <Select value={recYear} label="Year" onChange={e => setRecYear(e.target.value)}>
                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadRecords}>Refresh</Button>
          </Box>

          {recLoading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
          ) : records.length === 0 ? (
            <Alert severity="info">No late records found for {MONTHS[recMonth - 1]} {recYear}.</Alert>
          ) : (
            <TableContainer component={Card} sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 500 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                    <TableCell>Employee</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Scheduled</TableCell>
                    <TableCell>Checked In</TableCell>
                    <TableCell align="center">Late (min)</TableCell>
                    <TableCell align="right">Deduction</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map(r => (
                    <TableRow key={r._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{r.employeeId?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.employeeId?.position}</Typography>
                      </TableCell>
                      <TableCell>{fmtDate(r.date)}</TableCell>
                      <TableCell>{r.scheduledStart}</TableCell>
                      <TableCell>{fmtTime(r.actualCheckIn)}</TableCell>
                      <TableCell align="center">
                        <Chip label={`${r.lateMinutes} min`} size="small" color="warning" />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                        -{fmt(r.deductionAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ── TAB 2: Monthly Reports ── */}
      {tab === 2 && (
        <Box>
          {repAlert && (
            <Alert severity={repAlert.severity} sx={{ mb: 2 }} onClose={() => setRepAlert(null)}>
              {repAlert.message}
            </Alert>
          )}

          {/* Generate panel */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Generate Monthly Report</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Month</InputLabel>
                  <Select value={genMonth} label="Month" onChange={e => setGenMonth(e.target.value)}>
                    {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Year</InputLabel>
                  <Select value={genYear} label="Year" onChange={e => setGenYear(e.target.value)}>
                    {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <PlaylistAddCheck />}
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? 'Generating…' : 'Generate Report'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Reports list */}
          {repLoading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
          ) : reports.length === 0 ? (
            <Alert severity="info">No deduction reports yet. Generate one above.</Alert>
          ) : (
            <TableContainer component={Card}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                    <TableCell>Period</TableCell>
                    <TableCell align="center">Employees</TableCell>
                    <TableCell align="right">Total Deduction</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map(r => (
                    <TableRow key={r._id} hover sx={{ cursor: 'pointer' }} onClick={() => openReport(r)}>
                      <TableCell><Typography fontWeight={600}>{r.period}</Typography></TableCell>
                      <TableCell align="center">{r.employees?.length}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                        -{fmt(r.totalDeductionAmount)}
                      </TableCell>
                      <TableCell align="center">{statusChip(r.status)}</TableCell>
                      <TableCell align="center" onClick={e => e.stopPropagation()}>
                        {r.status === 'draft' && (
                          <Tooltip title="Approve report">
                            <IconButton size="small" color="success" onClick={() => { setSelectedReport(r); setApproveConfirm(true); }}>
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                        )}
                        {r.status === 'approved' && (
                          <Tooltip title="Mark paid & send emails">
                            <IconButton size="small" color="primary" onClick={() => { setSelectedReport(r); setPayConfirm(true); }}>
                              <Email />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ── Report Detail Dialog ── */}
      <Dialog open={!!selectedReport && !!reportDetail} onClose={() => { setSelectedReport(null); setReportDetail(null); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Timer color="warning" />
          <Box sx={{ flex: 1 }}>
            {reportDetail?.period} Deduction Report
            <Box sx={{ mt: 0.5 }}>{statusChip(reportDetail?.status)}</Box>
          </Box>
          <Tooltip title="Download CSV">
            <IconButton onClick={downloadCSV}><Download /></IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
          ) : reportDetail && (
            <>
              <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Buffer Applied</Typography>
                  <Typography fontWeight={700}>{reportDetail.bufferMinutes} min</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Deduction</Typography>
                  <Typography fontWeight={700} color="error">-{fmt(reportDetail.totalDeductionAmount)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Employees Affected</Typography>
                  <Typography fontWeight={700}>{reportDetail.employees?.length}</Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {reportDetail.employees?.map(emp => (
                <Card key={emp.employeeId} variant="outlined" sx={{ mb: 1.5 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography fontWeight={700}>{emp.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{emp.position} · {emp.totalLateMinutes} min late</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">Deduction</Typography>
                        <Typography fontWeight={700} color="error">-{fmt(emp.deductionAmount)}</Typography>
                        <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                          Net: {fmt(emp.finalSalary)}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setExpandedEmp(expandedEmp === emp.employeeId ? null : emp.employeeId)}>
                        {expandedEmp === emp.employeeId ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    {expandedEmp === emp.employeeId && (
                      <Box sx={{ mt: 1.5 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Scheduled</TableCell>
                              <TableCell>Arrived</TableCell>
                              <TableCell align="center">Late</TableCell>
                              <TableCell align="right">Deduction</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(emp.records || []).map(r => (
                              <TableRow key={r._id}>
                                <TableCell>{fmtDate(r.date)}</TableCell>
                                <TableCell>{r.scheduledStart}</TableCell>
                                <TableCell>{fmtTime(r.actualCheckIn)}</TableCell>
                                <TableCell align="center"><Chip label={`${r.lateMinutes}m`} size="small" color="warning" /></TableCell>
                                <TableCell align="right" sx={{ color: 'error.main' }}>-{fmt(r.deductionAmount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSelectedReport(null); setReportDetail(null); }}>Close</Button>
          {selectedReport?.status === 'draft' && (
            <Button variant="contained" color="success" startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
              onClick={() => setApproveConfirm(true)} disabled={actionLoading}>
              Approve
            </Button>
          )}
          {selectedReport?.status === 'approved' && (
            <Button variant="contained" color="primary" startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <Email />}
              onClick={() => setPayConfirm(true)} disabled={actionLoading}>
              Mark Paid & Send Reports
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Approve confirm */}
      <Dialog open={approveConfirm} onClose={() => setApproveConfirm(false)}>
        <DialogTitle>Approve Report?</DialogTitle>
        <DialogContent><DialogContentText>
          This will approve the deduction report for {selectedReport?.period}. Employees will be notified when you mark it as paid.
        </DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveConfirm(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove}>Approve</Button>
        </DialogActions>
      </Dialog>

      {/* Pay & send confirm */}
      <Dialog open={payConfirm} onClose={() => setPayConfirm(false)}>
        <DialogTitle>Mark as Paid & Send Reports?</DialogTitle>
        <DialogContent><DialogContentText>
          This will mark the {selectedReport?.period} report as paid and send a deduction breakdown email to every affected employee. This cannot be undone.
        </DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setPayConfirm(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handlePayAndSend}>Confirm & Send</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
