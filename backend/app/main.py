import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from datetime import UTC, datetime
from pathlib import Path
from typing import Callable

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from starlette.exceptions import HTTPException

from .config import Settings
from .errors import install_error_handlers
from .middleware import SecurityMiddleware
from .routers import auth, plan
from .security import PasswordWorker
from .sessions import cleanup_expired

logging.basicConfig(level=logging.INFO, format='%(message)s')
CLEANUP_INTERVAL = 15 * 60


def create_app(settings: Settings | None = None, clock: Callable[[], datetime] | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = create_engine(
        settings.database_url, pool_pre_ping=True, pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow, pool_timeout=5,
        connect_args={'connect_timeout': 5, 'options': '-c statement_timeout=5000'},
    )
    make_session = sessionmaker(engine, expire_on_commit=False)
    clock = clock or (lambda: datetime.now(UTC))

    def cleanup() -> None:
        with make_session() as db:
            cleanup_expired(db, clock())

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        async def periodic_cleanup():
            while True:
                with suppress(Exception):
                    await run_in_threadpool(cleanup)
                await asyncio.sleep(CLEANUP_INTERVAL)

        task = asyncio.create_task(periodic_cleanup())
        logging.info('Clara API lista')
        yield
        task.cancel()
        engine.dispose()

    app = FastAPI(title='Clara API', lifespan=lifespan, docs_url=None if settings.production else '/api/docs', redoc_url=None, openapi_url=None if settings.production else '/api/openapi.json')
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessionmaker = make_session
    app.state.clock = clock
    app.state.cleanup = cleanup
    app.state.password_worker = PasswordWorker()
    app.add_middleware(SecurityMiddleware, settings=settings)
    install_error_handlers(app)

    @app.get('/healthz', include_in_schema=False)
    def health():
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
        return {'status': 'ok'}

    app.include_router(auth.router)
    app.include_router(plan.router)

    @app.api_route('/api/{path:path}', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], include_in_schema=False)
    def api_not_found(path: str):
        raise HTTPException(404)

    if settings.static_dir and Path(settings.static_dir, 'index.html').is_file():
        mount_frontend(app, Path(settings.static_dir).resolve())
    return app


def mount_frontend(app: FastAPI, root: Path) -> None:
    """Sirve la compilación de Vite desde el mismo origen que la API (cookies SameSite=Strict)."""
    index = root / 'index.html'

    @app.get('/{path:path}', include_in_schema=False)
    def frontend(path: str):
        candidate = (root / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(root) and not any(p.startswith('.') for p in Path(path).parts):
            immutable = candidate.is_relative_to(root / 'assets')
            return FileResponse(candidate, headers={'Cache-Control': 'public, max-age=31536000, immutable' if immutable else 'no-cache'})
        return FileResponse(index, headers={'Cache-Control': 'no-cache'})
