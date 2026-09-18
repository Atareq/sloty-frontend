import { useState, type FormEvent } from 'react'
import type { Value } from 'react-phone-number-input'
import { Link, useNavigate } from 'react-router'
import { isApiClientError } from '../../../core/api/apiError.helpers'
import { useAuth } from '../../../core/auth/useAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageActions } from '../../../shared/components/PageActions/PageActions'
import { PasswordField } from '../../../shared/components/PasswordField/PasswordField'
import { SlotyPhoneNumberInput } from '../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { settingsCopy } from '../../../shared/copy/appCopy'
import { getPhoneValidationMessage } from '../../../shared/copy/phoneValidation'
import { appRoutes } from '../../../shared/navigation/appRoutes'
import { validatePhoneNumber } from '../../../shared/validation/phone'
import {
  getAdminUserErrorMessage,
  getAdminUserFieldErrors,
} from '../adminUsers.errors'
import { createPlatformAdmin } from '../adminUsersApi'

interface FormValues {
  first_name: string
  last_name: string
  username: string
  phone_number: Value | undefined
  email: string
  password: string
  confirm_password: string
}

type FormField = keyof FormValues
type FormErrors = Partial<Record<FormField, string>>

const initialValues: FormValues = {
  first_name: '',
  last_name: '',
  username: '',
  phone_number: undefined,
  email: '',
  password: '',
  confirm_password: '',
}

function trimOptional(value: string): string | undefined {
  const trimmedValue = value.trim()
  return trimmedValue ? trimmedValue : undefined
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.first_name.trim()) {
    errors.first_name = 'الاسم الأول مطلوب'
  }

  if (!values.username.trim()) {
    errors.username = 'اسم المستخدم مطلوب'
  }

  const phoneValidation = validatePhoneNumber(values.phone_number)

  if (!phoneValidation.valid) {
    errors.phone_number = getPhoneValidationMessage(phoneValidation.error)
  }

  if (!values.password) {
    errors.password = 'كلمة المرور مطلوبة'
  }

  if (!values.confirm_password) {
    errors.confirm_password = 'تأكيد كلمة المرور مطلوب'
  } else if (values.password !== values.confirm_password) {
    errors.confirm_password = settingsCopy.passwordMismatch
  }

  return errors
}

export function AdminUserFormPage() {
  const navigate = useNavigate()
  const { refreshCurrentUser } = useAuth()
  const [values, setValues] = useState<FormValues>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateValue<Key extends keyof FormValues>(
    field: Key,
    value: FormValues[Key],
  ): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const nextFieldErrors = validate(values)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const createdUser = await createPlatformAdmin({
        username: values.username,
        password: values.password,
        first_name: values.first_name,
        last_name: trimOptional(values.last_name),
        email: trimOptional(values.email),
        phone_number: values.phone_number,
      })

      navigate(appRoutes.adminUserDetail(createdUser.id), {
        state: { flashMessage: 'تم إنشاء المستخدم بنجاح.' },
      })
    } catch (caughtError) {
      setFieldErrors(getAdminUserFieldErrors<FormField>(caughtError))
      setError(getAdminUserErrorMessage(caughtError, 'تعذر إنشاء المستخدم'))

      if (isApiClientError(caughtError) && caughtError.status === 403) {
        await refreshCurrentUser()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <PageActions>
        <Link to={appRoutes.adminUsers}>
          <AppButton variant="secondary">إلغاء</AppButton>
        </Link>
      </PageActions>

      {error ? (
        <AppCard>
          <p className="text-sm font-semibold text-[var(--sloty-danger)]">
            {error}
          </p>
        </AppCard>
      ) : null}

      <AppCard className="space-y-4">
        <h2 className="text-base font-black text-[var(--sloty-text-primary)]">
          بيانات مسؤول المنصة
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>الاسم الأول</span>
            <input
              className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('first_name', event.target.value)}
              value={values.first_name}
            />
            {fieldErrors.first_name ? (
              <span className="text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.first_name}
              </span>
            ) : null}
          </label>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>اسم العائلة</span>
            <input
              className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('last_name', event.target.value)}
              value={values.last_name}
            />
            {fieldErrors.last_name ? (
              <span className="text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.last_name}
              </span>
            ) : null}
          </label>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>اسم المستخدم</span>
            <input
              className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('username', event.target.value)}
              value={values.username}
            />
            {fieldErrors.username ? (
              <span className="text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.username}
              </span>
            ) : null}
          </label>

          <div className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
            <span>رقم الهاتف</span>
            <SlotyPhoneNumberInput
              disabled={isSubmitting}
              error={Boolean(fieldErrors.phone_number)}
              onChange={(value) => updateValue('phone_number', value)}
              value={values.phone_number}
            />
            {fieldErrors.phone_number ? (
              <span className="text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.phone_number}
              </span>
            ) : null}
          </div>

          <label className="space-y-2 text-sm font-bold text-[var(--sloty-text-primary)] md:col-span-2">
            <span>البريد الإلكتروني</span>
            <input
              className="sloty-mobile-safe-input h-11 w-full rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 outline-none transition focus:border-[var(--sloty-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--sloty-primary)]/15"
              disabled={isSubmitting}
              onChange={(event) => updateValue('email', event.target.value)}
              type="email"
              value={values.email}
            />
            {fieldErrors.email ? (
              <span className="text-xs font-bold text-[var(--sloty-danger)]">
                {fieldErrors.email}
              </span>
            ) : null}
          </label>

          <PasswordField
            disabled={isSubmitting}
            error={fieldErrors.password}
            label="كلمة المرور"
            onChange={(value) => updateValue('password', value)}
            value={values.password}
          />

          <PasswordField
            disabled={isSubmitting}
            error={fieldErrors.confirm_password}
            label="تأكيد كلمة المرور"
            onChange={(value) => updateValue('confirm_password', value)}
            value={values.confirm_password}
          />
        </div>

        <div className="flex justify-end pt-2">
          <AppButton disabled={isSubmitting} type="submit">
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ المستخدم'}
          </AppButton>
        </div>
      </AppCard>
    </form>
  )
}
