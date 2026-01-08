"""
WatchGuard Scheduler - APScheduler-based daemon for periodic monitoring.

Fetches scheduler config from the API and runs monitoring jobs at configured intervals.
Respects the active hours window and can be triggered for immediate runs.

Usage:
    python -m watchguard.cli scheduler
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import httpx
import structlog
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .config import get_config
from .runner import run_all

log = structlog.get_logger()

# Default check interval (in minutes) for scheduler config updates
CONFIG_CHECK_INTERVAL_MINUTES = 1


@dataclass
class SchedulerConfig:
    """Scheduler configuration from API."""
    enabled: bool = True
    start_hour: int = 7
    end_hour: int = 17
    interval_hours: int = 3
    last_run: Optional[datetime] = None
    next_scheduled_run: Optional[datetime] = None
    trigger_pending: bool = False


class WatchGuardScheduler:
    """
    Scheduler daemon that periodically runs WatchGuard monitoring.

    Features:
    - Fetches config from API on each run
    - Respects enabled flag and active hours window
    - Supports immediate trigger via API flag
    - Graceful handling of API connection errors
    """

    def __init__(self, api_url: Optional[str] = None):
        """
        Initialize the scheduler.

        Args:
            api_url: Base URL of RiskMonitor API. Defaults to config setting.
        """
        if api_url is None:
            config = get_config()
            api_url = config.settings.api_url

        self.api_url = api_url.rstrip("/")
        self.scheduler = BlockingScheduler()
        self._last_interval_hours: Optional[int] = None
        self._job_id = "watchguard_monitor"

    def _fetch_scheduler_config(self) -> Optional[SchedulerConfig]:
        """
        Fetch scheduler configuration from the API.

        Returns:
            SchedulerConfig if successful, None on error.
        """
        url = f"{self.api_url}/watchguard/scheduler/status"

        try:
            with httpx.Client(timeout=10) as client:
                response = client.get(url)

                if response.status_code == 200:
                    data = response.json()
                    return SchedulerConfig(
                        enabled=data.get("enabled", True),
                        start_hour=data.get("start_hour", 7),
                        end_hour=data.get("end_hour", 17),
                        interval_hours=data.get("interval_hours", 3),
                        last_run=datetime.fromisoformat(data["last_run"]) if data.get("last_run") else None,
                        next_scheduled_run=datetime.fromisoformat(data["next_scheduled_run"]) if data.get("next_scheduled_run") else None,
                        trigger_pending=data.get("trigger_pending", False),
                    )
                else:
                    log.warning("scheduler_config_fetch_failed",
                              status=response.status_code,
                              url=url)
                    return None

        except httpx.ConnectError:
            log.warning("scheduler_api_unreachable", url=url)
            return None
        except Exception as e:
            log.exception("scheduler_config_error", error=str(e))
            return None

    def _mark_run_complete(self) -> bool:
        """
        Notify API that a run completed.

        Returns:
            True if successful, False on error.
        """
        url = f"{self.api_url}/watchguard/scheduler/mark-run"

        try:
            with httpx.Client(timeout=10) as client:
                response = client.post(url)
                return response.status_code == 200
        except Exception as e:
            log.warning("mark_run_failed", error=str(e))
            return False

    def _is_within_active_hours(self, config: SchedulerConfig) -> bool:
        """
        Check if current time is within the active hours window.

        Args:
            config: Scheduler configuration.

        Returns:
            True if within window, False otherwise.
        """
        now = datetime.utcnow()
        return config.start_hour <= now.hour < config.end_hour

    def _should_run(self, config: SchedulerConfig) -> tuple[bool, str]:
        """
        Determine if monitoring should run based on config.

        Args:
            config: Scheduler configuration.

        Returns:
            Tuple of (should_run, reason).
        """
        # Check for immediate trigger
        if config.trigger_pending:
            return True, "trigger_pending"

        # Check if enabled
        if not config.enabled:
            return False, "scheduler_disabled"

        # Check active hours
        if not self._is_within_active_hours(config):
            return False, "outside_active_hours"

        return True, "scheduled"

    def _execute_monitoring_job(self):
        """
        Main job execution - fetches config and runs monitoring if appropriate.
        """
        log.info("scheduler_job_tick")

        # Fetch latest config from API
        config = self._fetch_scheduler_config()

        if config is None:
            log.warning("scheduler_config_unavailable",
                       action="using_defaults_skip_run")
            return

        # Check if we should run
        should_run, reason = self._should_run(config)

        if not should_run:
            log.info("scheduler_skip", reason=reason,
                    enabled=config.enabled,
                    start_hour=config.start_hour,
                    end_hour=config.end_hour,
                    current_hour=datetime.utcnow().hour)
            return

        # Run monitoring
        log.info("scheduler_run_start", reason=reason)

        try:
            results = run_all()

            # Log summary
            successful = sum(1 for r in results if r.success)
            ingested = sum(1 for r in results if r.was_ingested)

            log.info("scheduler_run_complete",
                    total=len(results),
                    successful=successful,
                    ingested=ingested)

            # Mark run as complete in API
            self._mark_run_complete()

        except Exception as e:
            log.exception("scheduler_run_error", error=str(e))

    def _update_job_interval(self, interval_hours: int):
        """
        Update the job interval if it changed.

        Args:
            interval_hours: New interval in hours.
        """
        if self._last_interval_hours == interval_hours:
            return

        log.info("scheduler_interval_changed",
                old_interval=self._last_interval_hours,
                new_interval=interval_hours)

        # Remove existing job if any
        if self.scheduler.get_job(self._job_id):
            self.scheduler.remove_job(self._job_id)

        # Add job with new interval
        self.scheduler.add_job(
            self._execute_monitoring_job,
            IntervalTrigger(hours=interval_hours),
            id=self._job_id,
            name="WatchGuard Monitor",
            replace_existing=True,
        )

        self._last_interval_hours = interval_hours

    def start(self):
        """
        Start the scheduler daemon.

        Fetches initial config and starts the APScheduler blocking loop.
        """
        log.info("scheduler_starting", api_url=self.api_url)

        # Fetch initial config
        config = self._fetch_scheduler_config()

        if config:
            interval_hours = config.interval_hours
            log.info("scheduler_config_loaded",
                    enabled=config.enabled,
                    start_hour=config.start_hour,
                    end_hour=config.end_hour,
                    interval_hours=interval_hours)
        else:
            interval_hours = 3  # Default
            log.warning("scheduler_using_defaults", interval_hours=interval_hours)

        # Add the main monitoring job
        self.scheduler.add_job(
            self._execute_monitoring_job,
            IntervalTrigger(hours=interval_hours),
            id=self._job_id,
            name="WatchGuard Monitor",
            replace_existing=True,
        )
        self._last_interval_hours = interval_hours

        # Also add a config check job that runs more frequently
        # This allows picking up config changes without waiting for the full interval
        self.scheduler.add_job(
            self._config_check_job,
            IntervalTrigger(minutes=CONFIG_CHECK_INTERVAL_MINUTES),
            id="config_check",
            name="Config Check",
            replace_existing=True,
        )

        # Run immediately on start
        log.info("scheduler_initial_run")
        self._execute_monitoring_job()

        # Get next run time (handle both APScheduler 3.x and 4.x)
        job = self.scheduler.get_job(self._job_id)
        try:
            next_run = job.next_fire_time  # APScheduler 4.x
        except AttributeError:
            next_run = getattr(job, 'next_run_time', None)  # APScheduler 3.x

        log.info("scheduler_started",
                interval_hours=interval_hours,
                next_run=next_run)

        try:
            self.scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            log.info("scheduler_shutdown")
            self.scheduler.shutdown()

    def _config_check_job(self):
        """
        Periodic job to check for config changes and immediate triggers.

        Runs more frequently than the main job to:
        - Pick up interval changes
        - Detect trigger_pending flag for immediate runs
        """
        config = self._fetch_scheduler_config()

        if config is None:
            return

        # Check for trigger_pending (immediate run requested)
        if config.trigger_pending:
            log.info("scheduler_trigger_detected")
            self._execute_monitoring_job()
            return

        # Check for interval changes
        if config.interval_hours != self._last_interval_hours:
            self._update_job_interval(config.interval_hours)


def run_scheduler(api_url: Optional[str] = None):
    """
    Start the WatchGuard scheduler daemon.

    Args:
        api_url: Optional API URL override.
    """
    scheduler = WatchGuardScheduler(api_url=api_url)
    scheduler.start()
