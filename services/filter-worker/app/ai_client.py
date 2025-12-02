import os
from typing import Dict

import requests

# Dentro de la red de Docker, el servicio se llama "ai-filter"
DEFAULT_AI_FILTER_BASE_URL = "http://ai-filter:8100"
AI_FILTER_BASE_URL = os.getenv("AI_FILTER_BASE_URL", DEFAULT_AI_FILTER_BASE_URL)

session = requests.Session()


class AIFilterError(Exception):
    pass


def classify_change(title: str | None, content: str, url: str | None = None) -> Dict:
    """
    Llama al servicio AI Filter y devuelve un dict con:
      - importance
      - score
      - reason
    """
    payload = {
        "title": title,
        "content": content,
        "url": url,
    }

    url_endpoint = f"{AI_FILTER_BASE_URL}/classify"

    resp = session.post(url_endpoint, json=payload, timeout=30)
    try:
        resp.raise_for_status()
    except Exception as e:
        raise AIFilterError(f"Error llamando a AI Filter: {e}, body={resp.text}") from e

    data = resp.json()
    # Esperamos campos: importance, score, reason (como definimos en ai-filter)
    return {
        "importance": data.get("importance"),
        "score": data.get("score"),
        "reason": data.get("reason"),
    }
