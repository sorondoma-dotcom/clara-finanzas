import math
import threading
import time
from datetime import datetime, timedelta

from sqlalchemy import Engine, text

from .errors import ApiError
from .security import hash_token

_CONSUME = text("""
    INSERT INTO rate_limits (key, count, expires_at) VALUES (:key, 1, :expires)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.expires_at <= :now THEN 1 ELSE rate_limits.count + 1 END,
      expires_at = CASE WHEN rate_limits.expires_at <= :now THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END
    RETURNING count, expires_at
""")


def consume(engine: Engine, now: datetime, key: str, limit: int, window: timedelta) -> None:
    """Límite persistente en PostgreSQL, compartido entre procesos e instancias.

    Usa su propia transacción para que el intento cuente aunque la petición falle después.
    """
    with engine.begin() as connection:
        count, expires_at = connection.execute(_CONSUME, {'key': hash_token(key), 'expires': now + window, 'now': now}).one()
    if count > limit:
        retry = max(1, math.ceil((expires_at - now).total_seconds()))
        raise ApiError(429, 'Demasiados intentos. Espera unos minutos antes de volver a probar.', retry_after=retry)


class MemoryLimiter:
    """Límite general por IP en memoria de cada proceso: protege sin tocar la base de datos."""

    def __init__(self, limit: int, window: float = 60.0, max_keys: int = 10_000):
        self.limit, self.window, self.max_keys = limit, window, max_keys
        self._buckets: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str) -> int | None:
        """Devuelve los segundos de espera si se supera el límite, o None."""
        current = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None or bucket[1] <= current:
                if len(self._buckets) >= self.max_keys:
                    self._buckets = {k: v for k, v in self._buckets.items() if v[1] > current}
                    if len(self._buckets) >= self.max_keys:
                        return int(self.window)
                bucket = self._buckets[key] = [0, current + self.window]
            bucket[0] += 1
            return math.ceil(bucket[1] - current) if bucket[0] > self.limit else None
