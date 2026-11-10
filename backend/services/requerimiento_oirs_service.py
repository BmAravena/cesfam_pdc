import secrets
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.schemas.requerimiento_oirs import (
    RequerimientoOirsCreate,
    RequerimientoOirsPublicoResponse,
    RequerimientoOirsUpdate,
)
from backend.db.models.auditoria_log import AuditoriaLog
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

    async def estadisticas(self) -> list[dict]:
        """Métricas por establecimiento con tasa de cumplimiento calculada."""
        filas = await self.repo.estadisticas_por_establecimiento()
        for fila in filas:
            total = fila["total"] or 0
            vencidos = fila["vencidos"] or 0
            fila["tasa_cumplimiento"] = (
                round(((total - vencidos) / total) * 100, 2) if total else 0.0
            )
        return filas

    async def create(self, data: RequerimientoOirsCreate) -> RequerimientoOirs:
        codigo = data.codigo_seguimiento or await self._generar_codigo()
        if await self.repo.get_by_codigo(codigo):
            raise ConflictError(f"El código '{codigo}' ya existe")

        fecha_ingreso = data.fecha_ingreso or date.today()
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

    async def delete(self, requerimiento_id: int) -> None:
        requerimiento = await self.get(requerimiento_id)
        await self.repo.delete(requerimiento)

    async def _generar_codigo(self) -> str:
        """Formato OIRS-AAAAMMDD-XXXXXX (20 caracteres, VARCHAR(20))."""
        for _ in range(5):
            codigo = f"OIRS-{date.today():%Y%m%d}-{secrets.token_hex(3).upper()}"
            if await self.repo.get_by_codigo(codigo) is None:
                return codigo
        raise BusinessRuleError("No se pudo generar un código de seguimiento único")
