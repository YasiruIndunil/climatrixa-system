"""
Seed Script — Generate sample sensor readings for testing.
Run: python scripts/seed_data.py

This generates 7 days of realistic dummy readings for each sensor in Supabase.
Useful for testing the AI forecast and dashboard charts.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import random
import math
from datetime import datetime, timedelta, timezone
from app.core.database import db


def generate_readings(sensor_id: str, days: int = 7):
    """Generate realistic environmental readings with daily patterns."""
    readings = []
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    # Reading every 30 minutes = 48 per day
    intervals = days * 48

    for i in range(intervals):
        timestamp = start + timedelta(minutes=30 * i)
        hour = timestamp.hour

        # Simulate daily temperature pattern: cooler at night, warmer midday
        base_temp  = 26 + 6 * math.sin((hour - 6) * math.pi / 12)
        base_humid = 65 - 10 * math.sin((hour - 8) * math.pi / 12)
        base_aqi   = 40 + 20 * math.sin((hour - 7) * math.pi / 12)

        readings.append({
            "sensor_id":   sensor_id,
            "temperature": round(base_temp  + random.gauss(0, 0.8), 1),
            "humidity":    round(base_humid + random.gauss(0, 2.0), 1),
            "aqi":         round(max(0, base_aqi + random.gauss(0, 5)), 1),
            "pressure":    round(1013 + random.gauss(0, 2), 1),
            "recorded_at": timestamp.isoformat(),
        })

    # Insert in batches of 100
    for i in range(0, len(readings), 100):
        batch = readings[i:i+100]
        db.table("readings").insert(batch).execute()
        print(f"  Inserted {min(i+100, len(readings))}/{len(readings)} readings...")


if __name__ == "__main__":
    print("Fetching active sensors...")
    sensors = db.table("sensors").select("id, name").eq("is_active", True).execute()

    if not sensors.data:
        print("No sensors found. Run the init.sql schema first.")
        sys.exit(1)

    for sensor in sensors.data:
        print(f"\nGenerating readings for: {sensor['name']} ({sensor['id']})")
        generate_readings(sensor["id"], days=7)

    print("\n✓ Seed data complete. You can now test the forecast and dashboard.")
