from starlette.datastructures import Headers
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .config import Settings
from .rate_limit import MemoryLimiter

MAX_BODY = 1024 * 1024
SAFE_METHODS = {'GET', 'HEAD', 'OPTIONS'}
API_CACHE_HEADERS = [(b'cache-control', b'no-store'), (b'pragma', b'no-cache')]
API_CACHE_NAMES = {name for name, _ in API_CACHE_HEADERS}


def _csp(production: bool) -> str:
    directives = [
        "default-src 'self'", "script-src 'self'", "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data:",
        "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'",
        "base-uri 'none'", "form-action 'self'",
    ]
    if production:
        directives.append('upgrade-insecure-requests')
    return '; '.join(directives)


class SecurityMiddleware:
    """Cabeceras de seguridad, límite de cuerpo y protecciones de la API.

    Middleware ASGI puro: rechaza peticiones antes de leer el cuerpo o tocar la base de datos.
    """

    def __init__(self, app: ASGIApp, settings: Settings):
        self.app = app
        self.settings = settings
        self.limiter = MemoryLimiter(settings.api_rate_limit)
        headers = {
            'content-security-policy': _csp(settings.production),
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY',
            'referrer-policy': 'no-referrer',
            'cross-origin-opener-policy': 'same-origin',
            'cross-origin-resource-policy': 'same-origin',
            'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        }
        if settings.production:
            headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains'
        self.headers = [(k.encode(), v.encode()) for k, v in headers.items()]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)

        is_api = scope['path'].startswith('/api')

        async def send_with_headers(message: Message) -> None:
            if message['type'] == 'http.response.start':
                headers = [h for h in message.get('headers', []) if not (is_api and h[0].lower() in API_CACHE_NAMES)]
                present = {name.lower() for name, _ in headers}
                headers += [h for h in self.headers if h[0] not in present]
                if is_api:
                    headers += API_CACHE_HEADERS
                message['headers'] = headers
            await send(message)

        if is_api:
            rejection = self._check_api(scope)
            if rejection:
                return await self._reject(scope, receive, send_with_headers, *rejection)

        headers = Headers(scope=scope)
        length = headers.get('content-length')
        if length and (not length.isdigit() or int(length) > MAX_BODY):
            return await self._reject(scope, receive, send_with_headers, 413, 'El archivo supera el tamaño permitido.')

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message['type'] == 'http.request':
                received += len(message.get('body', b''))
                if received > MAX_BODY:
                    raise HTTPException(413)
            return message

        await self.app(scope, limited_receive, send_with_headers)

    def _check_api(self, scope: Scope) -> tuple[int, str] | tuple[int, str, int] | None:
        if self.settings.production and scope.get('scheme') != 'https':
            return 403, 'Se requiere una conexión HTTPS.'
        client = scope.get('client')
        retry = self.limiter.hit(client[0] if client else 'unknown')
        if retry:
            return 429, 'Demasiadas peticiones. Espera un minuto.', retry
        if scope['method'] in SAFE_METHODS:
            return None
        headers = Headers(scope=scope)
        fetch_site = headers.get('sec-fetch-site')
        if (headers.get('origin') not in self.settings.allowed_origins
                or headers.get('x-clara-request') != '1'
                or (fetch_site and fetch_site not in ('same-origin', 'none'))):
            return 403, 'Origen de la petición no permitido.'
        if headers.get('content-type', '').split(';')[0].strip().lower() != 'application/json':
            return 415, 'Se requiere JSON.'
        return None

    async def _reject(self, scope: Scope, receive: Receive, send: Send, status: int, message: str, retry_after: int | None = None) -> None:
        response = JSONResponse({'error': message}, status_code=status)
        if retry_after:
            response.headers['retry-after'] = str(retry_after)
        await response(scope, receive, send)
