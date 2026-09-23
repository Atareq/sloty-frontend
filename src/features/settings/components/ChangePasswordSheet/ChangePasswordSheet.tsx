import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { getApiErrorMessage } from '../../../../core/api/apiError.helpers'
import { changePassword } from '../../../../core/auth/authApi'
import { useAuth } from '../../../../core/auth/useAuth'
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
 * On 204 success, clears tokens and redirects to /login.
 */
export function ChangePasswordSheet({
  isOpen,
  onClose,
}: ChangePasswordSheetProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null)
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  function handleClose(): void {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setCurrentPasswordError(null)
    setNewPasswordError(null)
    setConfirmPasswordError(null)
    setError(null)
    setSuccessNotice(null)
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setSuccessNotice(null)

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

    setIsLoading(true)
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccessNotice('تم تغيير كلمة المرور بنجاح')
      handleClose()
      await logout()
      navigate('/login', { replace: true })
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'تعذر تغيير كلمة المرور. حاول مرة أخرى.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppSheet
      title="تغيير كلمة المرور"
      isOpen={isOpen}
      onRequestClose={handleClose}
    >
      <form
        className="space-y-5 p-5 sm:p-6"
        dir="rtl"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            غيّر كلمة مرور حسابك للحفاظ على أمانه.
          </p>
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

        {error ? (
          <p className="rounded-xl bg-[var(--sloty-danger-soft)] p-3 text-xs font-bold text-[var(--sloty-danger)]">
            {error}
          </p>
        ) : null}

        {successNotice ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            {successNotice}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <AppButton
            disabled={isLoading}
            onClick={handleClose}
            type="button"
            variant="secondary"
          >
            إلغاء
          </AppButton>
          <AppButton disabled={isLoading} type="submit">
            {isLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
          </AppButton>
        </div>
      </form>
    </AppSheet>
  )
}
