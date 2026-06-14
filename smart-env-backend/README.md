# IoT Smart Environmental Monitoring — Cloud Backend

FastAPI + Supabase backend for the IoT Environmental Monitoring and Prediction System.

## Tech Stack (All FREE)
| Layer | Tool | Purpose |
|---|---|---|
| Backend | Python FastAPI | REST API + WebSocket server |
| Database | Supabase (PostgreSQL) | Data storage + real-time subscriptions |
| Hosting | Render | Free cloud deployment |
| IoT Broker | HiveMQ (free tier) | MQTT message broker |
| AI/ML | scikit-learn + statsmodels | Prediction + anomaly detection |

## Project Structure
```
smart-env-backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── core/
│   │   ├── config.py        # Environment variables & settings
│   │   ├── database.py      # Supabase client setup
│   │   └── security.py      # JWT auth helpers
│   ├── routers/
│   │   ├── auth.py          # Login, register, token refresh
│   │   ├── sensors.py       # Sensor CRUD + live data
│   │   ├── readings.py      # Sensor readings (store + fetch)
│   │   ├── predictions.py   # AI forecast endpoints
│   │   └── alerts.py        # Alert rules + notification triggers
│   ├── models/
│   │   └── schemas.py       # Pydantic request/response models
│   ├── services/
│   │   ├── mqtt_client.py   # HiveMQ subscriber (IoT data ingestion)
│   │   ├── ai_engine.py     # LSTM / anomaly detection logic
│   │   └── alert_service.py # Threshold checks + alert dispatch
│   └── schemas/             # Supabase table SQL (run once)
│       └── init.sql
├── tests/
│   └── test_readings.py
├── scripts/
│   └── seed_data.py         # Generate sample sensor data
├── .env.example             # Copy to .env and fill in your keys
├── requirements.txt
├── render.yaml              # Render deployment config
└── README.md
```

## Quick Start (Step by Step)

### Step 1 — Clone & create virtual environment
```bash
git clone <your-repo-url>
cd smart-env-backend
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows
pip install -r requirements.txt
```

### Step 2 — Set up Supabase
1. Go to https://supabase.com → New Project (free)
2. Copy your **Project URL** and **anon key** from Settings → API
3. Go to SQL Editor → paste contents of `app/schemas/init.sql` → Run

### Step 3 — Set up HiveMQ (MQTT broker)
1. Go to https://www.hivemq.com/mqtt-cloud-broker/ → Free plan
2. Create a cluster → copy **host**, **username**, **password**

### Step 4 — Configure environment
```bash
cp .env.example .env
# Then open .env and fill in your keys
```

### Step 5 — Run locally
```bash
uvicorn app.main:app --reload
```
Open http://localhost:8000/docs to see the interactive API docs.

### Step 6 — Deploy to Render (free)
1. Push your code to GitHub
2. Go to https://render.com → New Web Service → connect your repo
3. Set environment variables from your .env file
4. Deploy — Render auto-deploys on every git push

## API Endpoints Summary
| Method | Path | Description |
|---|---|---|
| POST | /auth/register | Register a new user |
| POST | /auth/login | Login, get JWT token |
| GET | /sensors | List all sensors |
| POST | /sensors | Add a new sensor |
| GET | /sensors/{id}/readings | Get readings for a sensor |
| POST | /readings | Store a new sensor reading (from ESP32) |
| GET | /readings/latest | Latest reading from all sensors |
| GET | /predictions/{sensor_id} | AI forecast for next 24 hours |
| GET | /alerts | List all alert rules |
| POST | /alerts | Create an alert rule |
