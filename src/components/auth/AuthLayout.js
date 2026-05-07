import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';

const highlights = [
  'Live announcements',
  'Geo-secure check-ins',
  'Mobile-first dashboards'
];

const metricCards = [
  { label: 'Attendance', value: 'Real-time' },
  { label: 'Payroll', value: 'Automated' },
  { label: 'Access', value: 'Role-based' }
];

const AuthLayout = ({ eyebrow, title, subtitle, children, sideNote }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1.05fr 0.95fr' },
        bgcolor: '#f3f6fb'
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 5,
          background:
            'radial-gradient(circle at top left, rgba(122,199,255,0.26), transparent 34%), linear-gradient(160deg, #08142e 0%, #0d224d 45%, #114a7c 100%)'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.04) 25%, transparent 25%) 0 0 / 32px 32px'
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="overline"
            sx={{ color: 'rgba(255,255,255,0.72)', letterSpacing: 2.2 }}
          >
            AutoPayroll Workspace
          </Typography>
          <Typography
            variant="h2"
            sx={{
              mt: 2,
              maxWidth: 460,
              color: '#ffffff',
              fontWeight: 800,
              lineHeight: 1.04,
              fontSize: { lg: '3.4rem', xl: '4rem' }
            }}
          >
            Run attendance, payroll, and team communication from one place.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 2.5,
              maxWidth: 480,
              color: 'rgba(255,255,255,0.78)',
              lineHeight: 1.75
            }}
          >
            {sideNote ||
              'Give managers a cleaner command center and employees a smoother mobile experience for check-ins, schedules, and announcements.'}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
            {highlights.map((item) => (
              <Chip
                key={item}
                label={item}
                sx={{
                  color: '#ffffff',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.12)'
                }}
              />
            ))}
          </Stack>
        </Box>

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 2
          }}
        >
          {metricCards.map((card) => (
            <Box
              key={card.label}
              sx={{
                borderRadius: 3,
                p: 2,
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(14px)'
              }}
            >
              <Typography sx={{ color: 'rgba(255,255,255,0.68)', fontSize: 12 }}>
                {card.label}
              </Typography>
              <Typography sx={{ color: '#ffffff', fontWeight: 700, fontSize: 20, mt: 0.75 }}>
                {card.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 3, md: 5 },
          py: { xs: 4, md: 6 }
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 520,
            borderRadius: { xs: 4, md: 5 },
            p: { xs: 3, sm: 4, md: 5 },
            bgcolor: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: '0 24px 80px rgba(15,23,42,0.12)',
            backdropFilter: 'blur(18px)'
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: '#246bce', letterSpacing: 2, fontWeight: 700 }}
          >
            {eyebrow}
          </Typography>
          <Typography
            variant="h4"
            sx={{ mt: 1, color: '#0f172a', fontWeight: 800, lineHeight: 1.15 }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{ mt: 1.25, mb: 3.5, color: '#475569', lineHeight: 1.7 }}
          >
            {subtitle}
          </Typography>

          <Box
            sx={{
              '& .MuiFormLabel-root': {
                color: '#64748b'
              },
              '& .MuiFormLabel-root.Mui-focused': {
                color: '#246bce'
              },
              '& .MuiInputBase-root': {
                color: '#0f172a',
                bgcolor: '#ffffff',
                borderRadius: 3
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(15,23,42,0.14)'
              },
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(36,107,206,0.38)'
              },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#246bce',
                borderWidth: 2
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#94a3b8',
                opacity: 1
              },
              '& .MuiInputBase-input:-webkit-autofill': {
                WebkitBoxShadow: '0 0 0 100px #ffffff inset',
                WebkitTextFillColor: '#0f172a',
                caretColor: '#0f172a',
                borderRadius: 'inherit'
              }
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;
