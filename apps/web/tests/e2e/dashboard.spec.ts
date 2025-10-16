import path from 'node:path';
import { test, expect } from '@playwright/test';

const csvPath = path.resolve(process.cwd(), 'tests/fixtures/students.csv');

test.describe('Flujo mobile de graduación', () => {
  test('importa CSV, guarda plantilla y maneja check-in offline', async ({ page, context }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Gestión integral/);

    await page.getByRole('button', { name: 'Guardar plantilla' }).click();

    const csvInput = page.locator('section', { hasText: 'Carga masiva de estudiantes' }).locator('input[type="file"]');
    await csvInput.setInputFiles(csvPath);

    await expect(page.getByText(/Importados \d+ estudiantes/)).toBeVisible();

    const searchInput = page.getByPlaceholder('Nombre, código, documento...');
    await searchInput.fill('Juan');
    const inviteeCard = page.locator('li', { hasText: 'Juan Pérez' }).first();
    await expect(inviteeCard).toBeVisible({ timeout: 15000 });

    await context.setOffline(true);
    await page.route('**/api/checkins', (route) => route.abort());
    await page.getByRole('button', { name: 'Marcar ingreso' }).first().click();
    await expect(page.getByText(/cola offline/i)).toBeVisible();

    await page.unroute('**/api/checkins');
    await context.setOffline(false);
  });
});
