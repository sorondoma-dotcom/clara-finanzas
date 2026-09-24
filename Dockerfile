# syntax=docker/dockerfile:1

# 1. Compilación del frontend (React + Vite)
FROM node:22-alpine AS frontend
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# 2. Dependencias y código de la API (Python)
FROM python:3.13-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
RUN groupadd --system clara && useradd --system --gid clara --no-create-home clara
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt
COPY backend/ ./

# 3. Imagen de pruebas: añade pytest y ejecuta la batería contra PostgreSQL
FROM backend AS test
COPY backend/requirements-dev.txt ./
RUN pip install -r requirements-dev.txt
USER clara
CMD ["pytest"]

# 4. Imagen de producción: API + frontend compilado en el mismo origen
FROM backend AS runtime
COPY --from=frontend /web/dist ./static
ENV STATIC_DIR=/app/static \
    PORT=8000 \
    WEB_CONCURRENCY=2
USER clara
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/healthz', timeout=4)"
# Aplica migraciones antes de aceptar tráfico. FORWARDED_ALLOW_IPS indica en qué proxy confiar
# para X-Forwarded-For/Proto (uvicorn lo lee directamente del entorno).
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port \"$PORT\" --workers \"$WEB_CONCURRENCY\" --no-server-header --timeout-graceful-shutdown 10"]
