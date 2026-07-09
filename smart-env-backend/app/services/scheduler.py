"""
AI Model Retraining Scheduler — Climatrixa
───────────────────────────────────────────
Automatically retrains AI models on a schedule:
  - Weekly:  every Monday at 2:00 AM SLST
  - Monthly: 1st of each month at 3:00 AM SLST

Uses APScheduler (lightweight, no Redis needed).
"""
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler = None


def _retrain_all_sensors():
    """Fetch all active sensors and retrain their AI models."""
    try:
        from app.core.database import db
        from app.services.ai_engine import train_models

        sensors = db.table("sensors").select("id, name").eq("is_active", True).execute()
        if not sensors.data:
            logger.info("[Scheduler] No active sensors to retrain")
            return

        for sensor in sensors.data:
            logger.info(f"[Scheduler] Retraining AI for sensor: {sensor['name']}")
            try:
                result = train_models(sensor["id"])
                logger.info(f"[Scheduler] Done: {result}")
            except Exception as e:
                logger.error(f"[Scheduler] Failed for {sensor['name']}: {e}")

    except Exception as e:
        logger.error(f"[Scheduler] Retrain job failed: {e}")


def start_scheduler():
    """Start the background scheduler. Call once on app startup."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone="Asia/Colombo")

    # Weekly — every Monday at 2:00 AM SLST
    _scheduler.add_job(
        _retrain_all_sensors,
        CronTrigger(day_of_week="mon", hour=2, minute=0),
        id="weekly_retrain",
        name="Weekly AI model retrain",
        replace_existing=True,
    )

    # Monthly — 1st of each month at 3:00 AM SLST
    _scheduler.add_job(
        _retrain_all_sensors,
        CronTrigger(day=1, hour=3, minute=0),
        id="monthly_retrain",
        name="Monthly AI model retrain",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("[Scheduler] Started — weekly (Mon 2AM) and monthly (1st 3AM) retraining scheduled")


def stop_scheduler():
    """Stop the scheduler on app shutdown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
        logger.info("[Scheduler] Stopped")