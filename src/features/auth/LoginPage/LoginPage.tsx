import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  getApiErrorMessage,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
} from '../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../core/api/apiClient'
import { loginWithPassword } from '../../../core/auth/authApi'
import { consumeSessionExpiredNotice } from '../../../core/auth/authStorage'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'

interface LoginFormState {
  username: string
  password: string
  clubSlug: string
}

const initialFormState: LoginFormState = {
  username: '',
  password: '',
  clubSlug: '',
}

/**
 * Login screen for Sloty's JWT auth flow.
 *
 * The component owns form state and calls the small auth API wrapper. Token
 * storage and decoding stay inside the auth provider.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formState, setFormState] = useState<LoginFormState>(initialFormState)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<
    string,
    ApiFieldError[]
  > | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const notice = consumeSessionExpiredNotice()

    if (notice) {
      // SessionStorage consume is a mount-only external sync. useState init
      // would drop the notice under StrictMode's double invoke.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consume once after mount
      setError(notice)
    }
  }, [])
  const usernameFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'username') ??
    getFirstFieldErrorMessage(fieldErrors, 'phone_number')
  const passwordFieldError = getFirstFieldErrorMessage(fieldErrors, 'password')

  function updateField(field: keyof LoginFormState, value: string): void {
    setFormState((currentFormState) => ({
      ...currentFormState,
      [field]: value,
    }))
    setFieldErrors(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!formState.username.trim() || !formState.password.trim()) {
      setError('رقم الموبايل أو اسم المستخدم وكلمة المرور مطلوبان')
      setFieldErrors(null)
      return
    }

    setError(null)
    setFieldErrors(null)
    setIsSubmitting(true)

    try {
      const tokens = await loginWithPassword({
        username: formState.username.trim(),
        password: formState.password,
        ...(formState.clubSlug.trim()
          ? { club_slug: formState.clubSlug.trim() }
          : {}),
      })
      login(tokens.access, tokens.refresh)
      navigate('/')
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          'تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى',
        ),
      )
      setFieldErrors(getApiFieldErrors(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-1 py-8">
      <div className="w-full max-w-sm space-y-7">
        <section className="flex flex-col items-center gap-3 text-center">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--sloty-primary)] text-3xl font-black text-white shadow-lg shadow-emerald-900/10"
          >
            س
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-[var(--sloty-text-primary)]">
              سلوتي
            </p>
            <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
              إدارة حجوزات الملاعب بسهولة
            </p>
          </div>
        </section>

        <AppCard className="p-6">
          <div className="mb-5 space-y-1">
            <h1 className="text-xl font-bold text-[var(--sloty-text-primary)]">
              تسجيل الدخول
            </h1>
            <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
              أدخل بيانات حسابك للمتابعة
            </p>
          </div>

          <form className="space-y-5" noValidate onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--sloty-text-primary)]"
                htmlFor="username"
              >
                رقم الموبايل أو اسم المستخدم
              </label>
              <div className="relative">
                <input
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect="off"
                  className="h-12 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 text-right text-base outline-none transition placeholder:text-[var(--sloty-text-muted)] focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  id="username"
                  onChange={(event) =>
                    updateField('username', event.target.value)
                  }
                  placeholder="اسم المستخدم أو رقم الموبايل"
                  spellCheck={false}
                  type="text"
                  value={formState.username}
                />
              </div>
              {usernameFieldError ? (
                <p className="text-xs font-bold text-[var(--sloty-danger)]">
                  {usernameFieldError}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--sloty-text-primary)]"
                htmlFor="password"
              >
                كلمة المرور
              </label>
              <div className="relative">
 
                <input
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 pl-16 pr-5 text-right text-base outline-none transition placeholder:text-[var(--sloty-text-muted)] focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
                  id="password"
                  onChange={(event) =>
                    updateField('password', event.target.value)
                  }
                  placeholder="كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  value={formState.password}
                />
                <button
                  aria-label={
                    showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-1 text-xs font-semibold text-[var(--sloty-text-muted)] transition hover:text-[var(--sloty-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
              {passwordFieldError ? (
                <p className="text-xs font-bold text-[var(--sloty-danger)]">
                  {passwordFieldError}
                </p>
              ) : null}
            </div>
            {error ? (
              <p className="rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-medium text-[var(--sloty-danger)]">
                {error}
              </p>
            ) : null}

            <AppButton disabled={isSubmitting} fullWidth type="submit">
              {isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </AppButton>
          </form>
        </AppCard>

        <p className="text-center text-xs leading-6 text-[var(--sloty-text-muted)]">
          نظام مخصص لإدارة الملاعب والحجوزات
        </p>
      </div>
    </div>
  )
}
