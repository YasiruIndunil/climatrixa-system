# Climatrixa Web Dashboard

React.js web dashboard for the Climatrixa Smart Environmental Monitoring System.

## Overview

This dashboard provides a role-based web interface for the Climatrixa system:

- **Public users** — view live sensor readings, historical charts, AI forecasts, and alerts for assigned sensors
- **Administrators** — full system management including sensors, users, alert rules, subscriptions, and data export

## Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + Vite 8 | Frontend framework and build tool |
| Tailwind CSS v4 | Utility-first styling |
| React Router v7 | Client-side routing |
| TanStack Query v5 | Data fetching and caching |
| Axios | HTTP client with JWT interceptors |
| Recharts | Data visualisation charts |
| Lucide React | Icon library |

## Project Structure

```
src/
├── App.jsx                          # Root component with routing
├── index.css                        # Tailwind CSS entry point
├── utils/
│   └── api.js                       # Axios instance with JWT interceptor
├── context/
│   ├── AuthContext.jsx              # Authentication state provider
│   └── useAuth.js                   # useAuth hook
├── components/
│   ├── AdminLayout.jsx              # Admin panel layout with sidebar
│   └── ProtectedRoute.jsx           # Route guard component
└── pages/
    ├── Login.jsx                    # Login page
    └── admin/
        ├── Overview.jsx             # Admin overview (stats + live readings)
        ├── Sensors.jsx              # Sensor management (CRUD + MAC address)
        ├── Users.jsx                # User management + sensor assignment
        ├── Alerts.jsx               # Alert rules + event history
        └── Export.jsx               # Data export (CSV/PDF)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
cd smart-env-web
npm install
```

### Environment

The dashboard connects to the live Climatrixa backend API:

```
https://climatrixa-system-api.onrender.com
```

To use a local backend during development, update `src/utils/api.js`:

```js
const API_BASE = 'http://localhost:8000'
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build for production

```bash
npm run build
```

Output in `dist/` — deploy to Vercel, Netlify, or any static host.

## Authentication

- All accounts are created by administrators — no self-registration
- JWT tokens are stored in `localStorage` and attached to every API request automatically
- Role-based routing: admin users → `/admin`, public users → `/dashboard`
- Token expiry triggers automatic redirect to `/login`

## Admin Panel Features

| Page | Features |
|---|---|
| Overview | Live sensor readings (auto-refresh 30s), system stats, recent alerts |
| Sensors | Register sensors with MAC address, edit GPS coordinates, toggle active/inactive |
| Users | Create accounts, assign sensors, change roles, enable/disable accounts |
| Alert Rules | Configure thresholds per sensor, view triggered alert event history |
| Export | Download readings and alert events as CSV or PDF |

## Device Authentication

Climatrixa v2.1 uses brand key + MAC address authentication:

- All ESP32 devices share one brand key (`climatrixa-secret-2026`) proving they are genuine Climatrixa hardware
- Each device is identified by its unique hardware MAC address
- Admin registers the MAC address when setting up a new sensor node
- Device replacement requires only updating the MAC address in the Sensors page — no firmware reflashing needed

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

### Netlify

```bash
npm run build
# Deploy the dist/ folder
```

### Important — SPA routing

Add a redirect rule so React Router handles all routes:

**Vercel** — `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify** — `public/_redirects`:
```
/*  /index.html  200
```

## Related Components

| Component | Repository path |
|---|---|
| Backend API | `smart-env-backend/` |
| IoT Firmware | `smart-env-iot/firmware/climatrixa_production/` |
| Mobile App | `smart-env-mobile/` |

## Live API Documentation

[https://climatrixa-system-api.onrender.com/docs](https://climatrixa-system-api.onrender.com/docs)
