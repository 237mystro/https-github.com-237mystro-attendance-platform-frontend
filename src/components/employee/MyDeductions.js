import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, Collapse, IconButton, Tooltip,
  LinearProgress
} from '@mui/material';
import {
  AccessTime, MoneyOff, CheckCircle, KeyboardArrowDown,
  KeyboardArrowUp, Info
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '--';

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';

const STATUS_COLORS = { draft: 'default', approved: 'primary', paid: 'success' };
const STATUS_LABELS = { draft: 'Pending', approved: 'Approved', paid: 'Paid' };

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function SummaryCard({ icon, label, value, color, sub }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
        </Box>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#1a2f52' }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function RecordRow({ record }) {
  return (
    <TableRow hover>
      <TableCell>{fmtDate(record.date)}</TableCell>
      <TableCell>{record.scheduledStart || '--'}</TableCell>
      <TableCell>{fmtTime(record.actualCheckIn)}</TableCell>
      <TableCell>
        <Chip
          label={`${record.lateMinutes} min`}
          size="small"
          sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 600, fontSize: 12 }}
        />
      </TableCell>
      <TableCell align="right" sx={{ color: '#d32f2f', fontWeight: 600 }}>
        -XAF {fmt(record.deductionAmount)}
      </TableCell>
    </TableRow>
  );
}

function ReportRow({ report, lateRecords }) {
  const [open, setOpen] = useState(false);
  const myRecords = lateRecords.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() + 1 === report.month && d.getFullYear() === report.year;
  });

  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <TableCell>
          <IconButton size="small">{open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}</IconButton>
        </TableCell>
        <TableCell><Typography fontWeight={600}>{report.period}</Typography></TableCell>
        <TableCell>
          <Chip
            label={STATUS_LABELS[report.status] || report.status}
            color={STATUS_COLORS[report.status] || 'default'}
            size="small"
          />
        </TableCell>
        <TableCell align="right">
          <Chip label={`${report.totalLateMinutes} min late`} size="small"
            sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 600 }} />
        </TableCell>
        <TableCell align="right" sx={{ color: '#d32f2f', fontWeight: 600 }}>
          -XAF {fmt(report.deductionAmount)}
        </TableCell>
        <TableCell align="right" sx={{ color: '#388e3c', fontWeight: 700 }}>
          XAF {fmt(report.finalSalary)}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: '#f9fafb' }}>
              <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Base Salary</Typography>
                  <Typography fontWeight={600}>XAF {fmt(report.baseSalary)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Deduction</Typography>
                  <Typography fontWeight={600} sx={{ color: '#d32f2f' }}>-XAF {fmt(report.deductionAmount)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Net Salary</Typography>
                  <Typography fontWeight={700} sx={{ color: '#388e3c' }}>XAF {fmt(report.finalSalary)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Buffer Applied</Typography>
                  <Typography fontWeight={600}>{report.bufferMinutes} min</Typography>
                </Box>
                {report.emailSentAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Report Emailed</Typography>
                    <Typography fontWeight={600}>{fmtDate(report.emailSentAt)}</Typography>
                  </Box>
                )}
              </Box>

              {myRecords.length > 0 && (
                <>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    LATE ARRIVAL DETAILS
                  </Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 2, overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 400 }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell>Date</TableCell>
                          <TableCell>Scheduled</TableCell>
                          <TableCell>Checked In</TableCell>
                          <TableCell>Late By</TableCell>
                          <TableCell align="right">Deduction</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {myRecords.map(r => <RecordRow key={r._id} record={r} />)}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {myRecords.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Detailed records not available for this period.
                </Alert>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function MyDeductions() {
  const [reports, setReports] = useState([]);
  const [lateRecords, setLateRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [repRes, recRes] = await Promise.all([
        apiRequest('/deductions/my-reports'),
        apiRequest('/deductions/my-records')
      ]);
      if (repRes?.success) setReports(repRes.data || []);
      if (recRes?.success) setLateRecords(recRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load deduction data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Summary stats
  const totalLateMinutes = lateRecords.reduce((s, r) => s + (r.lateMinutes || 0), 0);
  const totalDeducted = reports
    .filter(r => r.status === 'paid')
    .reduce((s, r) => s + (r.deductionAmount || 0), 0);
  const paidReports = reports.filter(r => r.status === 'paid').length;

  // Group current month late records
  const now = new Date();
  const thisMonthRecords = lateRecords.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ color: '#1a2f52', mb: 0.5 }}>
        My Deductions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track your late arrivals and salary deductions
      </Typography>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            icon={<AccessTime />}
            label="Total Late (All Time)"
            value={`${totalLateMinutes} min`}
            color="#ff9800"
            sub={`${lateRecords.length} late occurrence${lateRecords.length !== 1 ? 's' : ''}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            icon={<AccessTime />}
            label={`Late This Month (${MONTH_NAMES[now.getMonth()]})`}
            value={`${thisMonthRecords.reduce((s, r) => s + r.lateMinutes, 0)} min`}
            color="#e53935"
            sub={`${thisMonthRecords.length} occurrence${thisMonthRecords.length !== 1 ? 's' : ''}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            icon={<MoneyOff />}
            label="Total Deducted"
            value={`XAF ${fmt(totalDeducted)}`}
            color="#d32f2f"
            sub={`From ${paidReports} paid report${paidReports !== 1 ? 's' : ''}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            icon={<CheckCircle />}
            label="Reports Processed"
            value={reports.length}
            color="#388e3c"
            sub={`${paidReports} paid, ${reports.filter(r => r.status === 'approved').length} approved`}
          />
        </Grid>
      </Grid>

      {/* Current Month Late Records */}
      {thisMonthRecords.length > 0 && (
        <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AccessTime sx={{ color: '#ff9800' }} />
              <Typography variant="subtitle1" fontWeight={700}>
                {MONTH_NAMES[now.getMonth()]} {now.getFullYear()} — Late Records
              </Typography>
              <Tooltip title="These are your late arrivals this month. A report will be generated at month-end for admin approval.">
                <Info sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Box>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 400 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Scheduled</TableCell>
                    <TableCell>Checked In</TableCell>
                    <TableCell>Late By</TableCell>
                    <TableCell align="right">Est. Deduction</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {thisMonthRecords.map(r => <RecordRow key={r._id} record={r} />)}
                  <TableRow sx={{ bgcolor: '#fff8f0' }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell>
                      <Chip
                        label={`${thisMonthRecords.reduce((s, r) => s + r.lateMinutes, 0)} min`}
                        size="small"
                        sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#d32f2f', fontWeight: 700 }}>
                      -XAF {fmt(thisMonthRecords.reduce((s, r) => s + r.deductionAmount, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Reports */}
      <Card elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Monthly Deduction Reports
          </Typography>

          {!loading && reports.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography color="text.secondary">No deduction reports yet.</Typography>
              <Typography variant="body2" color="text.secondary">
                Reports are generated by your admin at the end of each month.
              </Typography>
            </Box>
          )}

          {reports.length > 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell width={40} />
                    <TableCell>Period</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Late Time</TableCell>
                    <TableCell align="right">Deduction</TableCell>
                    <TableCell align="right">Net Salary</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map(r => (
                    <ReportRow key={r._id} report={r} lateRecords={lateRecords} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />
      <Alert severity="info" icon={<Info />}>
        <Typography variant="body2">
          <strong>How deductions work:</strong> If you check in after your shift start time plus the
          buffer period, the late minutes are recorded. At month-end your admin generates a report,
          approves it, and sends you a copy by email. Deduction = (late minutes ÷ 60) × hourly rate.
        </Typography>
      </Alert>
    </Box>
  );
}
