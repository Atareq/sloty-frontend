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

test.describe('3. Booking Core Flow E2E Journey', () => {
  test('complete booking lifecycle: create -> verify -> pay deposit -> reschedule -> cancel -> verify slot released', async ({ page }) => {
    test.setTimeout(60000)

    // 1. Login as Owner
    await loginAs(page, '01022222221', '123')
    await expect(page).toHaveURL(/\/schedule/)

    // 2. Choose an available evening slot (8:00 م)
    const initialSlotBtn = page.locator('button:has-text("8:00 م"):has-text("متاح")').first()
    await expect(initialSlotBtn).toBeVisible()
    await initialSlotBtn.click()

    // 3. AddBookingSheet opens
    const addBookingSheet = page.getByRole('dialog', { name: 'حجز جديد' })
    await expect(addBookingSheet).toBeVisible()

    // Fill customer details
    const phoneField = addBookingSheet.locator('input[type="tel"]')
    await phoneField.fill('01055554444')

    // Fill customer name
    const nameInput = addBookingSheet.getByRole('combobox').or(addBookingSheet.locator('input[placeholder*="اسم"]')).or(addBookingSheet.locator('input[type="text"]').last())
    await nameInput.fill('كابتن محمد')

    // Submit booking
    await addBookingSheet.locator('button:has-text("تأكيد الحجز")').click()
    await expect(addBookingSheet).not.toBeVisible()

    // 4. Verify booking appears on schedule as HOLD (بانتظار العربون)
    const bookingSlot = page.locator('button:has-text("8:00 م")').first()
    await expect(bookingSlot).toContainText('بانتظار العربون')

    // 5. Open booking details
    await bookingSlot.click()
    const actionDialog = page.getByRole('dialog', { name: 'تفاصيل الحجز' })
    await expect(actionDialog).toBeVisible()
    await expect(actionDialog).toContainText('بانتظار العربون')

    // 6. Record deposit payment
    const payDepositBtn = actionDialog.locator('button:has-text("سجّل العربون"), button:has-text("تسجيل العربون")').first()
    await payDepositBtn.click()

    // RecordPaymentSheet opens
    const paymentSheet = page.getByRole('dialog', { name: 'تسجيل العربون' })
    await expect(paymentSheet).toBeVisible()
    // Fill deposit amount (300)
    await paymentSheet.locator('label:has-text("المبلغ") input').fill('300')
    await paymentSheet.locator('button[type="submit"]:has-text("تسجيل العربون")').click()
    await expect(paymentSheet).not.toBeVisible()

    // 7. Verify status updates to "العربون مدفوع" on schedule
    await expect(page.locator('button:has-text("8:00 م")').first()).toContainText('العربون مدفوع')

    // 8. Reschedule booking: open booking details again
    await page.locator('button:has-text("8:00 م")').first().click()
    const rescheduleActionDialog = page.getByRole('dialog', { name: 'تفاصيل الحجز' })
    await expect(rescheduleActionDialog).toBeVisible()
    await rescheduleActionDialog.getByText('خيارات أخرى').click()
    await rescheduleActionDialog.locator('button:has-text("تغيير الموعد")').click()

    // RescheduleBookingSheet opens
    const rescheduleSheet = page.getByRole('dialog', { name: 'تغيير الموعد' })
    await expect(rescheduleSheet).toBeVisible()

    // Pick new available evening slot (9:00 م) inside RescheduleBookingSheet
    const newTargetSlot = rescheduleSheet.locator('button:has-text("9:00 م")').first()
    await newTargetSlot.click()

    // Confirm reschedule
    await rescheduleSheet.locator('button[type="submit"]:has-text("تأكيد تغيير الموعد")').click()
    await expect(rescheduleSheet).not.toBeVisible()

    // 9. Rescheduled booking details update in the open dialog
    const rescheduledActionDialog = page.getByRole('dialog', { name: 'تفاصيل الحجز' })
    await expect(rescheduledActionDialog).toBeVisible()
    await expect(rescheduledActionDialog).toContainText('العربون مدفوع')

    // 10. Cancel booking from the open details dialog
    await rescheduledActionDialog.getByText('خيارات أخرى').click()
    await rescheduledActionDialog.locator('button:has-text("إلغاء الحجز")').click()

    // CancelBookingReasonSheet opens
    const cancelSheet = page.getByRole('dialog', { name: 'إلغاء الحجز' })
    await expect(cancelSheet).toBeVisible()

    // Select cancellation reason from AppSelect
    const reasonButton = cancelSheet.locator('button:has-text("اختر السبب")').first()
    await reasonButton.click()
    await page.getByRole('option', { name: 'العميل ألغى' }).click()

    // Submit cancellation
    await cancelSheet.locator('button[type="submit"]:has-text("إلغاء الحجز")').click()
    await expect(cancelSheet).not.toBeVisible()

    // 11. Verify slots are released and available on schedule
    await expect(page.locator('button:has-text("8:00 م")').first()).toContainText('متاح')
    await expect(page.locator('button:has-text("9:00 م")').first()).toContainText('متاح')
  })
})
