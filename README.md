# Clara · Gestión de gastos

Una aplicación local en español para anticipar gastos y conocer el margen mensual disponible. Incluye un panel interactivo, gastos mensuales/trimestrales/anuales/puntuales, calendario con estado de pago, reservas, previsión de 12 meses, simulador y copias de seguridad JSON.

## Iniciar

Requiere Node.js 20.18 o posterior.

```sh
npm install
npm run dev
```

Abre la dirección local que muestra Vite (normalmente http://127.0.0.1:5173).

```sh
npm run build
npm test
```

Para repetir las pruebas de navegador, deja el servidor en marcha en el puerto 5173, instala Chromium con `npx playwright install chromium` y ejecuta `npm run test:browser`. También puedes usar un Chromium existente indicando su ruta en `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Primer uso

La aplicación empieza con datos de ejemplo claramente identificados. Pulsa **Configurar mi plan** para empezar desde cero, configura los ingresos, presupuesto de vida diaria y colchón mensual, y añade tus gastos. Para cada pago anual o trimestral, indica el primer vencimiento y el dinero que ya tenías reservado al inicio del plan.

Disponible = ingresos − gastos directos − aportaciones a reservas − déficit de reservas al vencimiento − presupuesto diario − colchón mensual.

Las reservas se acumulan desde el mes de inicio del plan y cubren los vencimientos sin descontarlos dos veces. Un déficit en la reserva reduce el disponible del mes de pago. Marcar un gasto como pagado solo cambia su estado en el calendario. Al cambiar el inicio del plan, actualiza los saldos iniciales de las reservas. Los gastos de importe variable se introducen como previsiones y deben ajustarse cuando se conozca el importe real.

## Datos

Los datos se guardan en `localStorage` del navegador, bajo `clara-finances-v1`. Descarga y restaura copias desde Configuración. No hay conexión bancaria, sincronización, cuentas de usuario ni notificaciones fuera de la aplicación. El disponible es una previsión basada en los datos introducidos, no el saldo bancario. No garantiza la ausencia de gastos no registrados. Las fuentes de Google requieren conexión; el diseño tiene fuentes alternativas locales.

Construida con React, Vite, Recharts y Lucide.

## Publicar en Render

El archivo `render.yaml` configura Clara como un **Static Site**, con compilación y pruebas automáticas, Node.js 22 y publicación de `dist`. Los cambios enviados al repositorio vuelven a desplegar la aplicación automáticamente.

1. Sube el proyecto a tu repositorio de GitHub.
2. Abre [Render](https://dashboard.render.com/) y elige **New → Blueprint**.
3. Conecta el repositorio, selecciona su rama principal y utiliza `render.yaml`.
4. Pulsa **Deploy Blueprint**. Cuando el servicio indique **Live**, abre la URL `onrender.com` que te asigne Render.

Si creas el sitio manualmente con **New → Static Site**, usa:

| Campo | Valor |
| --- | --- |
| Build Command | `npm ci --include=dev && npm test && npm run build` |
| Publish Directory | `dist` |
| NODE_VERSION | `22` |
| SKIP_INSTALL_DEPS | `true` |

La URL publicada permite abrir Clara con el ordenador apagado. Los datos siguen guardándose por navegador y dirección web: la publicación no añade sincronización entre dispositivos. Para trasladar tus datos locales, descarga una copia desde Configuración de la aplicación local y después impórtala en la dirección publicada. Utiliza siempre la misma dirección y navegador para continuar con ese plan.

Referencia: [sitios estáticos de Render](https://render.com/docs/static-sites) y [Blueprints](https://render.com/docs/infrastructure-as-code).
