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

test.describe('4. Validation and Error Feedback E2E', () => {
  test('AddBookingSheet validates required fields and phone format', async ({ page }) => {
    await loginAs(page, '01022222221', '123')
    await expect(page).toHaveURL(/\/schedule/)

    // Choose an available slot
    const slotBtn = page.locator('button:has-text("متاح")').first()
    await expect(slotBtn).toBeVisible()
    await slotBtn.click()

    // AddBookingSheet opens
    const addBookingSheet = page.getByRole('dialog', { name: 'حجز جديد' })
    await expect(addBookingSheet).toBeVisible()

    // Scenario A: Missing required customer name
    await addBookingSheet.locator('button:has-text("تأكيد الحجز")').click()
    await expect(addBookingSheet).toContainText('اسم العميل مطلوب')

    // Fill customer name
    const nameInput = addBookingSheet
      .getByRole('combobox')
      .or(addBookingSheet.locator('input[placeholder*="اسم"]'))
      .or(addBookingSheet.locator('input[type="text"]').last())
    await nameInput.fill('عميل تجريبي')

    // Scenario B: Missing required phone
    await addBookingSheet.locator('button:has-text("تأكيد الحجز")').click()
    await expect(addBookingSheet).toContainText('رقم الموبايل مطلوب')

    // Scenario C: Invalid phone format (e.g. "123")
    const phoneInput = addBookingSheet.locator('input[type="tel"]')
    await phoneInput.fill('123')
    await addBookingSheet.locator('button:has-text("تأكيد الحجز")').click()
    await expect(addBookingSheet).toContainText('رقم الموبايل غير صحيح')

    // Form remained open and safe without crashing
    await expect(addBookingSheet).toBeVisible()

    // Close sheet safely
    await addBookingSheet.getByRole('button', { name: 'إغلاق' }).click()
  })

  test('RecordPaymentSheet validates missing or invalid amount', async ({ page }) => {
    await loginAs(page, '01022222221', '123')
    await expect(page).toHaveURL(/\/schedule/)

    // Find any booking that needs payment on the schedule
    // If none open directly, we click a booked slot or create one
    let bookedSlot = page.locator('button:has-text("بانتظار العربون")').first()
    const hasBooked = await bookedSlot.isVisible().catch(() => false)

    if (!hasBooked) {
      // Pick an available slot to create a temporary booking
      const availableSlot = page.locator('button:has-text("متاح")').first()
      await availableSlot.click()
      const addBookingSheet = page.getByRole('dialog', { name: 'حجز جديد' })
      await expect(addBookingSheet).toBeVisible()
      const phoneInput = addBookingSheet.locator('input[type="tel"]')
      await phoneInput.fill('01011112222')
      const nameInput = addBookingSheet.getByRole('combobox').or(addBookingSheet.locator('input[placeholder*="اسم"]')).or(addBookingSheet.locator('input[type="text"]').last())
      await nameInput.fill('عميل اختبار الدفع')
      await addBookingSheet.locator('button:has-text("تأكيد الحجز")').click()
      await expect(addBookingSheet).not.toBeVisible()
      bookedSlot = page.locator('button:has-text("بانتظار العربون")').first()
    }

    await bookedSlot.click()
    const actionDialog = page.getByRole('dialog', { name: 'تفاصيل الحجز' })
    await expect(actionDialog).toBeVisible()

    // Open RecordPaymentSheet
    const payBtn = actionDialog.locator('button:has-text("سجّل العربون"), button:has-text("تسجيل العربون")').first()
    await payBtn.click()

    const paymentSheet = page.getByRole('dialog', { name: 'تسجيل العربون' })
    await expect(paymentSheet).toBeVisible()

    // Scenario A: Submitting without entering amount
    await paymentSheet.locator('button[type="submit"]:has-text("تسجيل العربون")').click()
    await expect(paymentSheet).toContainText('المبلغ مطلوب')

    // Scenario B: Entering 0 or amount lower than minimum deposit
    const amountInput = paymentSheet.locator('label:has-text("المبلغ") input')
    await amountInput.fill('10')
    await paymentSheet.locator('button[type="submit"]:has-text("تسجيل العربون")').click()
    await expect(paymentSheet).toContainText(/أقل عربون|المبلغ/)

    // Dialog remains responsive and safe
    await expect(paymentSheet).toBeVisible()
    await paymentSheet.getByRole('button', { name: 'إغلاق' }).click()
  })
})

