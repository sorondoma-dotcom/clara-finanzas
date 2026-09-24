import hashlib
import hmac
import secrets
import threading
from contextlib import contextmanager

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from .errors import ApiError

# Argon2id con los parámetros por defecto de argon2-cffi (RFC 9106, perfil de baja memoria):
# 64 MiB, 3 iteraciones, 4 hilos. Supera el mínimo recomendado por OWASP.
_hasher = PasswordHasher()
# Hash de relleno: se verifica contra él cuando el correo no existe para igualar tiempos.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(32))


def new_token() -> str:
    """Token aleatorio de 256 bits, 43 caracteres base64url."""
    return secrets.token_urlsafe(32)


def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def csrf_for(token: str, secret: str) -> str:
    return hmac.new(secret.encode(), f'clara-csrf:{token}'.encode(), hashlib.sha256).hexdigest()


def safe_equal(a: object, b: object) -> bool:
    return isinstance(a, str) and isinstance(b, str) and hmac.compare_digest(a.encode(), b.encode())


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(encoded: str | None, password: str) -> bool:
    try:
        return _hasher.verify(encoded or _DUMMY_HASH, password) and encoded is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(encoded: str) -> bool:
    return _hasher.check_needs_rehash(encoded)


class PasswordWorker:
    """Limita las operaciones de contraseña simultáneas para acotar memoria y CPU."""

    def __init__(self, max_active: int = 2):
        self._slots = threading.BoundedSemaphore(max_active)

    @contextmanager
    def slot(self):
        if not self._slots.acquire(blocking=True, timeout=5):
            raise ApiError(503, 'Servidor ocupado. Inténtalo de nuevo en unos segundos.')
        try:
            yield
        finally:
            self._slots.release()
