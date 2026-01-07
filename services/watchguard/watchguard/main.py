"""
Allow running WatchGuard as a module.

Usage:
    python -m watchguard.cli run
    python -m watchguard.cli fetch https://example.com
    python -m watchguard.cli status
"""

from .cli import main

if __name__ == "__main__":
    main()