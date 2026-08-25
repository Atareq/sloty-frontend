import { AppButton } from '../AppButton/AppButton'
import { AppSheet } from './AppSheet'

export interface UnsavedChangesPromptProps {
  isOpen: boolean
  onContinueEditing: () => void
  onDiscard: () => void
}

/** Small shared confirmation used when dismissing a dirty feature form. */
export function UnsavedChangesPrompt({
  isOpen,
  onContinueEditing,
  onDiscard,
}: UnsavedChangesPromptProps) {
  return (
    <AppSheet
      ariaLabel="تأكيد الخروج من النموذج"
      className="md:max-w-sm"
      isOpen={isOpen}
      onRequestClose={onContinueEditing}
    >
      <div className="p-5 pt-14">
        <p className="text-lg font-black text-[var(--sloty-text-primary)]">
          عندك تعديلات لسه متحفظتش.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <AppButton fullWidth onClick={onContinueEditing} type="button">
            كمل التعديل
          </AppButton>
          <AppButton
            fullWidth
            onClick={onDiscard}
            type="button"
            variant="danger"
          >
            اخرج من غير حفظ
          </AppButton>
        </div>
      </div>
    </AppSheet>
  )
}
