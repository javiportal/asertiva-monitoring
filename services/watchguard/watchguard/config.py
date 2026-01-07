"""
Configuration loader for WatchGuard.
"""

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml


@dataclass
class SiteConfig:
    url: str
    name: str
    fetch_mode: str = "http"
    content_selector: Optional[str] = None
    source_name: Optional[str] = None
    source_country: Optional[str] = "México"
    rate_limit_seconds: int = 5
    exclude_selectors: list[str] = field(default_factory=list)
    ignore_patterns: list[str] = field(default_factory=list)


@dataclass
class Settings:
    api_url: str = "http://localhost:8000"
    db_path: str = "./data/watchguard.db"
    default_rate_limit_seconds: int = 5
    user_agent: str = "WatchGuard/1.0"


@dataclass
class Config:
    settings: Settings
    sites: list[SiteConfig]


def _expand_env_vars(value: str) -> str:
    pattern = r'\$\{([^}:]+)(?::-([^}]*))?\}'
    def replacer(match):
        var_name = match.group(1)
        default = match.group(2) or ""
        return os.environ.get(var_name, default)
    return re.sub(pattern, replacer, value)


def _process_dict(d: dict) -> dict:
    result = {}
    for key, value in d.items():
        if isinstance(value, str):
            result[key] = _expand_env_vars(value)
        elif isinstance(value, dict):
            result[key] = _process_dict(value)
        elif isinstance(value, list):
            result[key] = [_process_dict(item) if isinstance(item, dict) else item for item in value]
        else:
            result[key] = value
    return result


def load_config(config_path: Optional[Path] = None) -> Config:
    if config_path is None:
        config_path = Path(__file__).parent.parent / "config" / "sites.yaml"
    
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    with open(config_path) as f:
        raw_config = yaml.safe_load(f)
    
    raw_config = _process_dict(raw_config)
    
    raw_settings = raw_config.get("settings", {})
    settings = Settings(
        api_url=raw_settings.get("api_url", "http://localhost:8000"),
        db_path=raw_settings.get("db_path", "./data/watchguard.db"),
        default_rate_limit_seconds=raw_settings.get("default_rate_limit_seconds", 5),
        user_agent=raw_settings.get("user_agent", "WatchGuard/1.0"),
    )
    
    sites = []
    for site_data in raw_config.get("sites", []):
        site = SiteConfig(
            url=site_data["url"],
            name=site_data["name"],
            fetch_mode=site_data.get("fetch_mode", "http"),
            content_selector=site_data.get("content_selector"),
            source_name=site_data.get("source_name"),
            source_country=site_data.get("source_country", "México"),
            rate_limit_seconds=site_data.get("rate_limit_seconds", settings.default_rate_limit_seconds),
            exclude_selectors=site_data.get("exclude_selectors", []),
            ignore_patterns=site_data.get("ignore_patterns", []),
        )
        sites.append(site)
    
    return Config(settings=settings, sites=sites)


_config: Optional[Config] = None


def get_config() -> Config:
    global _config
    if _config is None:
        _config = load_config()
    return _config
