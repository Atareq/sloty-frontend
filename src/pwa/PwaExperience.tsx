import { useState, type ReactNode } from 'react'
import { AppButton } from '../shared/components/AppButton/AppButton'
import { usePwa } from './pwaContext'
import type { PwaInstallKind, PwaInstallOutcome } from './pwaInstall'

interface PwaNoticeShellProps {
  children: ReactNode
  label: string
}

function PwaNoticeShell({ children, label }: PwaNoticeShellProps) {
  return (
    <section
      aria-label={label}
      className="fixed inset-x-4 bottom-4 z-[45] mx-auto max-w-md rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-surface)] p-4 shadow-2xl"
    >
      {children}
    </section>
  )
}

export interface PwaInstallNoticeProps {
  installKind: PwaInstallKind
  onDismiss: () => void
  onInstall: () => Promise<PwaInstallOutcome | null>
}

/** Safe Task-1 install copy without promises about offline business data. */
export function PwaInstallNotice({
  installKind,
  onDismiss,
  onInstall,
}: PwaInstallNoticeProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)

  async function handleInstall(): Promise<void> {
    setErrorMessage(null)
    setIsInstalling(true)

    try {
      await onInstall()
    } catch {
      setErrorMessage('تعذر فتح التثبيت دلوقتي. حاول مرة تانية.')
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <PwaNoticeShell label="تثبيت Sloty">
      {installKind === 'ios' ? (
        <>
          <p className="text-base font-black text-[var(--sloty-text-primary)]">
            لتثبيت Sloty على الآيفون:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pr-5 text-sm font-semibold text-[var(--sloty-text-muted)]">
            <li>افتح قائمة المشاركة</li>
            <li>اختار &quot;إضافة إلى الشاشة الرئيسية&quot;</li>
          </ol>
        </>
      ) : (
        <>
          <p className="text-base font-black text-[var(--sloty-text-primary)]">
            ثبّت Sloty على الموبايل
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--sloty-text-muted)]">
            افتح Sloty أسرع من الشاشة الرئيسية.
          </p>
        </>
      )}

      {errorMessage ? (
        <p className="mt-3 text-sm font-semibold text-[var(--sloty-danger)]" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {installKind === 'chromium' ? (
          <AppButton disabled={isInstalling} onClick={() => void handleInstall()}>
            {isInstalling ? 'جاري فتح التثبيت...' : 'تثبيت Sloty'}
          </AppButton>
        ) : null}
        <AppButton onClick={onDismiss} variant="secondary">
          مش دلوقتي
        </AppButton>
      </div>
    </PwaNoticeShell>
  )
}

export interface PwaUpdateNoticeProps {
  onLater: () => void
  onUpdate: () => Promise<void>
}

/** A waiting worker is activated only after the user chooses to update. */
export function PwaUpdateNotice({ onLater, onUpdate }: PwaUpdateNoticeProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleUpdate(): Promise<void> {
    setErrorMessage(null)
    setIsUpdating(true)

    try {
      await onUpdate()
    } catch {
      setErrorMessage('تعذر تطبيق التحديث دلوقتي. حاول مرة تانية.')
      setIsUpdating(false)
    }
  }

  return (
    <PwaNoticeShell label="تحديث Sloty">
      <p className="text-base font-black text-[var(--sloty-text-primary)]">
        في تحديث جديد لـ Sloty
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <AppButton disabled={isUpdating} onClick={() => void handleUpdate()}>
          {isUpdating ? 'جاري التحديث...' : 'تحديث الآن'}
        </AppButton>
        <AppButton disabled={isUpdating} onClick={onLater} variant="secondary">
          لاحقًا
        </AppButton>
      </div>
      {errorMessage ? (
        <p className="mt-3 text-sm font-semibold text-[var(--sloty-danger)]" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </PwaNoticeShell>
  )
}

export interface PwaExperienceProps {
  isInteractionBlocked?: boolean
}

/** Global install/update surface, kept outside every business feature. */
export function PwaExperience({
  isInteractionBlocked = false,
}: PwaExperienceProps) {
  const {
    applyUpdate,
    dismissInstall,
    installKind,
    postponeUpdate,
    promptInstall,
    updateAvailable,
  } = usePwa()

  if (isInteractionBlocked) {
    return null
  }

  if (updateAvailable) {
    return (
      <PwaUpdateNotice
        onLater={postponeUpdate}
        onUpdate={applyUpdate}
      />
    )
  }

  return installKind ? (
    <PwaInstallNotice
      installKind={installKind}
      onDismiss={dismissInstall}
      onInstall={promptInstall}
    />
  ) : null
}
