# Climatrixa Mobile App

Flutter mobile app for the **Climatrixa Smart Environmental Monitoring System**.  
BSc Software Engineering Final Year Project · ICBT / Cardiff Metropolitan University  

---

## Quick Start

```bash
flutter pub get
flutter run
```

> The app connects to the live backend at  
> `https://climatrixa-system-api.onrender.com`  
> No configuration needed — just sign in with your Climatrixa credentials.

---

## Features

| | Public users | Admin |
|---|---|---|
| Dashboard (live sensor readings) | ✅ | ✅ |
| Sensor list + detail | ✅ (assigned sensors) | ✅ (all) |
| Interactive map (OpenStreetMap) | ✅ | ✅ |
| Alert centre (Threshold / AI / Anomaly) | ✅ | ✅ |
| Export CSV | ✅ | ✅ + all sensors |
| Profile & notification settings | ✅ | ✅ |
| Admin overview dashboard | — | ✅ |
| Sensor CRUD | — | ✅ |
| User management (create / deactivate) | — | ✅ |
| AI prediction screen (24–48 h) | — | ✅ |
| Alert management (bulk acknowledge) | — | ✅ |

### Authentication
- Admin-managed accounts only — no self-registration (matches web solution)
- JWT stored in `flutter_secure_storage`
- Role-based routing: `public` → bottom nav; `admin` → drawer nav

### Real-time
- Sensor readings polled every **30 s**
- Alerts polled every **20 s**
- Alert popup mirrors web GlobalAlertPopup behaviour:  
  threshold / predicted remind every 1 min, anomaly every 15 min

---

## Architecture

```
lib/
  main.dart                  Entry point
  core/
    constants.dart           API URL, intervals, colour seeds
    theme.dart               Material 3 — teal (public) + purple (admin)
    api_client.dart          All REST calls + JWT auth
    router.dart              go_router — ShellRoute (public + admin)
  models/models.dart         AuthUser, Sensor, Reading, AlertEvent, ForecastPoint, AppUser
  providers/providers.dart   Riverpod — auth, sensors, readings, alerts, forecast, users
  widgets/widgets.dart       MetricCard, AqiBadge, ForecastChart, AlertCard, SensorCard, GlobalAlertPopup
  screens/
    login_screen.dart
    public/   (dashboard, sensors, sensor_detail, map, alerts, export, profile)
    admin/    (overview, sensors, add_edit_sensor, ai_predictions, users, alerts, export)
```

---

## API
Backend: `https://climatrixa-system-api.onrender.com`

Key endpoints used:
- `POST /auth/login` → JWT + user
- `GET /readings/latest` → live enriched readings
- `GET /sensors` / `GET /sensors/my-sensors`
- `GET /alerts/events`, `PATCH /alerts/events/{id}/acknowledge`
- `GET /ai/forecast/{sensor_id}?hours_ahead=24`
- `GET /readings/export`, `GET /alerts/events/export`
- `GET /users`, `POST /users`, `PATCH /users/{id}`, `DELETE /users/{id}`

---

## Stack
- **flutter_riverpod** — state management
- **go_router** — navigation with ShellRoute
- **flutter_map + OpenStreetMap** — sensor map (no API key)
- **fl_chart** — AI forecast charts
- **flutter_secure_storage** — JWT persistence
- **http** — REST calls
