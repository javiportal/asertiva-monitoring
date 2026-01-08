"""
WatchGuard CLI - Command line interface.

Usage:
    python -m watchguard.cli run              # Run all configured monitors
    python -m watchguard.cli fetch <url>      # Fetch single URL (for testing)
    python -m watchguard.cli status           # Show status of all monitors
    python -m watchguard.cli scheduler        # Start the scheduler daemon
    python -m watchguard.cli scheduler-status # Show scheduler config from API
    python -m watchguard.cli trigger          # Trigger immediate scheduler run
    python -m watchguard.cli test-api         # Test API connectivity
"""

import sys
from pathlib import Path

import click
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(colors=True),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

log = structlog.get_logger()


@click.group()
@click.option("--config", "-c", type=click.Path(exists=True), help="Path to sites.yaml config file")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
@click.pass_context
def cli(ctx, config, verbose):
    """WatchGuard - Custom web monitoring for regulatory sources."""
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = Path(config) if config else None
    ctx.obj["verbose"] = verbose
    
    if verbose:
        structlog.configure(
            processors=[
                structlog.stdlib.add_log_level,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.dev.ConsoleRenderer(colors=True),
            ],
        )


@cli.command()
@click.pass_context
def run(ctx):
    """Run monitors for all configured sites."""
    from .config import load_config
    from .runner import run_all
    
    config_path = ctx.obj.get("config_path")
    
    try:
        if config_path:
            config = load_config(config_path)
        else:
            config = load_config()
    except FileNotFoundError as e:
        log.error("config_not_found", error=str(e))
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)
    
    click.echo(f"🔍 Running WatchGuard for {len(config.sites)} site(s)...")
    click.echo()
    
    results = run_all(config)
    
    # Print summary
    click.echo()
    click.echo("=" * 60)
    click.echo("SUMMARY")
    click.echo("=" * 60)
    
    for result in results:
        status_icon = "✅" if result.success else "❌"
        
        if result.was_ingested:
            status = f"INGESTED (id={result.change_id})"
        elif result.was_duplicate:
            status = "DUPLICATE"
        elif result.is_changed and not result.is_meaningful:
            status = "MINOR CHANGE (skipped)"
        elif not result.is_changed:
            status = "NO CHANGE"
        elif result.error:
            status = f"ERROR: {result.error}"
        else:
            status = "UNKNOWN"
        
        click.echo(f"{status_icon} {result.name}")
        click.echo(f"   URL: {result.url}")
        click.echo(f"   Status: {status}")
        if result.diff_summary:
            click.echo(f"   Changes: {result.diff_summary}")
        click.echo()
    
    # Exit code
    failures = sum(1 for r in results if not r.success)
    if failures > 0:
        click.echo(f"⚠️  {failures} site(s) failed")
        sys.exit(1)
    
    ingested = sum(1 for r in results if r.was_ingested)
    click.echo(f"✅ Complete. {ingested} change(s) ingested.")


@cli.command()
@click.argument("url")
@click.pass_context
def fetch(ctx, url):
    """Fetch and monitor a single URL (for testing)."""
    from .runner import run_url
    
    click.echo(f"🔍 Fetching: {url}")
    click.echo()
    
    result = run_url(url)
    
    if result.success:
        if result.was_ingested:
            click.echo(f"✅ Change detected and ingested (id={result.change_id})")
        elif result.was_duplicate:
            click.echo("ℹ️  Change was duplicate (already exists)")
        elif result.is_changed and not result.is_meaningful:
            click.echo("ℹ️  Minor change detected (not meaningful enough)")
        elif not result.is_changed:
            click.echo("ℹ️  No change detected")
        else:
            click.echo("✅ Processed successfully")
        
        if result.diff_summary:
            click.echo(f"   Changes: {result.diff_summary}")
    else:
        click.echo(f"❌ Failed: {result.error}")
        sys.exit(1)


@cli.command()
@click.pass_context  
def status(ctx):
    """Show status of all monitored URLs."""
    from .config import load_config
    from .storage import get_storage
    
    config_path = ctx.obj.get("config_path")
    
    try:
        if config_path:
            config = load_config(config_path)
        else:
            config = load_config()
    except FileNotFoundError as e:
        log.error("config_not_found", error=str(e))
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)
    
    storage = get_storage()
    
    click.echo("📊 WatchGuard Status")
    click.echo("=" * 60)
    click.echo()
    
    for site in config.sites:
        snapshot = storage.get_latest_snapshot(site.url)
        snapshot_count = storage.get_snapshot_count(site.url)
        
        click.echo(f"📌 {site.name}")
        click.echo(f"   URL: {site.url}")
        click.echo(f"   Mode: {site.fetch_mode}")
        
        if snapshot:
            click.echo(f"   Last fetch: {snapshot.fetched_at.isoformat()}")
            click.echo(f"   Snapshots: {snapshot_count}")
            click.echo(f"   Hash: {snapshot.content_hash[:16]}...")
        else:
            click.echo("   Status: Never fetched")
        
        click.echo()
    
    click.echo(f"Total sites: {len(config.sites)}")


