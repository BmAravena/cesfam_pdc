import csv
import io
import ipaddress
from datetime import date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.auditoria_log import AuditoriaLogCreate
from backend.api.v1.schemas.encuesta_satisfaccion import (
    EncuestaSatisfaccionCreate,
)
from backend.core.encuestas import CLAVES_LEGACY, DIMENSIONES_ENCUESTA, ESCALA_MAX
from backend.db.models.encuesta_satisfaccion import EncuestaSatisfaccion
from backend.db.models.usuario import Usuario
from backend.db.repositories.encuesta_satisfaccion_repo import (
    EncuestaSatisfaccionRepository,
)
from backend.db.repositories.establecimiento_repo import (
    EstablecimientoRepository,
)
from backend.db.session import AsyncSessionLocal
from backend.services.auditoria_log_service import AuditoriaLogService
from backend.services.authz import (
    tiene_alcance_global,
)
from backend.services.exceptions import NotFoundError, PermissionDenied

ETIQUETAS_CSV = {
    "calidad_atencion": "Calidad de la atención",
    "tiempo_espera": "Tiempo de espera",
    "trato_personal": "Trato del personal",
    "presentacion_limpieza": "Presentación y limpieza",
    "claridad_indicaciones": "Claridad de las indicaciones",
}


def _distribucion_vacia() -> dict[str, dict[str, int]]:
    return {
        dimension: {str(valor): 0 for valor in range(1, ESCALA_MAX + 1)}
        for dimension in DIMENSIONES_ENCUESTA
    }


def _valor_dimension(datos: dict[str, Any], dimension: str) -> Any:
    valor = datos.get(dimension)
    if valor is None and dimension in CLAVES_LEGACY:
        valor = datos.get(CLAVES_LEGACY[dimension])
    return valor


def _celda_segura(valor: Any) -> str:
    """Evita que Excel interprete texto público como fórmula."""
    texto = "" if valor is None else str(valor)
    if texto.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + texto
    return texto


class EncuestaSatisfaccionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = EncuestaSatisfaccionRepository(db)
        self.establecimientos = EstablecimientoRepository(db)

    async def get_all(
        self, skip: int = 0, limit: int = 100
    ) -> list[EncuestaSatisfaccion]:
        return list(await self.repo.get_all(skip=skip, limit=limit))

    async def get(self, encuesta_id: int) -> EncuestaSatisfaccion:
        encuesta = await self.repo.get(encuesta_id)
        if encuesta is None:
            raise NotFoundError(f"Encuesta {encuesta_id} no encontrada")
        return encuesta

    async def get_by_establecimiento(
        self, establecimiento_id: int, skip: int = 0, limit: int = 100
    ) -> list[EncuestaSatisfaccion]:
        return await self.repo.get_by_establecimiento(
            establecimiento_id, skip=skip, limit=limit
        )

    async def create(
        self, data: EncuestaSatisfaccionCreate
    ) -> EncuestaSatisfaccion:
        establecimiento = await self.establecimientos.get(
            data.id_establecimiento
        )
        if establecimiento is None:
            raise NotFoundError(
                f"Establecimiento {data.id_establecimiento} no encontrado"
            )

        encuesta = EncuestaSatisfaccion(
            id_establecimiento=data.id_establecimiento,
            datos_documento=data.datos_documento,
        )
        return await self.repo.create(encuesta)

    def establecimiento_efectivo(
        self,
        usuario: Usuario,
        id_establecimiento: int | None,
    ) -> int | None:
        """Aplica el alcance del rol y devuelve el filtro efectivo."""
        nombre_rol = usuario.rol.nombre_rol

        if tiene_alcance_global(nombre_rol):
            return id_establecimiento

        if usuario.id_establecimiento is None:
            raise PermissionDenied(
                "El usuario no tiene un establecimiento asignado"
            )
        if (
            id_establecimiento is not None
            and id_establecimiento != usuario.id_establecimiento
        ):
            raise PermissionDenied(
                "No tiene acceso a encuestas de ese establecimiento"
            )
        return usuario.id_establecimiento

    async def reporte(
        self,
        usuario: Usuario,
        id_establecimiento: int | None = None,
        desde: date | None = None,
        hasta: date | None = None,
    ) -> list[dict[str, Any]]:
        """Resumen completo de satisfacción según el alcance del rol."""
        filtro = self.establecimiento_efectivo(usuario, id_establecimiento)

        resumen = await self.repo.resumen_por_establecimiento(
            filtro, desde=desde, hasta=hasta
        )
        distribucion = await self.repo.distribucion_por_establecimiento(
            filtro, desde=desde, hasta=hasta
        )
        comentarios = await self.repo.comentarios(
            filtro, desde=desde, hasta=hasta
        )

        distribucion_por_centro: dict[int, dict[str, dict[str, int]]] = {}
        for fila in distribucion:
            centro = distribucion_por_centro.setdefault(
                fila["id_establecimiento"], _distribucion_vacia()
            )
            centro[fila["dimension"]][str(fila["valor"])] = fila["cantidad"]

        comentarios_por_centro: dict[int, list[dict[str, Any]]] = {}
        for fila in comentarios:
            comentarios_por_centro.setdefault(
                fila["id_establecimiento"], []
            ).append(
                {
                    "fecha_respuesta": fila["fecha_respuesta"],
                    "comentario": fila["comentario"],
                }
            )

        reporte: list[dict[str, Any]] = []
        for fila in resumen:
            centro_id = fila["id_establecimiento"]
            reporte.append(
                {
                    "id_establecimiento": centro_id,
                    "total_respuestas": fila["total_respuestas"],
                    "promedios": {
                        dimension: fila[f"promedio_{dimension}"]
                        for dimension in DIMENSIONES_ENCUESTA
                    },
                    "distribucion": distribucion_por_centro.get(
                        centro_id, _distribucion_vacia()
                    ),
                    "comentarios": comentarios_por_centro.get(centro_id, []),
                }
            )
        return reporte

    async def exportar_csv(
        self,
        usuario: Usuario,
        id_establecimiento: int | None = None,
        desde: date | None = None,
        hasta: date | None = None,
    ) -> str:
        """CSV detallado y anónimo de las respuestas recibidas."""
        filtro = self.establecimiento_efectivo(usuario, id_establecimiento)
        filas = await self.repo.listar_respuestas(
            filtro, desde=desde, hasta=hasta
        )

        buffer = io.StringIO()
        writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
        writer.writerow(
            ["Establecimiento", "Fecha de respuesta"]
            + [ETIQUETAS_CSV[dimension] for dimension in DIMENSIONES_ENCUESTA]
            + ["Comentario"]
        )

        ids = sorted({fila["id_establecimiento"] for fila in filas})
        centros = await self.establecimientos.get_by_ids(ids)
        nombres = {
            centro.id_establecimiento: centro.nombre_centro
            for centro in centros
        }

        for fila in filas:
            datos = fila["datos_documento"] or {}
            fecha = fila["fecha_respuesta"]
            centro_id = fila["id_establecimiento"]
            writer.writerow(
                [
                    nombres.get(centro_id, f"Sede #{centro_id}"),
                    fecha.isoformat(sep=" ") if fecha else "",
                ]
                + [
                    _valor_dimension(datos, dimension)
                    for dimension in DIMENSIONES_ENCUESTA
                ]
                + [_celda_segura(datos.get("comentario"))]
            )

        return "\ufeff" + buffer.getvalue()

    async def registrar_auditoria(
        self,
        usuario: Usuario,
        accion: str,
        id_establecimiento: int | None,
        ip_origen: str | None = None,
    ) -> None:
        ip_valida: str | None = None
        if ip_origen:
            try:
                ip_valida = str(ipaddress.ip_address(ip_origen))
            except ValueError:
                ip_valida = None

        # Los reportes se consultan con la sesión de solo lectura (AUTOCOMMIT);
        # la auditoría se confirma en una sesión de escritura dedicada.
        async with AsyncSessionLocal() as session:
            try:
                await AuditoriaLogService(session).registrar(
                    AuditoriaLogCreate(
                        id_usuario=usuario.id_usuario,
                        id_establecimiento=id_establecimiento,
                        accion=accion,
                        ip_origen=ip_valida,
                    )
                )
                await session.commit()
            except Exception:
                await session.rollback()
                raise