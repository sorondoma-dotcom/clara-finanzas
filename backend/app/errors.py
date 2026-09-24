import json
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from starlette.exceptions import HTTPException

log = logging.getLogger('clara')

VALIDATION_MESSAGE = 'Revisa los datos. La contraseña debe tener entre 15 y 128 caracteres y los importes, como máximo, dos decimales.'
UNAVAILABLE_MESSAGE = 'El servicio no está disponible temporalmente. Tus datos guardados se conservan.'
HTTP_MESSAGES = {
    404: 'Recurso no encontrado.',
    405: 'Método no permitido.',
    413: 'El archivo supera el tamaño permitido.',
}


class ApiError(Exception):
    def __init__(self, status: int, message: str, *, retry_after: int | None = None, clear_cookie: bool = False):
        super().__init__(message)
        self.status = status
        self.message = message
        self.retry_after = retry_after
        self.clear_cookie = clear_cookie


def error_response(request: Request, status: int, message: str, *, retry_after: int | None = None, clear_cookie: bool = False) -> JSONResponse:
    response = JSONResponse({'error': message}, status_code=status)
    if retry_after:
        response.headers['Retry-After'] = str(retry_after)
    if clear_cookie:
        settings = request.app.state.settings
        response.delete_cookie(settings.cookie_name, path='/', secure=settings.production, httponly=True, samesite='strict')
    return response


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(request: Request, exc: ApiError):
        return error_response(request, exc.status, exc.message, retry_after=exc.retry_after, clear_cookie=exc.clear_cookie)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # No se devuelven detalles del esquema: el cliente ya valida sus formularios.
        is_json_error = any(error.get('type') == 'json_invalid' for error in exc.errors())
        return error_response(request, 400, 'JSON no válido.' if is_json_error else VALIDATION_MESSAGE)

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return error_response(request, exc.status_code, HTTP_MESSAGES.get(exc.status_code, 'No se pudo completar la petición.'))

    @app.exception_handler(OperationalError)
    async def database_unavailable(request: Request, exc: OperationalError):
        log.error(json.dumps({'event': 'database_unavailable', 'path': request.url.path}))
        return error_response(request, 503, UNAVAILABLE_MESSAGE)

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception):
        # Nunca se registran cuerpos, contraseñas ni datos financieros.
        log.error(json.dumps({'event': 'request_error', 'type': type(exc).__name__, 'path': request.url.path}))
        return error_response(request, 500, UNAVAILABLE_MESSAGE)
