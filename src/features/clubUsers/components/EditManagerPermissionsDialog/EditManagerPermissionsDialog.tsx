import { useMemo, useState, type FormEvent } from 'react'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import type { UpdateManagerPermissionsPayload } from '../../clubUsers.types'
import { ManagerPermissionFields } from '../ManagerPermissionFields/ManagerPermissionFields'

export interface EditManagerPermissionsDialogProps {
  fieldErrors: Partial<Record<keyof UpdateManagerPermissionsPayload, string>>
  generalError: string | null
  identity: string
  initialValues: Required<UpdateManagerPermissionsPayload>
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: UpdateManagerPermissionsPayload) => Promise<void>
}

/**
 * Shared manager permission editor for membership-scoped permission PATCHes.
 */
export function EditManagerPermissionsDialog({
  fieldErrors,
  generalError,
  identity,
  initialValues,
  isSubmitting,
  onClose,
  onSubmit,
}: EditManagerPermissionsDialogProps) {
  const stableInitialValues = useMemo(() => initialValues, [initialValues])
  const [values, setValues] = useState(stableInitialValues)

  function updateValue(
    field: keyof UpdateManagerPermissionsPayload,
    value: boolean,
  ): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center"
      role="dialog"
    >
      <form
        className="w-full max-w-lg space-y-4 rounded-2xl bg-[var(--sloty-surface)] p-4 shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-black text-[var(--sloty-text-primary)]">
            تعديل صلاحيات المدير
          </h2>
          <p className="text-sm font-bold text-[var(--sloty-text-muted)]">
            {identity} · مدير
          </p>
        </div>

        {generalError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
            {generalError}
          </p>
        ) : null}

        <ManagerPermissionFields
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          labelClassName="block space-y-2 rounded-xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] p-3"
          onChange={updateValue}
          values={values}
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <AppButton disabled={isSubmitting} fullWidth type="submit">
            حفظ الصلاحيات
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            fullWidth
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            إلغاء
          </AppButton>
        </div>
      </form>
    </div>
  )
}
