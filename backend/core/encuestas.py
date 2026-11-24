"""Contrato de datos de la encuesta de satisfacción.

Las dimensiones y la escala viven aquí para que modelos, schemas,
repositorios y servicios compartan exactamente las mismas claves.
"""

DIMENSIONES_ENCUESTA: tuple[str, ...] = (
    "calidad_atencion",
    "tiempo_espera",
    "trato_personal",
    "presentacion_limpieza",
    "claridad_indicaciones",
)

# Claves usadas por versiones anteriores del formulario. Se mantienen como
# respaldo para no perder respuestas históricas al calcular promedios.
CLAVES_LEGACY: dict[str, str] = {
    "calidad_atencion": "calidad",
    "trato_personal": "trato",
}

ESCALA_MIN = 1
ESCALA_MAX = 5
MAX_COMENTARIO = 1000
