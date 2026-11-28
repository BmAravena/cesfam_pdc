from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    # general information
    PROJECT_NAME: str = "Cesfam PDC API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # database settings
    DATABASE_URL_POSTGRES: str
    DATABASE_ECHO: bool = False  # True para ver el SQL generado en consola

    # security settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # email domain verification (MX/A) for internal accounts
    EMAIL_DNS_TIMEOUT: float = 3.0
    EMAIL_DNS_CACHE_TTL: int = 3600
    # Si es True, un fallo transitorio de DNS permite crear/editar el usuario.
    # Por defecto es False (fail-closed): no se aceptan dominios dudosos.
    EMAIL_VERIFICACION_FAIL_OPEN: bool = False
    
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",  # Usa el operador / para unir rutas limpiamente
        extra="ignore"
    )

# Setting instance
settings = Settings()