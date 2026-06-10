"""Celery worker + beat schedule for background monitoring.

Optional: requires `celery` and `redis` (uncomment in requirements.txt).
Run with:
    celery -A app.worker.celery_app worker --beat --loglevel=info
"""
from __future__ import annotations

import asyncio

try:
    from celery import Celery
    from celery.schedules import crontab

    from app.core.config import settings
    from app.services.monitoring import run_all_subscriptions

    celery_app = Celery("researchpilot", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

    celery_app.conf.beat_schedule = {
        "check-subscriptions-hourly": {
            "task": "app.worker.check_all",
            "schedule": crontab(minute=0),  # every hour
        }
    }

    @celery_app.task(name="app.worker.check_all")
    def check_all():
        return asyncio.run(run_all_subscriptions())

except ImportError:
    # Celery not installed — monitoring still works via POST /api/monitoring/run.
    celery_app = None