@cli.command()
@click.pass_context
def test_api(ctx):
    """Test connection to the RiskMonitor API."""
    import httpx
    from .config import get_config

    config = get_config()
    api_url = config.settings.api_url

    click.echo(f"🔗 Testing connection to: {api_url}")

    try:
        with httpx.Client(timeout=10) as client:
            # Try health endpoint first
            response = client.get(f"{api_url}/health")

            if response.status_code == 200:
                click.echo("✅ API is reachable")
                click.echo(f"   Response: {response.json()}")
            else:
                click.echo(f"⚠️  API returned status {response.status_code}")

    except httpx.ConnectError:
        click.echo("❌ Could not connect to API")
        click.echo(f"   Make sure the API is running at {api_url}")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        sys.exit(1)


@cli.command()
@click.option("--api-url", "-a", type=str, help="Override API URL from config")
@click.pass_context
def scheduler(ctx, api_url):
    """Start the scheduler daemon for periodic monitoring.

    The scheduler will:
    - Fetch configuration from the API on startup
    - Run monitoring at the configured interval_hours
    - Respect the active hours window (start_hour to end_hour)
    - Support immediate triggers via the API

    Configuration is read from the API at:
    GET /watchguard/scheduler/status

    After each run, it calls:
    POST /watchguard/scheduler/mark-run
    """
    from .scheduler import run_scheduler
    from .config import get_config

    if api_url is None:
        config = get_config()
        api_url = config.settings.api_url

    click.echo("🚀 Starting WatchGuard Scheduler Daemon")
    click.echo(f"   API URL: {api_url}")
    click.echo()
    click.echo("Press Ctrl+C to stop")
    click.echo("=" * 60)
    click.echo()

    try:
        run_scheduler(api_url=api_url)
    except KeyboardInterrupt:
        click.echo()
        click.echo("👋 Scheduler stopped")


@cli.command("scheduler-status")
@click.pass_context
def scheduler_status(ctx):
    """Show current scheduler configuration from API."""
    import httpx
    from .config import get_config

    config = get_config()
    api_url = config.settings.api_url
    url = f"{api_url}/watchguard/scheduler/status"

    click.echo(f"📊 Fetching scheduler status from: {url}")
    click.echo()

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url)

            if response.status_code == 200:
                data = response.json()

                enabled_icon = "✅" if data["enabled"] else "❌"
                click.echo(f"Enabled:        {enabled_icon} {data['enabled']}")
                click.echo(f"Active hours:   {data['start_hour']:02d}:00 - {data['end_hour']:02d}:00")
                click.echo(f"Interval:       Every {data['interval_hours']} hour(s)")
                click.echo(f"Last run:       {data['last_run'] or 'Never'}")
                click.echo(f"Next scheduled: {data['next_scheduled_run'] or 'N/A'}")
                click.echo(f"Trigger pending: {'Yes' if data.get('trigger_pending') else 'No'}")
            else:
                click.echo(f"⚠️  API returned status {response.status_code}")
                if response.status_code == 500:
                    click.echo("   Migration 005 may not be applied yet.")
                sys.exit(1)

    except httpx.ConnectError:
        click.echo("❌ Could not connect to API")
        click.echo(f"   Make sure the API is running at {api_url}")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        sys.exit(1)


@cli.command("trigger")
@click.pass_context
def trigger_run(ctx):
    """Trigger an immediate scheduler run via API."""
    import httpx
    from .config import get_config

    config = get_config()
    api_url = config.settings.api_url
    url = f"{api_url}/watchguard/scheduler/trigger"

    click.echo(f"🔔 Triggering immediate run...")

    try:
        with httpx.Client(timeout=10) as client:
            response = client.post(url)

            if response.status_code == 200:
                data = response.json()
                click.echo(f"✅ {data['message']}")
            else:
                click.echo(f"⚠️  API returned status {response.status_code}")
                sys.exit(1)

    except httpx.ConnectError:
        click.echo("❌ Could not connect to API")
        click.echo(f"   Make sure the API is running at {api_url}")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        sys.exit(1)


def main():
    """Entry point for the CLI."""
    cli(obj={})


if __name__ == "__main__":
    main()