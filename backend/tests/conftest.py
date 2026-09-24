import os
from datetime import UTC, datetime, timedelta

import pytest
from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text

from app.config import Settings
from app.main import create_app

ORIGIN = 'http://localhost:5173'
PASSWORD = 'una frase privada muy larga 876!'
BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))


def resolve_test_database_url() -> str:
    base = Settings(secret_key='x' * 32).database_url
    url = make_url(os.environ.get('TEST_DATABASE_URL') or base)
    if not os.environ.get('TEST_DATABASE_URL'):
        url = url.set(database=f'{url.database}_test')
    return url.render_as_string(hide_password=False)


@pytest.fixture(scope='session')
def alembic_config(database_url) -> AlembicConfig:
    config = AlembicConfig(os.path.join(BACKEND_DIR, 'alembic.ini'))
    config.set_main_option('script_location', os.path.join(BACKEND_DIR, 'migrations'))
    config.attributes['database_url'] = database_url
    return config


@pytest.fixture(scope='session')
def database_url() -> str:
    url = make_url(resolve_test_database_url())
    admin = create_engine(url.set(database='postgres'), isolation_level='AUTOCOMMIT')
    with admin.connect() as connection:
        if not connection.scalar(text('SELECT 1 FROM pg_database WHERE datname = :name'), {'name': url.database}):
            connection.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin.dispose()
    rendered = url.render_as_string(hide_password=False)
    alembic = AlembicConfig(os.path.join(BACKEND_DIR, 'alembic.ini'))
    alembic.set_main_option('script_location', os.path.join(BACKEND_DIR, 'migrations'))
    alembic.attributes['database_url'] = rendered
    command.downgrade(alembic, 'base')
    command.upgrade(alembic, 'head')
    return rendered


class Clock:
    def __init__(self):
        self.value = datetime.now(UTC)

    def __call__(self) -> datetime:
        return self.value

    def advance(self, **delta) -> None:
        self.value += timedelta(**delta)


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def make_client(database_url, clock):
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(text('TRUNCATE users, plans, sessions, rate_limits CASCADE'))
    engine.dispose()
    clients = []

    def factory(**overrides) -> TestClient:
        options = {'environment': 'test', 'database_url': database_url, 'secret_key': 's' * 40, 'app_origin': ORIGIN, 'static_dir': None, **overrides}
        app = create_app(Settings(**options), clock=clock)
        base_url = 'https://testserver' if options['environment'] == 'production' else 'http://testserver'
        client = TestClient(app, base_url=base_url)
        client.__enter__()
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.__exit__(None, None, None)


@pytest.fixture
def client(make_client) -> TestClient:
    return make_client()


@pytest.fixture
def db(database_url):
    engine = create_engine(database_url)
    with engine.connect() as connection:
        yield connection
    engine.dispose()


def mutation(client: TestClient, path: str, body, csrf: str | None = None, method: str = 'post', origin: str = ORIGIN):
    headers = {'Origin': origin, 'X-Clara-Request': '1'}
    if csrf:
        headers['X-CSRF-Token'] = csrf
    return client.request(method.upper(), path, json=body, headers=headers)


def register(client: TestClient, email: str = 'uno@example.com') -> dict:
    response = mutation(client, '/api/auth/register', {'email': email, 'name': 'Persona', 'password': PASSWORD})
    assert response.status_code == 201, response.text
    return response.json()


def demo_plan() -> dict:
    return {
        'version': 1, 'demo': True, 'startMonth': '2026-09', 'income': 2850, 'variable': 420, 'cushion': 200, 'paid': {},
        'expenses': [
            {'id': 'rent', 'name': 'Alquiler de casa', 'amount': 750, 'category': 'Vivienda', 'frequency': 'monthly', 'day': 1, 'start': '2026-09', 'fund': 0},
            {'id': 'car', 'name': 'Seguro del coche', 'amount': 360.5, 'category': 'Seguros', 'frequency': 'yearly', 'day': 24, 'start': '2026-10', 'fund': 300},
        ],
    }
