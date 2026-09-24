from functools import cached_property
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída de variables de entorno (o de `.env` en desarrollo)."""

    model_config = SettingsConfigDict(env_file=('../.env', '.env'), env_file_encoding='utf-8', extra='ignore')

    environment: Literal['development', 'test', 'production'] = 'development'
    database_url: str
    secret_key: str = Field(min_length=32)
    # Orígenes permitidos para peticiones de escritura, separados por comas.
    app_origin: str = 'http://127.0.0.1:5173'
    static_dir: str | None = None
    db_pool_size: int = Field(default=5, ge=1, le=50)
    db_max_overflow: int = Field(default=5, ge=0, le=50)
    auth_rate_limit: int = Field(default=20, ge=1)
    api_rate_limit: int = Field(default=180, ge=1)

    @field_validator('database_url')
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        # Render y otros proveedores entregan `postgres://` o `postgresql://`.
        for prefix in ('postgres://', 'postgresql://'):
            if value.startswith(prefix):
                return 'postgresql+psycopg://' + value[len(prefix):]
        return value

    @model_validator(mode='after')
    def check_production(self) -> 'Settings':
        if self.production:
            if any(not origin.startswith('https://') for origin in self.allowed_origins):
                raise ValueError('APP_ORIGIN debe usar HTTPS en producción')
            if self.secret_key.startswith('change-me'):
                raise ValueError('Define un SECRET_KEY propio en producción')
        return self

    @property
    def production(self) -> bool:
        return self.environment == 'production'

    @cached_property
    def allowed_origins(self) -> frozenset[str]:
        origins = set()
        for raw in self.app_origin.split(','):
            parts = urlsplit(raw.strip())
            if parts.scheme not in ('http', 'https') or not parts.netloc:
                raise ValueError(f'Origen no válido en APP_ORIGIN: {raw!r}')
            origins.add(f'{parts.scheme}://{parts.netloc}')
        return frozenset(origins)

    @property
    def cookie_name(self) -> str:
        # El prefijo __Host- obliga a Secure, Path=/ y sin Domain.
        return '__Host-clara_session' if self.production else 'clara_session'
