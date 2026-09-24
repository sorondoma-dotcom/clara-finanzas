# Seguridad de Clara

Esta implementación reduce riesgos concretos; no garantiza ausencia de vulnerabilidades. Las pruebas incluidas no sustituyen una auditoría independiente, mantenimiento de dependencias ni vigilancia en producción.

## Arquitectura

Un contenedor con FastAPI (uvicorn) sirve la web compilada y la API `/api` desde el mismo origen, de modo que las cookies `SameSite=Strict` funcionan sin CORS. Los datos viven en PostgreSQL 17; la API no guarda estado en disco. En Docker Compose, PostgreSQL solo se publica en `127.0.0.1` y la API se ejecuta como usuario sin privilegios, con sistema de archivos de solo lectura, sin capacidades Linux y con `no-new-privileges`.

## Controles implementados

- **Contraseñas** con Argon2id (argon2-cffi, perfil RFC 9106 de baja memoria: 64 MiB, 3 iteraciones, 4 hilos), sal aleatoria y rehash automático si cambian los parámetros. Máximo de dos cálculos simultáneos por proceso para acotar memoria. Se exigen 15–128 caracteres y se permiten gestores de contraseñas.
- **Sesiones**: token aleatorio de 256 bits; la base solo almacena su SHA-256. Cookie `HttpOnly`, `SameSite=Strict`, `Path=/`; en producción `__Host-clara_session` con `Secure`. Nada se guarda en `localStorage`. Caducidad absoluta de 7 días e inactividad de 24 horas. Cierre de sesión y cierre global revocan en el servidor; cambio o recuperación de contraseña revocan todas las sesiones. Máximo de cinco sesiones por cuenta.
- **CSRF**: las escrituras exigen JSON, `Origin` exacto de la lista `APP_ORIGIN`, `Sec-Fetch-Site` coherente, cabecera `X-Clara-Request` y un token CSRF firmado con HMAC-SHA256 (`SECRET_KEY`) y ligado a la sesión. La cabecera `X-Clara-User` evita mezclar pestañas cuando la cookie cambia de cuenta; nunca otorga identidad.
- **Aislamiento**: las consultas del plan solo usan el usuario de la sesión. SQL parametrizado (SQLAlchemy), claves foráneas con borrado en cascada y restricciones `CHECK`. Validación estricta con Pydantic: campos desconocidos, tipos coaccionados (`"100"`, `true`), importes con más de dos decimales o fuera de rango se rechazan.
- **Límites**: 180 peticiones por minuto e IP (en memoria, por proceso); intentos de registro, login, recuperación y cambio de contraseña limitados por IP y por correo en PostgreSQL (compartidos entre instancias). Respuestas de login y recuperación genéricas y cálculo de hash también para correos inexistentes. Cuerpos limitados a 1 MiB antes de leerlos; 1.000 gastos y 24.000 estados de pago por plan.
- **Cabeceras**: CSP sin JavaScript inline, `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy: no-referrer`, COOP/CORP, `Permissions-Policy`, HSTS en producción y `Cache-Control: no-store` en la API. Sin cabecera `Server`. La documentación OpenAPI se desactiva en producción.
- **Errores y registros**: no se devuelven trazas ni errores SQL; los registros no incluyen cuerpos, contraseñas, correos ni datos financieros.
- **Proxy**: en producción la API rechaza peticiones que no lleguen por HTTPS. Solo se confía en `X-Forwarded-*` de los orígenes indicados en `FORWARDED_ALLOW_IPS`; revísalo si cambias de proveedor.
- **Configuración**: los secretos se leen del entorno (`.env` excluido de Git). En producción, la API no arranca con `SECRET_KEY` de ejemplo ni con orígenes HTTP.

## Recuperación de cuenta

El alta y el cambio de contraseña generan un código de recuperación de un solo uso que se muestra una vez y se almacena como hash. Al usarlo se rota el código y se revocan todas las sesiones. El correo **no está verificado**; no hay recuperación por email ni MFA. Perder contraseña y código a la vez impide la recuperación automática.

## Rendimiento y concurrencia

- Pool de conexiones con `pool_pre_ping`, tiempo máximo de consulta de 5 s y de espera de conexión de 5 s.
- El plan se almacena normalizado: configuración en `plans` (importes `NUMERIC(11,2)`, modo de ingreso y mes de inicio con `CHECK`), gastos en `expenses`, ingresos por mes en `monthly_incomes` y estados de pago en `paid_charges`, todos con clave foránea y borrado en cascada. La base rechaza por sí misma importes negativos, categorías, frecuencias o meses no válidos aunque falle la validación de la API. Cada guardado sustituye el plan en una única transacción.
- Control de concurrencia optimista (`UPDATE … WHERE revision = ?`): los conflictos devuelven 409 y exigen resolución explícita.
- Consulta ligera de revisión para detectar cambios de otros dispositivos. La actividad de sesión se actualiza como máximo cada cinco minutos y las sesiones y límites caducados se limpian cada 15 minutos.
- Índices en correo, token de sesión, usuario y caducidades; las pruebas comprueban su uso con `EXPLAIN`.

## Copias y operaciones

- Render: la base gestionada de pago incluye copias automáticas y recuperación a un punto en el tiempo según el plan contratado.
- Docker local: los datos están en el volumen `clara_pgdata`. Copia manual: `docker compose exec db pg_dump -U clara -Fc clara > clara.dump`; restauración con `pg_restore`. Prueba periódicamente la restauración y guarda copias cifradas fuera del equipo.
- Los usuarios pueden exportar su plan en JSON.

Vigila errores 429/503, latencia, conexiones de PostgreSQL y avisos de seguridad de dependencias (`pip-audit`, `npm audit`).

## Validación

`backend/tests` (pytest contra PostgreSQL) cubre aislamiento entre usuarios, CSRF y origen, validación, inyección SQL, restricciones de la base, ingreso variable, migración de planes antiguos, tamaño de cuerpo, límites de intentos, revocación, expiración por inactividad y absoluta, límite de sesiones, recuperación, cambio de contraseña, cabeceras de producción e índices. `npm run test:browser` recorre registro, login, recuperación, guardado entre navegadores, conflictos y vista móvil.

Referencias: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
