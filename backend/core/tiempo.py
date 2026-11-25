"""Fecha y hora en la zona horaria oficial de Chile.

La base de datos guarda los instantes en UTC (columnas ``timestamptz``), que
es lo correcto para conservar el momento exacto. Estas utilidades sirven para
lo que depende del calendario local (fecha de ingreso, vencimientos, nombres
de archivo y exportaciones), de modo que Chile no quede desfasado por UTC.
"""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

ZONA_HORARIA_CHILE = ZoneInfo("America/Santiago")


def ahora_chile() -> datetime:
    """Instante actual expresado en la zona horaria de Chile."""
    return datetime.now(ZONA_HORARIA_CHILE)


def hoy_chile() -> date:
    """Fecha del día actual en Chile."""
    return ahora_chile().date()


def a_hora_chile(fecha: datetime) -> datetime:
    """Convierte un ``datetime`` (UTC o naive) a la zona horaria de Chile.

    Los valores naive se interpretan como UTC, que es como los entrega la
    base de datos y la API.
    """
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(ZONA_HORARIA_CHILE)
