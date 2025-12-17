import difflib
import re


def build_diff(previous_text: str, current_text: str) -> str:
    prev_lines = (previous_text or "").splitlines()
    curr_lines = (current_text or "").splitlines()
    diff = difflib.unified_diff(
        prev_lines,
        curr_lines,
        fromfile="previous",
        tofile="current",
        lineterm="",
    )
    diff_str = "\n".join(diff)
    return diff_str if diff_str.strip() else ""


def is_trivial_diff(diff_text: str) -> bool:
    """
    Heurística básica: si el diff es muy corto y solo cambia números/fechas, se descarta.
    """
    if not diff_text:
        return True

    change_lines = [
        line[1:].strip()
        for line in diff_text.splitlines()
        if line.startswith(("+", "-")) and not line.startswith(("+++", "---"))
    ]

    if not change_lines:
        return True

    joined = " ".join(change_lines)
    normalized = joined.strip()
    if not normalized:
        return True

    # Ratio numérico alto y longitud corta => probablemente contador/fecha
    digits = re.sub(r"[^0-9]", "", normalized)
    if len(normalized) < 60 and len(digits) >= len(normalized) * 0.6:
        return True

    # Pocas palabras repetidas y texto corto => probablemente mensaje de contador
    words = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúñ]+", normalized.lower())
    if len(normalized) < 80 and len(set(words)) <= 4:
        return True

    # Muy poco texto alfabético => probablemente ruido
    letters = re.sub(r"[^A-Za-zÁÉÍÓÚÜÑáéíóúñ]", "", normalized)
    if len(letters) <= 3 and len(normalized) < 80:
        return True

    return False
