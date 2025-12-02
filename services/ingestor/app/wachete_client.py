import os
import datetime as dt
from typing import List, Dict, Optional

import requests

WACHETE_BASE_URL = os.getenv("WACHETE_BASE_URL", "https://api.wachete.com/thirdparty/v1")
WACHETE_USER_ID = os.getenv("WACHETE_USER_ID")
WACHETE_API_KEY = os.getenv("WACHETE_API_KEY")

_session = requests.Session()
_token: Optional[str] = None


class WacheteAuthError(Exception):
    pass


def get_token() -> str:
    global _token
    if _token:
        return _token

    if not WACHETE_USER_ID or not WACHETE_API_KEY:
        raise WacheteAuthError("WACHETE_USER_ID o WACHETE_API_KEY no están definidos en el entorno")

    url = f"{WACHETE_BASE_URL}/user/apilogin"
    payload = {
        "userId": WACHETE_USER_ID,
        "apiKey": WACHETE_API_KEY,
    }

    resp = _session.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("token")
    if not token:
        raise WacheteAuthError(f"Respuesta de apilogin sin token: {data}")
    _token = token
    return _token


def get_recent_notifications(
    from_iso: Optional[str] = None,
    to_iso: Optional[str] = None,
    task_id: Optional[str] = None,
) -> List[Dict]:
    """
    Llama a /notification/list y devuelve la lista de notificaciones crudas (JSON).
    Luego el ingestor las transformará al formato que usamos en la BD.
    """
    token = get_token()
    url = f"{WACHETE_BASE_URL}/notification/list"

    headers = {
        "Authorization": f"bearer {token}",
        "Content-Type": "application/json",
    }

    params: Dict[str, str] = {}
    if from_iso:
        params["from"] = from_iso
    if to_iso:
        params["to"] = to_iso
    if task_id:
        params["taskId"] = task_id

    resp = _session.get(url, headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # Aquí asumimos que data es una lista o tiene una clave tipo "notifications".
    # Como no conocemos el esquema exacto, lo manejamos flexible:
    if isinstance(data, list):
        notifications = data
    elif isinstance(data, dict):
        # intenta varias claves típicas; ajustaremos cuando veamos la respuesta real
        notifications = (
            data.get("notifications")
            or data.get("items")
            or data.get("data")
            or []
        )
    else:
        notifications = []

    if notifications:
        print("Ejemplo de notificación Wachete (primer elemento):")
        print(notifications[0])  # para que tú veas el JSON real en logs

    return notifications


def get_recent_changes_real(hours_back: int = 24) -> List[Dict]:
    """
    Envuelve get_recent_notifications y devuelve una lista de cambios en el
    formato que espera el ingestor:
        {
            "wachet_id": str,
            "url": str,
            "title": str,
            "content": str,
            "timestamp": str (ISO)
        }
    Como no sabemos aún el esquema exacto, guardamos la notificación completa en content.
    Luego ajustamos este mapeo al ver la estructura real.
    """
    now = dt.datetime.utcnow()
    from_time = now - dt.timedelta(hours=hours_back)
    from_iso = from_time.isoformat()

    notifs = get_recent_notifications(from_iso=from_iso)

    changes: List[Dict] = []
    for n in notifs:
        # Aquí hacemos conjeturas razonables y dejamos TODO el JSON en content:
        wachet_id = str(
            n.get("taskId")
            or n.get("wachetId")
            or n.get("task_id")
            or "desconocido"
        )
        url = (
            n.get("url")
            or n.get("link")
            or n.get("pageUrl")
            or ""
        )
        title = (
            n.get("title")
            or n.get("name")
            or f"Cambio en wachet {wachet_id}"
        )
        # Guardamos el JSON completo como texto para no perder información
        import json

        content = json.dumps(n, ensure_ascii=False)

        timestamp = (
            n.get("date")
            or n.get("createdAt")
            or n.get("time")
            or now.isoformat()
        )

        changes.append(
            {
                "wachet_id": wachet_id,
                "url": url,
                "title": title,
                "content": content,
                "timestamp": timestamp,
            }
        )

    print(f"Total de notificaciones Wachete convertidas a cambios: {len(changes)}")
    return changes
