import type { UpdateManagerPermissionsPayload } from '../../clubUsers.types'

export type ManagerPermissionFieldName = keyof Pick<
  UpdateManagerPermissionsPayload,
  'manager_can_settle_transactions' | 'manager_can_change_pricing'
>

export type ManagerPermissionFieldValues = Required<
  Pick<
    UpdateManagerPermissionsPayload,
    'manager_can_settle_transactions' | 'manager_can_change_pricing'
  >
>

export type ManagerPermissionFieldErrors = Partial<
  Record<ManagerPermissionFieldName, string>
>

export interface ManagerPermissionFieldsProps {
  fieldErrors: ManagerPermissionFieldErrors
  isSubmitting: boolean
  labelClassName?: string
  onChange: (field: ManagerPermissionFieldName, value: boolean) => void
  values: ManagerPermissionFieldValues
}

/**
 * Shared manager membership toggles used by create and edit forms.
 */
export function ManagerPermissionFields({
  fieldErrors,
  isSubmitting,
  labelClassName = 'block space-y-2',
  onChange,
  values,
}: ManagerPermissionFieldsProps) {
  return (
    <>
      <label className={labelClassName}>
        <span className="flex items-start gap-3">
          <input
            checked={values.manager_can_settle_transactions}
            className="mt-1 h-5 w-5 accent-[var(--sloty-primary)]"
            disabled={isSubmitting}
            onChange={(event) =>
              onChange(
                'manager_can_settle_transactions',
                event.target.checked,
              )
            }
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-black text-[var(--sloty-text-primary)]">
              إدارة التسويات المالية والجرد
            </span>
            <span className="mt-1 block text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
              يسمح للمدير بمراجعة التسويات المالية والجرد وإنشاء أو اعتماد التسويات المسموح بها.
            </span>
          </span>
        </span>
        {fieldErrors.manager_can_settle_transactions ? (
          <span className="block text-xs font-bold text-[var(--sloty-danger)]">
            {fieldErrors.manager_can_settle_transactions}
          </span>
        ) : null}
      </label>

      <label className={labelClassName}>
        <span className="flex items-start gap-3">
          <input
            checked={values.manager_can_change_pricing}
            className="mt-1 h-5 w-5 accent-[var(--sloty-primary)]"
            disabled={isSubmitting}
            onChange={(event) =>
              onChange('manager_can_change_pricing', event.target.checked)
            }
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-black text-[var(--sloty-text-primary)]">
              تعديل الأسعار ومواعيد العمل
            </span>
            <span className="mt-1 block text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
              يسمح للمدير بتعديل أسعار الملاعب ومواعيد العمل المرتبطة بها.
            </span>
          </span>
        </span>
        {fieldErrors.manager_can_change_pricing ? (
          <span className="block text-xs font-bold text-[var(--sloty-danger)]">
            {fieldErrors.manager_can_change_pricing}
          </span>
        ) : null}
      </label>
    </>
  )
}
