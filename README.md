# Climatrixa System

IoT-Based Smart Environmental Monitoring and Prediction System with Mobile and Web Integration.

Final year project (CIS6035 Development Project) — BSc (Hons) Software Engineering, ICBT Campus / Cardiff Metropolitan University.

## Components

This is a monorepo containing four independently deployable components, each with its own CI/CD pipeline (see `.github/workflows/`).

| Component | Description | Stack | Status |
|---|---|---|---|
| [`smart-env-backend`](./smart-env-backend) | Cloud API, database, AI engine | FastAPI, Supabase (PostgreSQL), Python | Active |
| [`smart-env-mobile`](./smart-env-mobile) | Cross-platform mobile app | Flutter | Planned |
| [`smart-env-web`](./smart-env-web) | Admin/analytics web dashboard | React.js | Planned |
| [`smart-env-iot`](./smart-env-iot) | ESP32 sensor firmware | C++ / Arduino / PlatformIO | Planned |

## Architecture overview

```
ESP32 sensor nodes --(MQTT)--> HiveMQ broker --> FastAPI backend --> Supabase (PostgreSQL)
                                                        |
                                                        +--> AI Engine (forecast + anomaly detection)
                                                        |
                                                        +--> REST API + WebSocket --> Mobile app / Web dashboard
```

## Current development status

The backend (`smart-env-backend`) is the active component and supports development without physical IoT hardware via a seed data script (`scripts/seed_data.py`) that simulates sensor readings.

## CI/CD

Each component has a path-filtered GitHub Actions workflow in `.github/workflows/`, so changes to one component only trigger that component's pipeline:

- `backend-ci.yml` — runs on changes to `smart-env-backend/**`
- `mobile-ci.yml` — runs on changes to `smart-env-mobile/**`
- `web-ci.yml` — runs on changes to `smart-env-web/**`
- `iot-ci.yml` — runs on changes to `smart-env-iot/**`

## Supervisor

Ms. Vijini Mekala — Cardiff School of Technologies, ICBT Campus.
