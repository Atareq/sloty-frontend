import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { usePlaceholderAuth } from '../../../core/auth/usePlaceholderAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'

interface LoginFormState {
  username: string
  password: string
}

const initialFormState: LoginFormState = {
  username: '',
  password: '',
}

/**
 * Login skeleton for the frontend foundation.
 *
 * This page owns local form state and required-field validation only. It does
 * not call a backend or define the final Sloty authentication contract.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const { login } = usePlaceholderAuth()
  const [formState, setFormState] = useState<LoginFormState>(initialFormState)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof LoginFormState, value: string): void {
    setFormState((currentFormState) => ({
      ...currentFormState,
      [field]: value,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!formState.username.trim() || !formState.password.trim()) {
      setError('رقم الموبايل أو اسم المستخدم وكلمة المرور مطلوبان')
      return
    }

    setError(null)
    login('sloty-placeholder-access-token')
    navigate('/dashboard')
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-md space-y-5">
        <PageHeader
          description="واجهة تأسيسية فقط حتى يتم اعتماد عقد تسجيل الدخول الحقيقي."
          title="تسجيل الدخول"
        />

        <AppCard>
          <form className="space-y-5" noValidate onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--sloty-text-primary)]"
                htmlFor="username"
              >
                رقم الموبايل أو اسم المستخدم
              </label>
              <input
                autoComplete="username"
                className="h-12 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-base outline-none transition focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                id="username"
                inputMode="tel"
                onChange={(event) => updateField('username', event.target.value)}
                type="text"
                value={formState.username}
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--sloty-text-primary)]"
                htmlFor="password"
              >
                كلمة المرور
              </label>
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-xl border border-[var(--sloty-border)] bg-white px-3 text-base outline-none transition focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                id="password"
                onChange={(event) => updateField('password', event.target.value)}
                type="password"
                value={formState.password}
              />
            </div>

            {error ? (
              <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-medium text-[var(--sloty-danger)]">
                {error}
              </p>
            ) : null}

            <AppButton fullWidth type="submit">
              دخول تجريبي
            </AppButton>
          </form>
        </AppCard>
      </div>
    </div>
  )
}
