"""Validación y normalización de RUT chileno (módulo 11)."""

import re

_RUT_LIMPIO = re.compile(r"^\d{1,8}[0-9K]$")


class RutInvalido(ValueError):
    """El RUT no tiene un formato o dígito verificador válido."""


def limpiar_rut(valor: str) -> str:
    """Quita puntos, guiones y espacios; deja el RUT en mayúsculas.

    No valida el dígito verificador. Se usa para comparar representaciones
    del mismo RUT sin exigir que un registro antiguo cumpla la regla actual.
    """
    return re.sub(r"[.\s-]", "", valor).upper()


def calcular_digito_verificador(cuerpo: str) -> str:
    """Calcula el DV de un cuerpo numérico usando módulo 11."""
    suma = 0
    multiplicador = 2
    for digito in reversed(cuerpo):
        suma += int(digito) * multiplicador
        multiplicador = 2 if multiplicador == 7 else multiplicador + 1

    resultado = 11 - (suma % 11)
    if resultado == 11:
        return "0"
    if resultado == 10:
        return "K"
    return str(resultado)


def validar_rut(valor: str) -> str:
    """Valida el RUT y lo devuelve normalizado como ``12345678-9``.

    Acepta puntos, guiones, espacios y ``k`` minúscula. Lanza ``RutInvalido``
    si el formato o el dígito verificador no son correctos.
    """
    if not valor or not valor.strip():
        raise RutInvalido("El RUT es obligatorio")

    limpio = limpiar_rut(valor)
    if not _RUT_LIMPIO.fullmatch(limpio):
        raise RutInvalido("RUT inválido. Usa un formato como 12345678-9")

    cuerpo = limpio[:-1]
    digito = limpio[-1]

    if int(cuerpo) == 0:
        raise RutInvalido("RUT inválido")

    if calcular_digito_verificador(cuerpo) != digito:
        raise RutInvalido(
            "RUT inválido: el dígito verificador no corresponde"
        )

    return f"{cuerpo}-{digito}"
