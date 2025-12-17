import os
from typing import Dict

import requests

# Dentro de la red de Docker, el servicio se llama "ai-filter"
DEFAULT_AI_FILTER_BASE_URL = "http://ai-filter:8100"
AI_FILTER_BASE_URL = os.getenv("AI_FILTER_BASE_URL", DEFAULT_AI_FILTER_BASE_URL)

session = requests.Session()


class AIFilterError(Exception):
    pass


def classify_change(
    title: str | None,
    diff_text: str,
    url: str | None = None,
    current_snippet: str | None = None,
    previous_text: str | None = None,
    current_text: str | None = None,
    task_name: str | None = None,
    timestamp: str | None = None,
) -> Dict:
    """
    Llama al servicio AI Filter y devuelve un dict con:
      - importance
      - score
      - reason
      - headline (idea principal)
      - source_name (institución)
      - source_country (país)
    """
    payload = {
        "title": title,
        "diff_text": diff_text,
        "current_snippet": current_snippet,
        "previous_text": previous_text,
        "current_text": current_text,
        "url": url,
        "task_name": task_name,
        "timestamp": timestamp,
    }

    url_endpoint = f"{AI_FILTER_BASE_URL}/classify"

    resp = session.post(url_endpoint, json=payload, timeout=30)
    try:
        resp.raise_for_status()
    except Exception as e:
        raise AIFilterError(f"Error llamando a AI Filter: {e}, body={resp.text}") from e

    data = resp.json()
    # Esperamos campos: importance, score, reason, headline, source_name, source_country
    return {
        "importance": data.get("importance"),
        "score": data.get("score"),
        "reason": data.get("reason"),
        "headline": data.get("headline"),
        "source_name": data.get("source_name"),
        "source_country": data.get("source_country"),
    }
