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

test.describe('1. Authentication Flow', () => {
  test('login with valid credentials reaches schedule and stores session', async ({ page }) => {
    await loginAs(page, '01022222221', '123')

    await expect(page).toHaveURL(/\/schedule/)
    await expect(page.locator('body')).toContainText('Barcelona FC')
    await expect(page.locator('body')).toContainText('Spotify Camp Nou')
  })

  test('invalid login shows Arabic error and stays on /login', async ({ page }) => {
    await page.goto('/login')
    const phoneInput = page.locator('input[type="tel"]')
    await phoneInput.waitFor({ state: 'visible' })
    await phoneInput.fill('01022222221')
    await page.fill('input[type="password"]', 'wrong-password')
    await page.click('button:has-text("تسجيل الدخول")')

    await expect(page.locator('body')).toContainText('تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated access to protected route redirects to /login', async ({ page }) => {
    await page.goto('/schedule')
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout through menu confirmation sheet redirects to /login and clears session', async ({ page }) => {
    // 1. Login
    await loginAs(page, '01022222221', '123')
    await expect(page).toHaveURL(/\/schedule/)

    // 2. Open drawer menu via aria-label
    await page.getByRole('button', { name: 'فتح القائمة' }).click()

    // 3. Click logout button inside menu drawer
    await page.click('button:has-text("تسجيل الخروج")')

    // 4. Logout confirmation sheet appears
    const confirmNotice = page.locator('text=تنبيه: بيانات الحجوزات و المواعيد المحفوظه')
    await expect(confirmNotice).toBeVisible()

    // 5. Confirm logout
    await page.locator('button:has-text("تسجيل الخروج")').last().click()

    // 6. Redirected to /login
    await expect(page).toHaveURL(/\/login/)

    // 7. Navigating back to protected route redirects to /login
    await page.goto('/schedule')
    await expect(page).toHaveURL(/\/login/)
  })
})

