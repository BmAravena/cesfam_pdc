"""Verificación de que el dominio de un correo puede recibir mensajes.

No comprueba que el buzón exista (eso requeriría SMTP y no es fiable); solo
resuelve registros MX y, si no hay, A/AAAA como permite el RFC 5321. Se usa
para las cuentas internas: un dominio inexistente o sin registros de correo
se rechaza.

La resolución es asíncrona para no bloquear el event loop de FastAPI y los
resultados definitivos se cachean por dominio durante un TTL configurable.
"""

import time

import dns.asyncresolver
import dns.exception
import dns.resolver

from backend.core.config import settings


class DominioSinRegistrosError(Exception):
    """El dominio no existe o no tiene MX/A: es un error definitivo."""


class DominioNoVerificableError(Exception):
    """No se pudo consultar DNS (timeout, SERVFAIL, red): es transitorio."""


# dominio -> (instante de expiración en time.monotonic(), ¿es válido?)
_cache: dict[str, tuple[float, bool]] = {}


def _resolver() -> dns.asyncresolver.Resolver:
    resolver = dns.asyncresolver.Resolver()
    resolver.lifetime = settings.EMAIL_DNS_TIMEOUT
    return resolver


async def _tiene_registros(dominio: str) -> bool:
    """True si el dominio tiene MX o, en su defecto, A/AAAA."""
    resolver = _resolver()

    mx = await resolver.resolve(
        dominio,
        "MX",
        lifetime=settings.EMAIL_DNS_TIMEOUT,
        raise_on_no_answer=False,
    )
    if mx.rrset is not None:
        # Un MX con exchange "." (RFC 7505) declara que el dominio NO recibe
        # correo, aunque técnicamente exista el registro MX.
        exchanges = [str(registro.exchange).rstrip(".") for registro in mx]
        return any(exchange for exchange in exchanges)

    # RFC 5321: sin MX explícito se puede entregar al registro A/AAAA.
    for tipo in ("A", "AAAA"):
        respuesta = await resolver.resolve(
            dominio,
            tipo,
            lifetime=settings.EMAIL_DNS_TIMEOUT,
            raise_on_no_answer=False,
        )
        if respuesta.rrset is not None:
            return True

    return False


async def verificar_dominio_correo(email: str) -> None:
    """Valida que el dominio del correo tenga MX/A.

    Lanza `DominioSinRegistrosError` si el dominio no existe o no puede
    recibir correo, y `DominioNoVerificableError` ante un fallo transitorio
    de DNS (salvo que `EMAIL_VERIFICACION_FAIL_OPEN` esté activo).
    """
    dominio = email.rsplit("@", 1)[-1].strip().lower().rstrip(".")
    if not dominio:
        raise DominioSinRegistrosError(dominio)

    ahora = time.monotonic()
    cacheado = _cache.get(dominio)
    if cacheado is not None and cacheado[0] > ahora:
        if cacheado[1]:
            return
        raise DominioSinRegistrosError(dominio)

    try:
        valido = await _tiene_registros(dominio)
    except dns.resolver.NXDOMAIN:
        valido = False
    except (dns.exception.Timeout, dns.resolver.NoNameservers) as exc:
        if settings.EMAIL_VERIFICACION_FAIL_OPEN:
            return
        raise DominioNoVerificableError(dominio) from exc
    except dns.exception.DNSException as exc:
        if settings.EMAIL_VERIFICACION_FAIL_OPEN:
            return
        raise DominioNoVerificableError(dominio) from exc

    _cache[dominio] = (ahora + settings.EMAIL_DNS_CACHE_TTL, valido)
    if not valido:
        raise DominioSinRegistrosError(dominio)
