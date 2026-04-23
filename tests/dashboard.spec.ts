// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test'

// Note: if /dashboard redirects to /login due to auth middleware,
// add a login step in beforeEach or set up a test session cookie.
// The tests below assume the dev server allows unauthenticated dashboard access.

test.describe('Dashboard overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('renders the hero widget', async ({ page }) => {
    // "published components" label is unique to the hero widget (not in sidebar)
    await expect(page.getByText('published components', { exact: true })).toBeVisible()
  })

  test('renders the pipeline funnel with all stages', async ({ page }) => {
    // "Production Pipeline" header is unique to the funnel widget
    await expect(page.getByText('Production Pipeline', { exact: true })).toBeVisible()
    // Stage labels within the funnel section
    const funnel = page.locator('div.surface-panel').filter({ hasText: 'Production Pipeline' })
    for (const label of ['Ideas', 'Enriched', 'Generating', 'Review', 'Published']) {
      await expect(funnel.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test('renders the analytics widget', async ({ page }) => {
    await expect(page.getByText('Library Performance', { exact: true })).toBeVisible()
    const analytics = page.locator('div.surface-panel').filter({ hasText: 'Library Performance' })
    await expect(analytics.getByText('Total views', { exact: true })).toBeVisible()
    await expect(analytics.getByText('Code copies', { exact: true })).toBeVisible()
    await expect(analytics.getByText('Upvotes', { exact: true })).toBeVisible()
    await expect(analytics.getByText('Pro components', { exact: true })).toBeVisible()
  })

  test('renders the activity feed', async ({ page }) => {
    // Section header — exact match avoids collision with "No recent activity."
    await expect(page.getByText('Recent Activity', { exact: true })).toBeVisible()
    await expect(page.getByText('View all pipeline activity', { exact: true })).toBeVisible()
  })

  test('pipeline Review row links to /pipeline/review', async ({ page }) => {
    const funnel = page.locator('div.surface-panel').filter({ hasText: 'Production Pipeline' })
    const reviewLink = funnel.getByRole('link', { name: 'Review' })
    await expect(reviewLink).toHaveAttribute('href', '/pipeline/review')
  })
})
