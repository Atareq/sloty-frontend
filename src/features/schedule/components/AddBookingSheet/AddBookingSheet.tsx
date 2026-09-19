import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Country } from 'react-phone-number-input'
import {
  getFirstFieldErrorMessage,
} from '../../../../core/api/apiError.helpers'
import type { ApiFieldError } from '../../../../core/api/apiClient'
import { AppButton } from '../../../../shared/components/AppButton/AppButton'
import { AppSheet } from '../../../../shared/components/AppSheet/AppSheet'
import { UnsavedChangesPrompt } from '../../../../shared/components/AppSheet/UnsavedChangesPrompt'
import { SlotyPhoneNumberInput } from '../../../../shared/components/PhoneNumberInput/PhoneNumberInput'
import { customerCopy } from '../../../../shared/copy/appCopy'
import { getPhoneValidationMessage } from '../../../../shared/copy/phoneValidation'
import {
  getCountryFromPhoneNumber,
  normalizeSlotyPhoneNumber,
  validatePhoneNumber,
} from '../../../../shared/validation/phone'
import { formatMoneyAmount } from '../../../../shared/utils/money'
import { formatArabicDateTime } from '../../../../shared/utils/date'
import { formatTime12Hour } from '../../scheduleBoard.helpers'
import { PlayerCombobox } from '../../../players/components/PlayerCombobox/PlayerCombobox'
import { listClubPlayers } from '../../../players/playersApi'
import {
  arePhoneNumbersMatching,
  getClubPlayerPhone,
  type ClubPlayer,
} from '../../../players/players.types'

export interface AddBookingSheetValues {
  customer_name: string
  customer_phone: string
  club_player_id?: number
  is_recurring: boolean
  notes?: string
}

export interface AddBookingSheetProps {
  clubSlug?: string | null
  courtName: string
  dateLabel: string
  startTime: string
  endTime: string
  isSubmitting: boolean
  initialValues?: AddBookingSheetValues
  offlineIntentMode?: boolean
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  slotPrice?: string | null
  canStartRecurring?: boolean | null
  recurringBlockedReason?: string | null
  firstRecurringConflictStart?: string | null
  title?: string
  onClose: () => void
  onSubmit: (values: AddBookingSheetValues) => Promise<void>
}

function getRecurringBlockedMessage(
  reason: string | null,
  conflictStart: string | null,
): string | null {
  if (reason === 'ACTIVE_RECURRENCE') {
    return 'الموعد ده مثبت أسبوعيًا لعميل آخر.'
  }

  if (reason !== 'FUTURE_CONFLICT') {
    return null
  }

  const conflictDate = formatArabicDateTime(conflictStart)

  return conflictDate
    ? `فيه حجز آخر يوم ${conflictDate}.`
    : 'فيه حجز آخر بيتعارض مع تثبيت الموعد أسبوعيًا.'
}

/**
 * Quick manual booking sheet for available/cancelled Booking Board slots.
 *
 * Weekly recurrence is one optional Booking field; final validation remains
 * authoritative in the Booking create endpoint.
 */
