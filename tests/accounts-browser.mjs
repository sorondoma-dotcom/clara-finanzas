import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE && { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }) });
const base = process.env.CLARA_BASE_URL || 'http://127.0.0.1:5173';
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const email = `browser-${randomUUID()}@example.com`, password = `Clara ${randomUUID()} !`;
await fs.mkdir('test-results', { recursive: true });
try {
  await page.goto(base);
  await page.getByRole('button', { name: 'Entrar en Clara' }).waitFor();
  await page.screenshot({ path: 'test-results/login.png', fullPage: true });
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByLabel('Tu nombre').fill('Cuenta de prueba');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await page.getByRole('heading', { name: 'Guarda tu llave de repuesto.' }).waitFor();
  const recovery = await page.locator('.recovery-code').innerText();
  assert.equal(recovery.length, 43);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('heading', { name: 'Tu dinero, bajo control.' }).waitFor();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByLabel('Ingresos netos mensuales').fill('3100');
  await page.getByRole('button', { name: 'Guardar mi plan' }).click();
  await expect(page.locator('.local-badge')).toHaveText('Sincronizado con tu cuenta');
  await page.getByRole('button', { name: 'Añadir gasto', exact: true }).first().click();
  await page.getByLabel('Nombre del gasto').fill('Alquiler privado');
  await page.getByLabel('Importe de cada pago').fill('650');
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.locator('.local-badge')).toHaveText('Sincronizado con tu cuenta');
  await page.reload();
  await page.getByRole('button', { name: 'Mis gastos' }).click();
  await page.getByRole('button', { name: 'Alquiler privado', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('clara-finances-v1')), null);

  // A second independent browser signs into the same account and sees the server data.
  const second = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await second.newPage();
  await mobile.goto(base);
  await mobile.getByLabel('Correo electrónico').fill(email);
  await mobile.getByLabel('Contraseña', { exact: true }).fill(password);
  await mobile.getByRole('button', { name: 'Entrar en Clara' }).click();
  await mobile.getByRole('heading', { name: 'Tu dinero, bajo control.' }).waitFor();
  await expect(mobile.getByRole('button', { name: /^Alquiler privado/ })).toBeVisible();
  await mobile.screenshot({ path: 'test-results/cloud-mobile.png', fullPage: true });
  assert.equal(await mobile.locator('body').evaluate(e => e.scrollWidth > innerWidth), false);

  // Concurrent writes must conflict rather than overwrite the latest version.
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByLabel('Ingresos netos mensuales').fill('3300');
  await page.getByRole('button', { name: 'Guardar mi plan' }).click();
  await expect(page.locator('.local-badge')).toHaveText('Sincronizado con tu cuenta');
  await mobile.getByRole('button', { name: 'Abrir menú' }).click();
  await mobile.getByRole('button', { name: 'Configuración', exact: true }).click();
  await mobile.getByLabel('Ingresos netos mensuales').fill('3400');
  await mobile.getByRole('button', { name: 'Guardar mi plan' }).click();
  await mobile.getByRole('button', { name: 'Cargar versión guardada', exact: true }).waitFor();
  await mobile.getByRole('button', { name: 'Cargar versión guardada', exact: true }).click();
  await mobile.getByRole('dialog').getByRole('button', { name: 'Cargar versión guardada' }).click();
  await expect(mobile.getByLabel('Ingresos netos mensuales')).toHaveValue('3300');

  await page.getByRole('button', { name: 'Cerrar todas las sesiones' }).click();
  await page.getByRole('button', { name: 'Entrar en Clara' }).waitFor();
  await mobile.reload();
  await mobile.getByRole('button', { name: 'Entrar en Clara' }).waitFor();
  await mobile.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
  await second.close();

  await page.getByRole('button', { name: 'He olvidado mi contraseña' }).click();
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Código de recuperación').fill(recovery);
  const newPassword = `Nueva ${randomUUID()} !`;
  await page.getByLabel('Nueva contraseña').fill(newPassword);
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Contraseña', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Entrar en Clara' }).click();
  await page.getByRole('heading', { name: 'Tu dinero, bajo control.' }).waitFor();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await expect(page.getByLabel('Ingresos netos mensuales')).toHaveValue('3300');
  assert.deepEqual(errors, []);
  console.log('Accounts browser checks passed: registration, login, recovery, cloud persistence, independent devices, concurrent conflict resolution, logout-all and mobile layout.');
} finally { await browser.close(); }
