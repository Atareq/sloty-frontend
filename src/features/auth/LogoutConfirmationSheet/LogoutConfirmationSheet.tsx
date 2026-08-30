import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../shared/components/AppSheet/AppSheet'

export interface LogoutConfirmationSheetProps {
  isOpen: boolean
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Confirms the explicit logout that securely removes local operational data. */
export function LogoutConfirmationSheet({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: LogoutConfirmationSheetProps) {
  return (
    <AppSheet
      isOpen={isOpen}
      onRequestClose={() => {
        if (!isSubmitting) {
          onCancel()
        }
      }}
      title="تسجيل الخروج؟"
    >
      <div className="space-y-5 px-5 pb-6 pt-14 sm:px-6">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[var(--sloty-text-primary)]">
            تسجيل الخروج؟
          </h2>
          <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
            البيانات المحفوظة على الجهاز للاستخدام بدون إنترنت هتتمسح.
          </p>
          <p className="text-sm leading-7 text-[var(--sloty-text-muted)]">
            هتحتاج اتصال بالإنترنت أول مرة تسجل دخول بعدها.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AppButton
            disabled={isSubmitting}
            onClick={onCancel}
            variant="secondary"
          >
            رجوع
          </AppButton>
          <AppButton
            disabled={isSubmitting}
            onClick={onConfirm}
            variant="danger"
          >
            {isSubmitting ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
          </AppButton>
        </div>
      </div>
    </AppSheet>
  )
}
