
import { test, expect } from '@playwright/test';
 
async function login(page: any, user = 'standard_user') {
  await page.goto('https://www.saucedemo.com/');
  await page.getByPlaceholder('Username').fill(user);
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();
}
 
test.describe('Dashboard', () => {
  test('widgets (product cards) load with expected count', async ({ page }) => {
    await login(page);
    const items = page.locator('.inventory_item');
    await expect(items).toHaveCount(6);
  });
 
  test('data accuracy: product names and prices are well-formed', async ({ page }) => {
    await login(page);
    const names = await page.locator('.inventory_item_name').allTextContents();
    const prices = await page.locator('.inventory_item_price').allTextContents();
 
    expect(names.every((n) => n.trim().length > 0)).toBeTruthy();
    expect(prices.every((p) => /^\$\d+\.\d{2}$/.test(p))).toBeTruthy();
  });
 
  test('sort behavior: price low to high is ascending', async ({ page }) => {
    await login(page);
    await page.locator('[data-test="product-sort-container"]').selectOption('lohi');
    const priceTexts = await page.locator('.inventory_item_price').allTextContents();
    const prices = priceTexts.map((p) => parseFloat(p.replace('$', '')));
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });
 
  test('filter/sort by name Z to A', async ({ page }) => {
    await login(page);
    await page.locator('[data-test="product-sort-container"]').selectOption('za');
    const names = await page.locator('.inventory_item_name').allTextContents();
    const sorted = [...names].sort().reverse();
    expect(names).toEqual(sorted);
  });
 
  test('responsive layout: inventory list usable at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await expect(page.locator('.inventory_list')).toBeVisible();
    await expect(page.locator('.inventory_item').first()).toBeVisible();
  });
 
  test('permission/visibility: problem_user shows broken images (regression check)', async ({ page }) => {
    await login(page, 'problem_user');
    const firstImgSrc = await page.locator('.inventory_item_img img').first().getAttribute('src');
    expect(firstImgSrc).toContain('sl-404');
  });
});