import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Dashboard loads correctly', async ({ page }) => {
    // Navigate to the unauthenticated browse page
    await page.goto('/browse');
    
    // Wait for the asset grid to mount and render some data or empty state
    await page.waitForLoadState('networkidle');

    // Take a full-page snapshot and compare against the baseline
    await expect(page).toHaveScreenshot('browse-page-baseline.png', {
       fullPage: true,
       maxDiffPixels: 150
    });
  });

  // Example test for an individual component's sandbox
  test('Component sandbox compiles without crashing', async ({ page }) => {
    // If we have random assets, we use the random API or mock a component
    // To ensure a baseline exists, we'll visit the underlying preview endpoint
    // Testing an empty compile route just to ensure no 500s are thrown
    const res = await page.goto('/api/preview/compile');
    expect(res?.status()).toBe(200);
  });
});
