# Clara · Finanzas personales

Planificador de gastos en español con cuentas de usuario: registro, inicio de sesión, recuperación con código privado, sesiones revocables y sincronización del plan entre dispositivos.

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + Vite, Recharts |
| API | Python 3.13, FastAPI, SQLAlchemy 2, Alembic, Argon2id |
| Base de datos | PostgreSQL 17 |
| Despliegue | Docker Compose (local) · Render (imagen Docker + Postgres gestionado) |

## Estructura

```
├── src/                    Frontend (React)
│   ├── main.jsx            Punto de entrada
│   ├── app/                AppRoot (control de sesión) y Dashboard (estado y navegación)
│   ├── pages/              Una página por sección: Overview, Expenses, Calendar, Forecast, Reserves
│   ├── components/
│   │   ├── layout/         Sidebar, Topbar, PageHeading, MainFooter, avisos
│   │   ├── expenses/       Tabla, formulario e icono de gastos
│   │   ├── charts/         Gráfico de previsión, donut y tooltip
│   │   ├── settings/       Formulario de la base del plan
│   │   └── ui/             Modal, Toast, selector de mes
│   ├── modals/             Diálogos (cálculo, avisos, confirmaciones)
│   ├── features/auth/      Pantalla de acceso, formulario, código de recuperación, panel de cuenta
│   ├── hooks/              useCloudPlan (guardado y conflictos), usePlanView, useToast
│   ├── lib/                api.js (cliente HTTP), finance.js (cálculos), backup.js
│   ├── config/             Navegación y textos de cada página
│   └── styles/             CSS global y de autenticación
├── backend/                API (FastAPI)
│   ├── app/
│   │   ├── main.py         Factoría de la app, salud, estáticos, limpieza periódica
│   │   ├── config.py       Configuración desde variables de entorno
│   │   ├── models.py       Tablas: users, plans, sessions, rate_limits
│   │   ├── schemas.py      Validación estricta (Pydantic) de plan y credenciales
│   │   ├── sessions.py     Emisión, validación y expiración de sesiones
│   │   ├── security.py     Argon2id, tokens, CSRF
│   │   ├── middleware.py   Cabeceras de seguridad, origen, tamaño y límite de peticiones
│   │   ├── rate_limit.py   Límites persistentes en PostgreSQL
│   │   └── routers/        auth.py y plan.py
│   ├── migrations/         Alembic
│   └── tests/              pytest contra PostgreSQL real
├── tests/                  Cálculo financiero (node:test) y prueba E2E con Playwright
├── Dockerfile              Multi-stage: build del frontend → API que sirve la web
├── docker-compose.yml      db + api (+ perfil test)
└── .env.example            Plantilla de configuración
```

## Puesta en marcha con Docker

Requiere Docker Desktop.

```sh
cp .env.example .env        # y sustituye POSTGRES_PASSWORD y SECRET_KEY
docker compose up -d --build
```

Abre http://localhost:8000. El contenedor `api` aplica las migraciones al arrancar y sirve la web compilada y la API desde el mismo origen. PostgreSQL solo escucha en `127.0.0.1:5432`; los datos persisten en el volumen `clara_pgdata`.

```sh
docker compose logs -f api     # registros
docker compose down            # parar (conserva los datos)
docker compose down -v         # parar y BORRAR la base de datos
```

## Desarrollo con recarga en caliente

1. Base de datos: `docker compose up -d db`
2. API (desde `backend/`, con Python 3.12+):

   ```sh
   python -m venv .venv && .venv\Scripts\activate   # Windows (en Linux/macOS: source .venv/bin/activate)
   pip install -r requirements-dev.txt
   alembic upgrade head
   uvicorn app.main:create_app --factory --reload --port 8000
   ```

   La API lee el `.env` de la raíz. Documentación interactiva en http://127.0.0.1:8000/api/docs (desactivada en producción).
3. Frontend: `npm install && npm run dev` y abre http://127.0.0.1:5173. Vite reenvía `/api` al puerto 8000.

También puedes usar el contenedor `api` como backend mientras desarrollas el frontend con Vite: los orígenes `:5173` y `:8000` están permitidos en `APP_ORIGIN`.

## Variables de entorno

Todas están documentadas en [.env.example](.env.example). Las más importantes:

| Variable | Descripción |
| --- | --- |
| `ENVIRONMENT` | `development`, `test` o `production`. Producción exige HTTPS y usa la cookie `__Host-clara_session` |
| `POSTGRES_*` | Credenciales del contenedor de PostgreSQL |
| `DATABASE_URL` | Conexión usada fuera de Docker; en Compose se genera apuntando al servicio `db` |
| `SECRET_KEY` | Firma de los tokens CSRF. Mínimo 32 caracteres, distinto en cada entorno |
| `APP_ORIGIN` | Orígenes permitidos para escrituras, separados por comas |
| `FORWARDED_ALLOW_IPS` | Proxies de confianza para `X-Forwarded-*` (`*` tras el balanceador de Render) |

`.env` está excluido de Git. Genera secretos con `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

## Comprobaciones

```sh
npm test                                       # cálculos financieros
docker compose --profile test run --rm --build tests   # API contra PostgreSQL (crea la BD clara_test)
npm run build
```

Prueba E2E con el stack levantado (`docker compose up -d`):

```sh
CLARA_BASE_URL=http://127.0.0.1:8000 npm run test:browser
```

Necesita un Chromium de Playwright (`npx playwright install chromium`) o uno existente mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (por ejemplo, Microsoft Edge). Crea cuentas de prueba: ejecútala solo en entornos de desarrollo.

## Cuentas y uso

Al registrarte se muestra una única vez un código de recuperación: guárdalo en un lugar privado. El correo es el identificador de acceso; esta versión no envía emails ni verifica su titularidad. Cada cuenta empieza con un plan vacío. Los cambios se guardan tras 800 ms de inactividad; si dos dispositivos editan la misma revisión, Clara avisa y permite descargar los cambios o cargar la versión guardada.

Si en el navegador queda un plan de la versión anterior (sin cuentas), aparece un aviso para importarlo. También puedes restaurar una copia JSON desde Configuración.

## Cálculos

Disponible = ingresos − gastos directos − aportaciones a reservas − déficit de reservas al vencimiento − presupuesto diario − colchón mensual.

Las reservas se acumulan desde el inicio del plan y cubren los vencimientos sin descontarlos dos veces. La aplicación no tiene conexión bancaria.

## Despliegue en Render

[render.yaml](render.yaml) define un **Web Service** con la imagen Docker y una base **PostgreSQL gestionada** en Frankfurt. `SECRET_KEY` se genera automáticamente y `DATABASE_URL` se enlaza con la base; al crear el Blueprint introduce `APP_ORIGIN` con la URL HTTPS exacta del servicio. Las migraciones se aplican en cada arranque.

Al usar PostgreSQL, la API no guarda estado en disco y puede escalar a varias instancias; los límites de inicio de sesión se comparten a través de la base de datos. Más detalles en [SECURITY.md](SECURITY.md).
