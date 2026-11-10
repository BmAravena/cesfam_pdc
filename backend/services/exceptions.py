"""Excepciones de negocio.

`main.py` las traduce a respuestas HTTP:
- NotFoundError       -> 404
- ConflictError       -> 400
- BusinessRuleError   -> 400
- PermissionDenied    -> 403
"""


class ServiceError(Exception):
    """Base para errores de lógica de negocio."""


class NotFoundError(ServiceError):
    pass


class ConflictError(ServiceError):
    pass


class BusinessRuleError(ServiceError):
    pass


class PermissionDenied(ServiceError):
    pass
