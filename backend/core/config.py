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

    # security settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",  # Usa el operador / para unir rutas limpiamente
        extra="ignore"
    )

# Setting instance
settings = Settings()