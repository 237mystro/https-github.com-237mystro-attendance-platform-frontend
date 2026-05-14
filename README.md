# Autopay Frontend

Autopay is a React frontend for employee management, attendance check-in, scheduling, payroll, settings, profiles, and messaging.

## Requirements

- Node.js 18 or newer
- npm
- A running Autopay backend API

## Environment

Create a `.env` file in the project root:

```env
REACT_APP_API_URL=https://attendance-platform-backend.onrender.com/api/v1
REACT_APP_FRONTEND_URL=https://autopay-mu.vercel.app
REACT_APP_SOCKET_URL=https://attendance-platform-backend.onrender.com
REACT_APP_OFFICE_LATITUDE=4.1025
REACT_APP_OFFICE_LONGITUDE=9.3908
REACT_APP_VERIFICATION_RADIUS=20
```

`REACT_APP_SOCKET_URL` is optional. If it is not set, the app derives the socket URL from `REACT_APP_API_URL` by removing `/api/v1`.

## Scripts

```bash
npm start
```

Runs the development server at `http://localhost:3000`.

```bash
npm run build
```

Creates a production build in `build/`.

```bash
npm test
```

Runs the Create React App test runner.

## Main Areas

- Admin dashboard for employees, attendance, scheduling, payroll, settings, profile, and messaging.
- Employee dashboard for check-in, schedule, payments, settings, profile, and messaging.
- QR check-in with browser camera access and location verification.
- Socket.IO messaging with unread-count polling as a fallback.

## Notes

- Auth session data is stored in browser localStorage and guarded client-side before protected routes render. The backend should still enforce authorization for every protected API endpoint.
- Office coordinates and verification radius are configurable through environment variables.
- Camera and geolocation features require browser permissions and HTTPS in production.
