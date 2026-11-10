"""Crea el usuario administrador inicial del sistema OIRS.

El endpoint POST /usuarios exige un administrador ya autenticado, por lo que
el primer usuario debe crearse fuera de la API. Este script usa las mismas
reglas de negocio y el mismo hashing (argon2) que el backend.

Uso (desde la raíz del proyecto, con el venv activo):

    python -m backend.db.scripts.seed_admin \
        --email admin@cesfam.cl \
        --nombre "Administrador OIRS" \
        --rut 11111111-1

La contraseña se solicita de forma interactiva. También se puede pasar con
--password (útil para automatizaciones, aunque queda en el historial).
"""

import argparse
import asyncio
import getpass
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.api.v1.schemas.usuario import UsuarioCreate
from backend.db.models.establecimiento import Establecimiento
from backend.db.models.rol import Rol
from backend.db.session import session_scope
from backend.services.usuario_service import UsuarioService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Crea el usuario administrador inicial del sistema OIRS.",
    )
    parser.add_argument("--email", required=True, help="Correo del administrador")
    parser.add_argument("--password", help="Contraseña (si se omite, se solicita)")
    parser.add_argument(
        "--nombre",
        default="Administrador OIRS",
        help="Nombre completo (default: Administrador OIRS)",
    )
    parser.add_argument(
        "--rut",
        default="11111111-1",
        help="RUT sin puntos, con guion (default: 11111111-1)",
    )
    parser.add_argument(
        "--rol",
        type=int,
        default=1,
        help="id_rol a asignar (default: 1 = Administrador del Sistema)",
    )
    parser.add_argument(
        "--establecimiento",
        type=int,
        default=1,
        help="id_establecimiento a asignar (default: 1)",
    )
    return parser.parse_args()


async def seed_admin(args: argparse.Namespace) -> None:
    password = args.password
    if not password:
        password = getpass.getpass("Contraseña del administrador: ")
        confirmacion = getpass.getpass("Repite la contraseña: ")
        if password != confirmacion:
            raise SystemExit("Las contraseñas no coinciden.")

    data = UsuarioCreate(
        rut=args.rut,
        nombre=args.nombre,
        email=args.email,
        password=password,
        id_rol=args.rol,
        id_establecimiento=args.establecimiento,
    )

    async with session_scope() as db:
        rol = await db.get(Rol, args.rol)
        if rol is None:
            raise SystemExit(
                f"No existe el rol {args.rol}. "
                "Ejecuta `alembic upgrade head` para cargar los datos base."
            )

        establecimiento = await db.get(Establecimiento, args.establecimiento)
        if establecimiento is None:
            raise SystemExit(
                f"No existe el establecimiento {args.establecimiento}. "
                "Ejecuta `alembic upgrade head` para cargar los datos base."
            )

        usuario = await UsuarioService(db).create(data)
        print(
            "Usuario creado correctamente: "
            f"id={usuario.id_usuario}, email={usuario.email}, "
            f"rol={rol.nombre_rol}, establecimiento={establecimiento.nombre_centro}"
        )


if __name__ == "__main__":
    asyncio.run(seed_admin(parse_args()))
