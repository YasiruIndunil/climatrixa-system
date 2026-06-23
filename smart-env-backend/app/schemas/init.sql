-- ============================================================
-- Smart Environmental Monitoring System — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID extension (already on by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── Users table ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       TEXT UNIQUE NOT NULL,
    full_name   TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'public')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── Sensors table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensors (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             TEXT NOT NULL,
    location         TEXT NOT NULL,
    latitude         DOUBLE PRECISION,
    longitude        DOUBLE PRECISION,
    industry_profile TEXT DEFAULT 'general',
    api_key          TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN sensors.api_key IS
    'Secret key stored on the ESP32 device. Sent with each reading.';
COMMENT ON COLUMN sensors.industry_profile IS
    'Values: general | spice_factory | supermarket | hospital | office';


-- ── Sensor readings table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS readings (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id    UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    temperature  DOUBLE PRECISION NOT NULL,   -- Celsius
    humidity     DOUBLE PRECISION NOT NULL,   -- Relative humidity %
    aqi          DOUBLE PRECISION NOT NULL,   -- Air Quality Index 0-500
    pressure     DOUBLE PRECISION,            -- hPa (optional, BME280 only)
    recorded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast time-series queries per sensor
CREATE INDEX IF NOT EXISTS idx_readings_sensor_time
    ON readings (sensor_id, recorded_at DESC);


-- ── Alert rules table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id       UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    alert_type      TEXT NOT NULL,
    threshold_value DOUBLE PRECISION NOT NULL,
    notify_email    TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_alert_type CHECK (alert_type IN (
        'temperature_high', 'temperature_low',
        'humidity_high', 'humidity_low',
        'aqi_high'
    ))
);


-- ── Alert events table (log of triggered alerts) ──────────────────────────────
CREATE TABLE IF NOT EXISTS alert_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id       UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    alert_type      TEXT NOT NULL,
    actual_value    DOUBLE PRECISION NOT NULL,
    threshold_value DOUBLE PRECISION NOT NULL,
    message         TEXT,
    triggered_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ── Predictions table (store AI outputs for caching) ─────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id        UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    forecast_json    JSONB NOT NULL,   -- array of {hours_ahead, temperature, humidity, aqi}
    anomaly_detected BOOLEAN DEFAULT FALSE,
    anomaly_desc     TEXT,
    generated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_sensor_time
    ON predictions (sensor_id, generated_at DESC);


-- ── User sensor access table ──────────────────────────────────────────────────
-- Admin assigns which sensors each user can see and subscribe to.
CREATE TABLE IF NOT EXISTS user_sensor_access (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sensor_id   UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, sensor_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sensor_access_user
    ON user_sensor_access (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sensor_access_sensor
    ON user_sensor_access (sensor_id);


-- ── User alert subscriptions table ────────────────────────────────────────────
-- Per-user, per-sensor, per-parameter alert subscription settings.
-- A user only receives alerts for parameters they have set to TRUE.
CREATE TABLE IF NOT EXISTS user_alert_subscriptions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sensor_id   UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    temperature BOOLEAN NOT NULL DEFAULT TRUE,
    humidity    BOOLEAN NOT NULL DEFAULT TRUE,
    aqi         BOOLEAN NOT NULL DEFAULT TRUE,
    pressure    BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, sensor_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
    ON user_alert_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_sensor
    ON user_alert_subscriptions (sensor_id);



-- Enable RLS so the Flutter/React apps (using anon key) only see what they should.
-- Your FastAPI backend uses the service key, so it bypasses RLS.

ALTER TABLE readings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions  ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sensors and readings (public dashboard)
CREATE POLICY "Public can read sensors"   ON sensors      FOR SELECT USING (TRUE);
CREATE POLICY "Public can read readings"  ON readings     FOR SELECT USING (TRUE);
CREATE POLICY "Public can read preds"     ON predictions  FOR SELECT USING (TRUE);
CREATE POLICY "Public can read events"    ON alert_events FOR SELECT USING (TRUE);

-- Only service role (backend) can write — enforced by using service key in FastAPI
-- No insert/update/delete policies needed for public (they use the FastAPI REST API)


-- ── Sample seed data (optional — comment out after first run) ─────────────────
INSERT INTO sensors (name, location, latitude, longitude, industry_profile) VALUES
    ('Sensor Alpha', 'Factory Floor A, Colombo',     6.9271,  79.8612, 'spice_factory'),
    ('Sensor Beta',  'Cold Storage B, Kandy',        7.2906,  80.6337, 'supermarket'),
    ('Sensor Gamma', 'ICU Ward, Galle Hospital',     6.0367,  80.2170, 'hospital')
ON CONFLICT DO NOTHING;
