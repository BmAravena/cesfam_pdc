"""Excepciones de negocio.

`main.py` las traduce a respuestas HTTP:
- NotFoundError       -> 404
- ConflictError       -> 400
- BusinessRuleError   -> 400
- PermissionDenied    -> 403

`campo` permite indicar al frontend bajo qué input mostrar el mensaje
(por ejemplo "email").
"""


class ServiceError(Exception):
    """Base para errores de lógica de negocio."""

    def __init__(self, message: str, *, campo: str | None = None) -> None:
        super().__init__(message)
        self.campo = campo


class NotFoundError(ServiceError):
    pass


class ConflictError(ServiceError):
    pass


class BusinessRuleError(ServiceError):
    pass


class PermissionDenied(ServiceError):
    pass