export function AddBookingSheet({
  canStartRecurring = null,
  clubSlug = undefined,
  courtName,
  dateLabel,
  endTime,
  error,
  fieldErrors = null,
  firstRecurringConflictStart = null,
  initialValues = undefined,
  isSubmitting,
  offlineIntentMode = false,
  onClose,
  onSubmit,
  recurringBlockedReason = null,
  slotPrice = null,
  startTime,
  title = 'حجز جديد',
}: AddBookingSheetProps) {
  const [isRecurring, setIsRecurring] = useState(
    initialValues?.is_recurring ?? false,
  )
  const [customerName, setCustomerName] = useState(
    initialValues?.customer_name ?? '',
  )
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    return getCountryFromPhoneNumber(initialValues?.customer_phone) ?? 'EG'
  })
  const [customerPhone, setCustomerPhone] = useState(
    initialValues?.customer_phone ?? '',
  )
  const [selectedPlayer, setSelectedPlayer] = useState<ClubPlayer | null>(null)
  const [playerOptions, setPlayerOptions] = useState<ClubPlayer[]>([])
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false)
  const phoneSearchTimeoutRef = useRef<number | null>(null)

  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const nameFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'customer_name',
  )
  const playerFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'club_player_id',
  )
  const phoneFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'customer_phone') ??
    getFirstFieldErrorMessage(fieldErrors, 'phone_number')
  const isRecurringBlocked = canStartRecurring !== true
  const recurringBlockedMessage = getRecurringBlockedMessage(
    recurringBlockedReason,
    firstRecurringConflictStart,
  )
  const recurringHelperText = offlineIntentMode
    ? canStartRecurring === true
      ? 'التثبيت الأسبوعي متاح طبقًا لآخر تحديث وسيتم التأكد منه عند رجوع الإنترنت.'
      : canStartRecurring === false
        ? 'غير متاح تثبيت الموعد لهذا الحجز طبقًا لآخر تحديث.'
        : 'التثبيت الأسبوعي يحتاج إنترنت أو تحديث حديث للمعاد قبل حفظ الطلب.'
    : canStartRecurring === null
      ? 'التثبيت الأسبوعي يحتاج تحديث حديث للمعاد من السيرفر قبل اختياره.'
      : isRecurringBlocked
        ? 'غير متاح تثبيت الموعد لهذا الحجز.'
        : 'هنطلب من السيرفر تثبيت نفس اليوم والساعة للعميل كل أسبوع.'
  const submitLabel = offlineIntentMode ? 'احفظ طلب الحجز' : 'تأكيد الحجز'
  const submittingLabel = offlineIntentMode
    ? 'جاري حفظ الطلب...'
    : 'جاري الحجز...'

  const displayStartTime = formatTime12Hour(startTime)
  const displayEndTime = formatTime12Hour(endTime)
  const initialName = initialValues?.customer_name ?? ''
  const initialPhone = initialValues?.customer_phone ?? ''
  const initialNotes = initialValues?.notes ?? ''
  const initialRecurring = initialValues?.is_recurring ?? false
  const isDirty =
    isRecurring !== initialRecurring ||
    customerName !== initialName ||
    customerPhone !== initialPhone ||
    notes !== initialNotes

  // Clean up pending debounce search timeout on unmount
  useEffect(() => {
    return () => {
      if (phoneSearchTimeoutRef.current) {
        window.clearTimeout(phoneSearchTimeoutRef.current)
      }
    }
  }, [])

  function handlePhoneChange(newPhone: string) {
    setCustomerPhone(newPhone)

    // Clear selected player if phone no longer matches the selected player
    if (selectedPlayer) {
      const playerPhone = getClubPlayerPhone(selectedPlayer)
      if (!arePhoneNumbersMatching(newPhone, playerPhone, selectedCountry)) {
        setSelectedPlayer(null)
      }
    }

    if (phoneSearchTimeoutRef.current) {
      window.clearTimeout(phoneSearchTimeoutRef.current)
    }

    const trimmedPhone = newPhone.trim()
    if (!clubSlug || trimmedPhone.length < 3) {
      setPlayerOptions([])
      setIsSearchingPlayers(false)
      return
    }

    setIsSearchingPlayers(true)
    phoneSearchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await listClubPlayers(clubSlug, {
          search: trimmedPhone,
          order_by: '-last_used_at',
        })
        setPlayerOptions(results)
        if (results.length > 0) {
          // Default to latest used player name from Backend
          setCustomerName(results[0].display_name)
          setSelectedPlayer(results[0])
        }
      } catch {
        setPlayerOptions([])
      } finally {
        setIsSearchingPlayers(false)
      }
    }, 300)
  }

  function handleNameChange(newName: string) {
    setCustomerName(newName)
    if (selectedPlayer && selectedPlayer.display_name !== newName) {
      setSelectedPlayer(null)
    }
  }

  function handleSelectPlayer(player: ClubPlayer) {
    setSelectedPlayer(player)
    setCustomerName(player.display_name)
    const playerPhone = getClubPlayerPhone(player)
    if (playerPhone) {
      setCustomerPhone(playerPhone)
      const country = getCountryFromPhoneNumber(playerPhone)
      if (country) {
        setSelectedCountry(country)
      }
    }
  }

  function requestClose(): boolean | void {
    if (isDirty) {
      setIsDiscardPromptOpen(true)
      return false
    }

    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = customerName.trim()
    const trimmedNotes = notes.trim()
    const phoneValidation = validatePhoneNumber(
      customerPhone,
      selectedCountry,
      { required: true },
    )

    if (!trimmedName) {
      setValidationError(customerCopy.customerNameRequired)
      return
    }

    if (!phoneValidation.valid) {
      setValidationError(getPhoneValidationMessage(phoneValidation.error))
      return
    }

    const normalizedPhone = normalizeSlotyPhoneNumber(
      customerPhone,
      selectedCountry,
    )

    if (!normalizedPhone) {
      setValidationError(getPhoneValidationMessage('INVALID_PHONE'))
      return
    }

    setValidationError(null)

    const values: AddBookingSheetValues = {
      customer_name: trimmedName,
      customer_phone: normalizedPhone,
      club_player_id:
        selectedPlayer &&
        arePhoneNumbersMatching(
          customerPhone,
          getClubPlayerPhone(selectedPlayer),
          selectedCountry,
        )
          ? selectedPlayer.id
          : undefined,
      is_recurring: isRecurring,
      notes: trimmedNotes || undefined,
    }

    await onSubmit(values)
  }

  return (
    <>
      <AppSheet ariaLabel="حجز جديد" onRequestClose={requestClose}>
        <form className="p-5 pt-14" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--sloty-text-primary)]">
              {title}
            </h2>
            <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
              {courtName} - {dateLabel}
            </p>
            <p
              className="text-lg font-black text-[var(--sloty-primary-dark)]"
              dir="ltr"
            >
              {displayStartTime} - {displayEndTime}
            </p>
            {slotPrice ? (
              <p className="text-sm font-black text-[var(--sloty-primary-dark)]">
                السعر {formatMoneyAmount(slotPrice)}
              </p>
            ) : null}
            {offlineIntentMode ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900">
                هنحاول نأكد الحجز تلقائيًا أول ما الإنترنت يرجع.
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            <div className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>{customerCopy.mobileNumber}</span>

              <SlotyPhoneNumberInput
                country={selectedCountry}
                disabled={isSubmitting}
                error={
                  validationError === getPhoneValidationMessage('INVALID_PHONE') ||
                  Boolean(phoneFieldError)
                }
                onChange={handlePhoneChange}
                onCountryChange={setSelectedCountry}
                raw
                value={customerPhone}
              />
            </div>
            {phoneFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {phoneFieldError}
              </p>
            ) : null}

            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>{customerCopy.playerName}</span>
              <PlayerCombobox
                clubSlug={clubSlug}
                disabled={isSubmitting}
                error={Boolean(nameFieldError) || Boolean(playerFieldError)}
                isLoading={isSearchingPlayers}
                onChange={handleNameChange}
                onSelectPlayer={handleSelectPlayer}
                playerOptions={playerOptions}
                value={customerName}
              />
            </label>
            {nameFieldError || playerFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {nameFieldError ?? playerFieldError}
              </p>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--sloty-border)] bg-[var(--sloty-bg)] px-3 py-3 text-[var(--sloty-text-primary)]">
              <input
                checked={isRecurring}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--sloty-primary)]"
                disabled={isSubmitting || isRecurringBlocked}
                onChange={(event) => {
                  setIsRecurring(event.target.checked)
                  setValidationError(null)
                }}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-black">
                  ثبّت نفس الموعد كل أسبوع
                </span>
                <span className="mt-1 block text-xs font-bold leading-5 text-[var(--sloty-text-muted)]">
                  {recurringHelperText}
                </span>
                {isRecurringBlocked && recurringBlockedMessage ? (
                  <span className="mt-1 block text-xs font-bold leading-5 text-amber-800">
                    {recurringBlockedMessage}
                  </span>
                ) : null}
              </span>
            </label>

            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>ملاحظات</span>
              <textarea
                className="sloty-mobile-safe-input min-h-20 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                disabled={isSubmitting}
                onChange={(event) => setNotes(event.target.value)}
                value={notes}
              />
            </label>
          </div>

          {validationError || error ? (
            <p className="mt-4 rounded-xl bg-[var(--sloty-danger-soft)] px-3 py-2 text-sm font-bold text-[var(--sloty-danger)]">
              {validationError ?? error}
            </p>
          ) : null}

          <div className="mt-5">
            <AppButton
              disabled={isSubmitting}
              fullWidth
              type="submit"
              variant="primary"
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </AppButton>
          </div>
        </form>
      </AppSheet>
      <UnsavedChangesPrompt
        isOpen={isDiscardPromptOpen}
        onContinueEditing={() => setIsDiscardPromptOpen(false)}
        onDiscard={() => {
          setIsDiscardPromptOpen(false)
          onClose()
        }}
      />
    </>
  )
}
