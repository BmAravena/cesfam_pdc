import secrets
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.requerimiento_oirs import (
    RequerimientoOirsCreate,
    RequerimientoOirsPublicoResponse,
    RequerimientoOirsUpdate,
)
from backend.db.models.auditoria_log import AuditoriaLog
from backend.core.tiempo import hoy_chile
from backend.db.models.requerimiento_oirs import (
    ESTADOS_REQUERIMIENTO,
    RequerimientoOirs,
)
from backend.db.models.usuario import Usuario
from backend.db.repositories.requerimiento_oirs_repo import (
    RequerimientoOirsRepository,
)
from backend.services.authz import (
    puede_acceder_establecimiento,
    tiene_alcance_global,
)
from backend.services.exceptions import (
    BusinessRuleError,
    ConflictError,
    NotFoundError,
    PermissionDenied,
)

DIAS_HABILES_PLAZO = 15  # Ley N° 20.584


def sumar_dias_habiles(inicio: date, dias: int) -> date:
    """Suma días hábiles (lunes a viernes), sin considerar feriados."""
    actual = inicio
    restantes = dias
    while restantes > 0:
        actual += timedelta(days=1)
        if actual.weekday() < 5:
            restantes -= 1
    return actual


class RequerimientoOirsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = RequerimientoOirsRepository(db)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[RequerimientoOirs]:
        return list(await self.repo.get_all(skip=skip, limit=limit))

    async def get(self, requerimiento_id: int) -> RequerimientoOirs:
        requerimiento = await self.repo.get(requerimiento_id)
        if requerimiento is None:
            raise NotFoundError(f"Requerimiento {requerimiento_id} no encontrado")
        return requerimiento

    async def get_by_codigo(self, codigo: str) -> RequerimientoOirs | None:
        return await self.repo.get_by_codigo(codigo)

    async def get_by_establecimiento(
        self, establecimiento_id: int, skip: int = 0, limit: int = 100
    ) -> list[RequerimientoOirs]:
        return await self.repo.get_by_establecimiento(
            establecimiento_id, skip=skip, limit=limit
        )

    async def get_by_estado(
        self, estado: str, skip: int = 0, limit: int = 100
    ) -> list[RequerimientoOirs]:
        return await self.repo.get_by_estado(estado, skip=skip, limit=limit)

    async def get_publico(self, codigo: str) -> RequerimientoOirsPublicoResponse:
        """Consulta pública por código. No expone detalle_solicitud (PII)."""
        requerimiento = await self.repo.get_by_codigo(codigo)
        if requerimiento is None:
            raise NotFoundError("Código de seguimiento no encontrado")
        return RequerimientoOirsPublicoResponse.model_validate(requerimiento)

    async def listar_autorizado(
        self,
        usuario: Usuario,
        establecimiento_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[RequerimientoOirs]:
        """Lista requerimientos según el alcance del rol del usuario."""
        nombre_rol = usuario.rol.nombre_rol

        if establecimiento_id is not None:
            if not puede_acceder_establecimiento(
                nombre_rol,
                usuario.id_establecimiento,
                establecimiento_id,
            ):
                raise PermissionDenied(
                    "No tiene acceso a requerimientos de ese establecimiento"
                )
            return await self.repo.get_by_establecimiento(
                establecimiento_id, skip=skip, limit=limit
            )

        if tiene_alcance_global(nombre_rol):
            return list(await self.repo.get_all(skip=skip, limit=limit))

        return await self.repo.get_by_establecimiento(
            usuario.id_establecimiento, skip=skip, limit=limit
        )

    async def listar_autorizado_ligero(
        self,
        usuario: Usuario,
        establecimiento_id: int | None = None,
        estado: str | None = None,
        anio: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict]:
        """Igual que `listar_autorizado`, pero sin texto libre de cada fila."""
        nombre_rol = usuario.rol.nombre_rol

        if establecimiento_id is not None:
            if not puede_acceder_establecimiento(
                nombre_rol,
                usuario.id_establecimiento,
                establecimiento_id,
            ):
                raise PermissionDenied(
                    "No tiene acceso a requerimientos de ese establecimiento"
                )
            return await self.repo.listar_ligero(
                establecimiento_id,
                estado=estado,
                anio=anio,
                skip=skip,
                limit=limit,
            )

        if tiene_alcance_global(nombre_rol):
            return await self.repo.listar_ligero(
                None,
                estado=estado,
                anio=anio,
                skip=skip,
                limit=limit,
            )

        return await self.repo.listar_ligero(
            usuario.id_establecimiento,
            estado=estado,
            anio=anio,
            skip=skip,
            limit=limit,
        )

    async def get_autorizado(
        self,
        usuario: Usuario,
        requerimiento_id: int,
    ) -> RequerimientoOirs:
        """Detalle validando que el usuario pueda ver esa sede."""
        requerimiento = await self.get(requerimiento_id)
        if not puede_acceder_establecimiento(
            usuario.rol.nombre_rol,
            usuario.id_establecimiento,
            requerimiento.id_establecimiento,
        ):
            raise PermissionDenied(
                "No tiene acceso a requerimientos de ese establecimiento"
            )
        return requerimiento

    async def resumen(
        self,
        usuario: Usuario,
        establecimiento_id: int | None = None,
        anio: int | None = None,
    ) -> dict:
        """Totales para el panel, respetando el alcance del rol."""
        nombre_rol = usuario.rol.nombre_rol

        if establecimiento_id is not None:
            if not puede_acceder_establecimiento(
                nombre_rol,
                usuario.id_establecimiento,
                establecimiento_id,
            ):
                raise PermissionDenied(
                    "No tiene acceso a requerimientos de ese establecimiento"
                )
            fila = await self.repo.resumen(establecimiento_id, anio=anio)
        elif tiene_alcance_global(nombre_rol):
            fila = await self.repo.resumen(None, anio=anio)
        else:
            fila = await self.repo.resumen(
                usuario.id_establecimiento, anio=anio
            )

        total = fila["total"] or 0
        vencidos = fila["vencidos"] or 0
        fila["total"] = total
        fila["abiertos"] = fila["abiertos"] or 0
        fila["respondidos"] = fila["respondidos"] or 0
        fila["vencidos"] = vencidos
        fila["tasa_cumplimiento"] = (
            round(((total - vencidos) / total) * 100, 2) if total else 100.0
        )
        return fila

    async def anios_disponibles(self, usuario: Usuario) -> list[int]:
        """Años con requerimientos registrados según el alcance del rol."""
        nombre_rol = usuario.rol.nombre_rol

        if tiene_alcance_global(nombre_rol):
            return await self.repo.anios_disponibles(None)
        if usuario.id_establecimiento is None:
            return []
        return await self.repo.anios_disponibles(usuario.id_establecimiento)

    async def resumen_reclamos(
        self, usuario: Usuario, anio: int | None = None
    ) -> dict:
        """Reclamos por establecimiento respetando el alcance del rol.

        Los roles globales ven el total comunal y el desglose completo; el
        Funcionario Local queda acotado a su sede. `anio` filtra por la
        fecha de ingreso (None = todos los años).
        """
        nombre_rol = usuario.rol.nombre_rol

        if tiene_alcance_global(nombre_rol):
            filas = await self.repo.reclamos_por_establecimiento(None, anio=anio)
        else:
            if usuario.id_establecimiento is None:
                return {"total_reclamos": 0, "por_establecimiento": []}
            filas = await self.repo.reclamos_por_establecimiento(
                usuario.id_establecimiento, anio=anio
            )

        total = sum(fila["total_reclamos"] or 0 for fila in filas)
        return {"total_reclamos": total, "por_establecimiento": filas}

    async def estadisticas(
        self,
        usuario: Usuario,
        establecimiento_id: int | None = None,
        anio: int | None = None,
    ) -> list[dict]:
        """Métricas por establecimiento según el alcance del rol.

        - Funcionario Local: solo su establecimiento.
        - Encargado Comunal y Administrador: todos (comparativo).
        """
        nombre_rol = usuario.rol.nombre_rol

        if establecimiento_id is not None and not puede_acceder_establecimiento(
            nombre_rol,
            usuario.id_establecimiento,
            establecimiento_id,
        ):
            raise PermissionDenied(
                "No tiene acceso a métricas de ese establecimiento"
            )

        if not tiene_alcance_global(nombre_rol):
            if usuario.id_establecimiento is None:
                return []
            establecimiento_id = usuario.id_establecimiento

        filas = await self.repo.estadisticas_por_establecimiento(
            establecimiento_id, anio=anio
        )
        for fila in filas:
            total = fila["total"] or 0
            vencidos = fila["vencidos"] or 0
            fila["tasa_cumplimiento"] = (
                round(((total - vencidos) / total) * 100, 2) if total else 0.0
            )
        return filas


    async def create(
        self,
        data: RequerimientoOirsCreate,
        ip_origen: str = "127.0.0.1",
        id_usuario: int | None = None,
    ) -> RequerimientoOirs:
        codigo = data.codigo_seguimiento or await self._generar_codigo()
        if await self.repo.get_by_codigo(codigo):
            raise ConflictError(f"El código '{codigo}' ya existe")

        fecha_ingreso = data.fecha_ingreso or hoy_chile()
        fecha_limite = data.fecha_limite or sumar_dias_habiles(
            fecha_ingreso, DIAS_HABILES_PLAZO
        )

        requerimiento = RequerimientoOirs(
            codigo_seguimiento=codigo,
            tipo_solicitud=data.tipo_solicitud,
            detalle_solicitud=data.detalle_solicitud,
            estado=data.estado,
            fecha_ingreso=fecha_ingreso,
            fecha_limite=fecha_limite,
            es_anonimo=data.es_anonimo,
            id_establecimiento=data.id_establecimiento,
        )
        nuevo_req = await self.repo.create(requerimiento)

        # Registrar evento en auditoria_log
        log = AuditoriaLog(
            id_usuario=id_usuario,
            id_establecimiento=nuevo_req.id_establecimiento,
            accion=f"CREACION_REQUERIMIENTO: {nuevo_req.codigo_seguimiento} (ID #{nuevo_req.id_requerimiento})"[:150],
            ip_origen=ip_origen,
        )
        self.db.add(log)
        await self.db.commit()

        return nuevo_req

    """
    async def create(self, data: RequerimientoOirsCreate) -> RequerimientoOirs:
        codigo = data.codigo_seguimiento or await self._generar_codigo()
        if await self.repo.get_by_codigo(codigo):
            raise ConflictError(f"El código '{codigo}' ya existe")

        fecha_ingreso = data.fecha_ingreso or hoy_chile()
        fecha_limite = data.fecha_limite or sumar_dias_habiles(
            fecha_ingreso, DIAS_HABILES_PLAZO
        )

        requerimiento = RequerimientoOirs(
            codigo_seguimiento=codigo,
            tipo_solicitud=data.tipo_solicitud,
            detalle_solicitud=data.detalle_solicitud,
            estado=data.estado,
            fecha_ingreso=fecha_ingreso,
            fecha_limite=fecha_limite,
            es_anonimo=data.es_anonimo,
            id_establecimiento=data.id_establecimiento,
        )
        return await self.repo.create(requerimiento)
    """
    async def update(
        self, requerimiento_id: int, data: RequerimientoOirsUpdate
    ) -> RequerimientoOirs:
        requerimiento = await self.get(requerimiento_id)
        cambios = data.model_dump(exclude_unset=True)

        if "estado" in cambios:
            raise BusinessRuleError(
                "El estado debe cambiarse con cambiar_estado() para registrar auditoría"
            )

        for campo, valor in cambios.items():
            setattr(requerimiento, campo, valor)

        return await self.repo.update(requerimiento)

    async def cambiar_estado(
        self,
        requerimiento_id: int,
        nuevo_estado: str,
        *,
        id_usuario: int | None = None,
        id_establecimiento: int | None = None,
        ip_origen: str | None = None,
    ) -> RequerimientoOirs:
        """Cambia el estado y registra el log en la misma transacción."""
        if nuevo_estado not in ESTADOS_REQUERIMIENTO:
            raise BusinessRuleError(f"Estado inválido: {nuevo_estado}")

        requerimiento = await self.get(requerimiento_id)
        estado_anterior = requerimiento.estado
        if estado_anterior == nuevo_estado:
            raise BusinessRuleError(f"El requerimiento ya está en estado '{nuevo_estado}'")

        requerimiento.estado = nuevo_estado

        # Convención de accion: "<ACCION> req=<id> <anterior>-><nuevo>"
        log = AuditoriaLog(
            id_usuario=id_usuario,
            id_establecimiento=(
                id_establecimiento
                if id_establecimiento is not None
                else requerimiento.id_establecimiento
            ),
            accion=(
                f"CAMBIO_ESTADO req={requerimiento.id_requerimiento} "
                f"{estado_anterior}->{nuevo_estado}"
            ),
            ip_origen=ip_origen,
        )
        self.db.add(log)

        # flush() sube ambos cambios en la misma transacción (commit lo hace get_db)
        return await self.repo.update(requerimiento)

    async def responder(
        self,
        requerimiento_id: int,
        respuesta: str,
        *,
        id_usuario: int | None = None,
        id_establecimiento: int | None = None,
        ip_origen: str | None = None,
    ) -> RequerimientoOirs:
        """Registra la respuesta, marca el caso como Respondido y audita."""
        requerimiento = await self.get(requerimiento_id)
        if requerimiento.estado in ("Cerrado", "Rechazado"):
            raise BusinessRuleError(
                "No se puede responder un requerimiento "
                f"en estado '{requerimiento.estado}'"
            )

        estado_anterior = requerimiento.estado
        requerimiento.respuesta = respuesta
        requerimiento.fecha_respuesta = datetime.now(timezone.utc)
        requerimiento.estado = "Respondido"

        accion = (
            f"ACTUALIZACION_RESPUESTA req={requerimiento.id_requerimiento}"
            if estado_anterior == "Respondido"
            else (
                f"RESPUESTA req={requerimiento.id_requerimiento} "
                f"{estado_anterior}->Respondido"
            )
        )

        log = AuditoriaLog(
            id_usuario=id_usuario,
            id_establecimiento=(
                id_establecimiento
                if id_establecimiento is not None
                else requerimiento.id_establecimiento
            ),
            accion=accion,
            ip_origen=ip_origen,
        )
        self.db.add(log)

        return await self.repo.update(requerimiento)

    async def delete(self, requerimiento_id: int) -> None:
        requerimiento = await self.get(requerimiento_id)
        await self.repo.delete(requerimiento)

    async def _generar_codigo(self) -> str:
        """Formato OIRS-AAAAMMDD-XXXXXX (20 caracteres, VARCHAR(20))."""
        for _ in range(5):
            codigo = f"OIRS-{hoy_chile():%Y%m%d}-{secrets.token_hex(3).upper()}"
            if await self.repo.get_by_codigo(codigo) is None:
                return codigo
        raise BusinessRuleError("No se pudo generar un código de seguimiento único")
