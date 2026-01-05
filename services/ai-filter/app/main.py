import json
import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI

# ---------- Config ----------

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY no está definida en el entorno")

client = OpenAI(api_key=OPENAI_API_KEY)

# ---------- Esquemas ----------

class ChangeInput(BaseModel):
    title: str | None = None
    diff_text: str
    current_snippet: str | None = None
    previous_text: str | None = None
    current_text: str | None = None
    url: str | None = None
    task_name: str | None = None
    timestamp: str | None = None


class ChangeOutput(BaseModel):
    importance: Literal["IMPORTANT", "NOT_IMPORTANT"]
    score: float = Field(ge=0.0, le=1.0)
    reason: str
    headline: str = Field(description="Idea principal en máximo 10 palabras")
    source_name: str = Field(description="Nombre de la institución o fuente que emite el comunicado")
    source_country: str = Field(description="País de la fuente (El Salvador, Guatemala, Honduras, Colombia, Perú, México, etc.)")


app = FastAPI(title="AI Filter Service")


@app.get("/health")
def health():
    return {"status": "ok", "model": OPENAI_MODEL}


def _build_prompt(change: ChangeInput) -> str:
    """
    Prompt en texto que controla la lógica de negocio.
    Lo puedes editar cuando cambien los criterios de Asertiva.
    """
    title = change.title or "(sin título)"
    url = change.url or "(sin URL)"
    task_name = change.task_name or "(sin tarea)"
    timestamp = change.timestamp or "(sin timestamp)"
    diff_text = change.diff_text or ""
    current_snippet = change.current_snippet or ""
    # Pequeño contexto opcional si el diff viene vacío
    snippet_fallback = current_snippet
    if not snippet_fallback and change.current_text:
        snippet_fallback = (change.current_text or "")[:800]

    return f"""
Eres un analista legal y regulatorio que trabaja para ASERTIVA.

Tu tarea es CLASIFICAR si un cambio detectado en una página de noticias o boletín
es relevante para temas de:
- leyes
- reglamentos
- decretos
- resoluciones
- reformas tributarias
- normativa que pueda afectar a empresas y negocios.

DEBES responder SOLO en JSON con esta estructura:

{{
  "importance": "IMPORTANT" o "NOT_IMPORTANT",
  "score": número entre 0 y 1 (confianza de tu clasificación),
  "reason": "explicación breve en español de por qué es relevante o no",
  "headline": "LA IDEA PRINCIPAL del cambio en máximo 10 palabras (ej: 'Nueva reforma tributaria para comercio exterior')",
  "source_name": "Nombre de la institución o fuente que emite el contenido (ej: 'Ministerio de Hacienda', 'Corte Suprema de Justicia', 'Diario Oficial')",
  "source_country": "País de la fuente (ej: 'El Salvador', 'Guatemala', 'Honduras', 'Colombia', 'Perú', 'México')"
}}

Reglas:
- Marca "IMPORTANT" si hay probabilidad razonable de que el contenido describa
  un cambio legal/regulatorio, una reforma, un nuevo impuesto, una obligación
  para empresas o un anuncio oficial de gobierno relevante.
- Marca "NOT_IMPORTANT" si el contenido es opinión, noticias generales,
  política sin cambio normativo claro, marketing, o ruido.
- Sé conservador: no marques IMPORTANT si no estás seguro.
- Para "headline": resume la idea principal en máximo 10 palabras, como un titular de periódico.
- Para "source_name": identifica la institución gubernamental, entidad, diario oficial, o fuente que emite la información.
- Para "source_country": identifica el país basándote en la URL, el contenido, o menciones geográficas.

Ahora analiza este cambio:

Título: {title}
URL: {url}
Tarea: {task_name}
Fecha/hora: {timestamp}

Cambios detectados (diff):
\"\"\"{diff_text}\"\"\"

Contexto adicional (snippet de la versión nueva):
\"\"\"{snippet_fallback}\"\"\"
""".strip()


def classify_with_llm(change: ChangeInput) -> ChangeOutput:
    """
    Calls OpenAI chat completions API with JSON mode to get structured classification.
    """
    prompt = _build_prompt(change)

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente que responde SOLO en JSON válido, sin markdown ni explicaciones adicionales."
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=500,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling OpenAI: {e}")

    # Parse the JSON response
    content = response.choices[0].message.content
    if not content:
        raise HTTPException(status_code=500, detail="OpenAI returned empty response")

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI returned invalid JSON: {e}. Content: {content[:200]}"
        )

    # Extract and validate fields with defaults
    importance = parsed.get("importance", "NOT_IMPORTANT")
    if importance not in ("IMPORTANT", "NOT_IMPORTANT"):
        importance = "NOT_IMPORTANT"

    score = parsed.get("score", 0.5)
    try:
        score = float(score)
        score = max(0.0, min(1.0, score))  # Clamp to [0, 1]
    except (TypeError, ValueError):
        score = 0.5

    return ChangeOutput(
        importance=importance,
        score=score,
        reason=parsed.get("reason", "Sin análisis disponible"),
        headline=parsed.get("headline", "Actualización regulatoria"),
        source_name=parsed.get("source_name", "Fuente no identificada"),
        source_country=parsed.get("source_country", "País no identificado"),
    )


@app.post("/classify", response_model=ChangeOutput)
def classify_change(change: ChangeInput):
    """
    Endpoint usado por filter-worker.
    """
    return classify_with_llm(change)
