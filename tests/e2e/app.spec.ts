import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('home page loads and shows VELOX branding', async ({ page }) => {
  await expect(page.locator('.brand')).toHaveText(/VELOX/i);
});

test('header controls render and export is disabled on load', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Sensors/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Import/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export/i })).toBeDisabled();
});

test('theme toggle switches between dark and light', async ({ page }) => {
  const toggle = page.getByRole('switch');
  await toggle.click();
  await expect(page.locator('main')).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(page.locator('main')).toHaveAttribute('data-theme', 'dark');
});

test('controls panel FTP input accepts a number and ERG button defaults to Off', async ({ page }) => {
  const ftpInput = page.getByLabel(/FTP watts/i);
  await expect(ftpInput).toBeVisible();
  await ftpInput.fill('250');
  await expect(ftpInput).toHaveValue('250');
  await expect(page.getByRole('button', { name: /ERG Off/i })).toBeVisible();
});

test('demo ride flow toggles start label to Stop Demo and back', async ({ page }) => {
  const startButton = page.getByRole('button', { name: /^Start$/i });
  await startButton.click();
  await page.getByRole('button', { name: /Demo/i }).click();
  await expect(page.getByRole('button', { name: /Stop Demo/i })).toBeVisible();
  await page.getByRole('button', { name: /Stop Demo/i }).click();
  await expect(page.getByRole('button', { name: /^Start$/i })).toBeVisible();
});

test('preset route loads and renders map and elevation chart', async ({ page }) => {
  const presetRoutes = page.getByRole('combobox', { name: /Preset Routes/i });
  await expect(presetRoutes).toBeVisible();
  await presetRoutes.selectOption('Huez');
  await expect(page.locator('#map')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#elevationChart')).toBeVisible();
});
