"""Validación del dato de contacto de un requerimiento no anónimo.

El ciudadano puede dejar un correo o un teléfono. Se acepta un correo con
formato razonable o un teléfono con al menos 8 dígitos, para evitar valores
como "Hola" que impiden contactarlo después.
"""

import re

_RE_EMAIL = re.compile(
    r"^[A-Za-z0-9._%+\-]+"
    r"@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?\.)+"
    r"[A-Za-z]{2,}$"
)
_RE_TELEFONO = re.compile(r"^\+?[0-9][0-9\s().\-]{6,19}$")


def es_contacto_valido(valor: str) -> bool:
    """True si `valor` es un correo válido o un teléfono de al menos 8 dígitos."""
    texto = valor.strip()
    if not texto:
        return False

    if "@" in texto:
        return _RE_EMAIL.fullmatch(texto) is not None

    if _RE_TELEFONO.fullmatch(texto) is None:
        return False
    return sum(caracter.isdigit() for caracter in texto) >= 8
