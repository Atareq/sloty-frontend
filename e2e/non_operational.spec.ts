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

test.describe('6. Non-Operational User Flow', () => {
  test('PLAYER user lands on /no-operational-access, stays authenticated, and bootstrap does not run', async ({ page }) => {
    let apiClubsOrCourtsCalled = false

    page.on('request', (request) => {
      const url = request.url()
      // Check backend API endpoints (not Vite source code modules)
      if (
        url.includes('/api/v1/clubs/') &&
        !url.includes('/api/v1/me/')
      ) {
        apiClubsOrCourtsCalled = true
      }
    })

    // Login with player account
    await loginAs(page, '01099000001', '123')

    // Redirected to /no-operational-access
    await expect(page).toHaveURL(/\/no-operational-access/)

    // Arabic access denial text is displayed
    await expect(page.locator('body')).toContainText('لا يوجد لديك صلاحية لاستخدام لوحة الإدارة')
    await expect(page.locator('body')).toContainText('هذا الحساب غير مسجل كمدير أو مالك أو موظف في أي ملعب')

    // Confirm backend clubs/courts API requests were never called
    expect(apiClubsOrCourtsCalled).toBe(false)

    // Direct access to /schedule redirects back to /no-operational-access
    await page.goto('/schedule')
    await expect(page).toHaveURL(/\/no-operational-access/)

    // Logout from /no-operational-access works normally
    await page.click('button:has-text("تسجيل الخروج")')
    const confirmNotice = page.locator('text=تنبيه: بيانات الحجوزات و المواعيد المحفوظه')
    await expect(confirmNotice).toBeVisible()
    await page.locator('button:has-text("تسجيل الخروج")').last().click()

    await expect(page).toHaveURL(/\/login/)
  })

  test('null role user lands on /no-operational-access safely', async ({ page }) => {
    await loginAs(page, '01099000002', '123')
    await expect(page).toHaveURL(/\/no-operational-access/)
    await expect(page.locator('body')).toContainText('لا يوجد لديك صلاحية لاستخدام لوحة الإدارة')
  })
})

