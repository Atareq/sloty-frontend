import { useState, type FormEvent } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { PasswordField } from '../../../../shared/components/PasswordField/PasswordField'
import { settingsCopy } from '../../../../shared/copy/appCopy'

export interface ChangePasswordSheetProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Change password modal for the authenticated user at account-level settings.
 *
 * NOTE: Backend currently lacks an authenticated change-password endpoint
 * (BE-REQ-AUTHENTICATED-CHANGE-PASSWORD). Submission is safely blocked without
 * faking endpoints or simulating success.
 */
export function ChangePasswordSheet({
  isOpen,
  onClose,
}: ChangePasswordSheetProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null)
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null)

  function handleClose(): void {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setCurrentPasswordError(null)
    setNewPasswordError(null)
    setConfirmPasswordError(null)
    setBlockedNotice(null)
    onClose()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setBlockedNotice(null)

    let hasError = false

    if (!currentPassword.trim()) {
      setCurrentPasswordError('كلمة المرور الحالية مطلوبة')
      hasError = true
    } else {
      setCurrentPasswordError(null)
    }

    if (!newPassword.trim()) {
      setNewPasswordError('كلمة المرور الجديدة مطلوبة')
      hasError = true
    } else {
      setNewPasswordError(null)
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('تأكيد كلمة المرور مطلوب')
      hasError = true
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError(settingsCopy.passwordMismatch)
      hasError = true
    } else {
      setConfirmPasswordError(null)
    }

    if (hasError) {
      return
    }

    // Backend endpoint does not exist. Do not fake success or invent endpoints.
    setBlockedNotice(
      'تغيير كلمة المرور غير متاح حاليًا بانتظار دعم الخادم (BE-REQ-AUTHENTICATED-CHANGE-PASSWORD).',
    )
  }

  return (
    <AppSheet
      ariaLabel="تغيير كلمة المرور"
      isOpen={isOpen}
      onRequestClose={handleClose}
      title="تغيير كلمة المرور"
    >
      <form
        className="space-y-5 p-5 pt-14 sm:p-6"
        dir="rtl"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
            تغيير كلمة المرور
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            غيّر كلمة مرور حسابك للحفاظ على أمانه.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          ميزة تغيير كلمة المرور تتطلب دعم الخادم (BE-REQ-AUTHENTICATED-CHANGE-PASSWORD).
        </div>

        <div className="space-y-4">
          <PasswordField
            autoComplete="current-password"
            error={currentPasswordError ?? undefined}
            id="current-password"
            label="كلمة المرور الحالية"
            onChange={(val) => {
              setCurrentPassword(val)
              if (currentPasswordError) setCurrentPasswordError(null)
            }}
            value={currentPassword}
          />

          <PasswordField
            autoComplete="new-password"
            error={newPasswordError ?? undefined}
            id="new-password"
            label="كلمة المرور الجديدة"
            onChange={(val) => {
              setNewPassword(val)
              if (newPasswordError) setNewPasswordError(null)
              if (confirmPassword && val !== confirmPassword) {
                setConfirmPasswordError(settingsCopy.passwordMismatch)
              } else if (confirmPassword && val === confirmPassword) {
                setConfirmPasswordError(null)
              }
            }}
            value={newPassword}
          />

          <PasswordField
            autoComplete="new-password"
            error={confirmPasswordError ?? undefined}
            id="confirm-password"
            label="تأكيد كلمة المرور الجديدة"
            onChange={(val) => {
              setConfirmPassword(val)
              if (val && newPassword && val !== newPassword) {
                setConfirmPasswordError(settingsCopy.passwordMismatch)
              } else {
                setConfirmPasswordError(null)
              }
            }}
            value={confirmPassword}
          />
        </div>

        {blockedNotice ? (
          <p className="rounded-xl bg-[var(--sloty-danger-soft)] p-3 text-xs font-bold text-[var(--sloty-danger)]">
            {blockedNotice}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <AppButton
            onClick={handleClose}
            type="button"
            variant="secondary"
          >
            إلغاء
          </AppButton>
          <AppButton type="submit">
            حفظ كلمة المرور
          </AppButton>
        </div>
      </form>
    </AppSheet>
  )
}
