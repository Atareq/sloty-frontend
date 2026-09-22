import { test, expect, Page } from '@playwright/test'

async function loginAs(page: Page, phone: string, password = '123') {
  await page.goto('/login')
  const phoneInput = page.locator('input[type="tel"]')
  await phoneInput.waitFor({ state: 'visible' })
  await phoneInput.fill(phone)
  const passInput = page.locator('input[type="password"]')
  await passInput.fill(password)
  await page.click('button:has-text("تسجيل الدخول")')
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
}

test.describe('2. Club / Court Bootstrap & Permissions Flow', () => {
  test('owner bootstrap: loads club and all courts (Spotify Camp Nou & La Masia)', async ({ page }) => {
    await loginAs(page, '01022222221', '123')

    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.locator('body')).toContainText('Barcelona FC')

    // Court dropdown is rendered because Owner has multiple accessible courts
    const courtButton = page.getByRole('button', { name: /Spotify Camp Nou/ })
    await expect(courtButton).toBeVisible()
    await courtButton.click()

    await expect(page.getByRole('option', { name: /Spotify Camp Nou/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /La Masia Training Court/ })).toBeVisible()

    // Owner can access owner-only routes like /settings/courts
    await page.goto('/settings/courts')
    await expect(page).toHaveURL(/\/settings\/courts/)
    await expect(page.locator('body')).toContainText('إعدادات الملاعب')
  })

  test('staff bootstrap: sees only assigned court without multi-court picker, and cannot access owner-only routes', async ({ page }) => {
    await loginAs(page, '01033333331', '123')

    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.locator('body')).toContainText('Barcelona FC')

    // Since staff only has 1 assigned court (Spotify Camp Nou), multi-court picker is omitted
    const courtPicker = page.locator('button[aria-haspopup="listbox"]')
    await expect(courtPicker).not.toBeVisible()

    // Staff navigating to owner-only route /settings/courts is blocked and redirected to /schedule
    await page.goto('/settings/courts')
    await expect(page).toHaveURL(/\/schedule/)

    // Staff navigating to owner-only route /audit-logs is blocked and redirected to /schedule
    await page.goto('/audit-logs')
    await expect(page).toHaveURL(/\/schedule/)
  })
})

