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
        headline: str
        source_name: str
        source_country: str

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
        headline=parsed.headline,
        source_name=parsed.source_name,
        source_country=parsed.source_country,
    )


@app.post("/classify", response_model=ChangeOutput)
def classify_change(change: ChangeInput):
    """
    Endpoint usado por filter-worker.
    """
    return classify_with_llm(change)
