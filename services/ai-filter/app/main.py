import os
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field
from openai import OpenAI

# ---------- Config ----------

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------- Esquemas ----------

class ChangeInput(BaseModel):
    title: str | None = None
    content: str
    url: str | None = None


class ChangeOutput(BaseModel):
    importance: Literal["IMPORTANT", "NOT_IMPORTANT"]
    score: float = Field(ge=0.0, le=1.0)
    reason: str


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
    content = change.content

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
  "reason": "explicación breve en español"
}}

Reglas:
- Marca "IMPORTANT" si hay probabilidad razonable de que el contenido describa
  un cambio legal/regulatorio, una reforma, un nuevo impuesto, una obligación
  para empresas o un anuncio oficial de gobierno relevante.
- Marca "NOT_IMPORTANT" si el contenido es opinión, noticias generales,
  política sin cambio normativo claro, marketing, o ruido.
- Sé conservador: no marques IMPORTANT si no estás seguro.

Ahora analiza este cambio:

Título: {title}
URL: {url}

Contenido:
\"\"\"{content}\"\"\"
""".strip()


def classify_with_llm(change: ChangeInput) -> ChangeOutput:
    prompt = _build_prompt(change)

    # Usamos Responses API con salida estructurada via JSON (simplificado)
    from pydantic import BaseModel

    class Classification(BaseModel):
        importance: Literal["IMPORTANT", "NOT_IMPORTANT"]
        score: float
        reason: str

    response = client.responses.parse(
        model=OPENAI_MODEL,
        input=[
            {"role": "user", "content": prompt},
        ],
        text_format=Classification,  # el SDK devuelve un objeto de este tipo 
    )

    parsed: Classification = response.output_parsed

    # Normalizar score al rango [0,1] por si acaso
    score = float(parsed.score)
    if score < 0:
        score = 0.0
    if score > 1:
        score = 1.0

    return ChangeOutput(
        importance=parsed.importance,
        score=score,
        reason=parsed.reason,
    )


@app.post("/classify", response_model=ChangeOutput)
def classify_change(change: ChangeInput):
    """
    Endpoint usado por filter-worker.
    """
    return classify_with_llm(change)
