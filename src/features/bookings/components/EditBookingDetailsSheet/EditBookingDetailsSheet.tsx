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
import { PlayerCombobox } from '../../../players/components/PlayerCombobox/PlayerCombobox'
import { listClubPlayers } from '../../../players/playersApi'
import {
  clubPlayerMatchesPhone,
  getClubPlayerPhone,
} from '../../../players/players.types'
import type { ClubPlayer } from '../../../players/players.types'
import type {
  BookingListItem,
  BookingUpdatePayload,
} from '../../../schedule/scheduleApi.types'

export interface EditBookingDetailsSheetProps {
  booking: BookingListItem
  clubSlug?: string | null
  isSubmitting: boolean
  error: string | null
  fieldErrors?: Record<string, ApiFieldError[]> | null
  onClose: () => void
  onSubmit: (payload: BookingUpdatePayload) => Promise<void>
}

/**
 * Edits booking customer intent and notes. Player search is assistance only:
 * selecting a suggestion fills `customer_name` and `customer_phone`. The sheet
 * never stores or submits ClubPlayer or PlayerProfile IDs.
 */
export function EditBookingDetailsSheet({
  booking,
  clubSlug = undefined,
  error,
  fieldErrors = null,
  isSubmitting,
  onClose,
  onSubmit,
}: EditBookingDetailsSheetProps) {
  const [customerName, setCustomerName] = useState(booking.customer_name ?? '')
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    return getCountryFromPhoneNumber(booking.customer_phone) ?? 'EG'
  })
  const [customerPhone, setCustomerPhone] = useState(
    booking.customer_phone ?? '',
  )
  const [notes, setNotes] = useState(booking.notes ?? '')
  const [playerOptions, setPlayerOptions] = useState<ClubPlayer[]>([])
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false)
  const isNameOverriddenRef = useRef<boolean>(
    Boolean(booking.customer_name?.trim()),
  )
  const autoFilledNameRef = useRef<string | null>(null)
  const phoneSearchSeqRef = useRef<number>(0)
  const phoneSearchTimeoutRef = useRef<number | null>(null)

  const nameFieldError = getFirstFieldErrorMessage(
    fieldErrors,
    'customer_name',
  )
  const phoneFieldError =
    getFirstFieldErrorMessage(fieldErrors, 'customer_phone') ??
    getFirstFieldErrorMessage(fieldErrors, 'phone_number')
  const notesFieldError = getFirstFieldErrorMessage(fieldErrors, 'notes')

  const initialName = booking.customer_name ?? ''
  const initialPhone = booking.customer_phone ?? ''
  const initialNotes = booking.notes ?? ''
  const isDirty =
    customerName !== initialName ||
    customerPhone !== initialPhone ||
    notes !== initialNotes

  useEffect(() => {
    return () => {
      if (phoneSearchTimeoutRef.current) {
        window.clearTimeout(phoneSearchTimeoutRef.current)
      }
    }
  }, [])

  function triggerPhoneSearch(phone: string, country: Country) {
    if (phoneSearchTimeoutRef.current) {
      window.clearTimeout(phoneSearchTimeoutRef.current)
    }

    const currentSeq = ++phoneSearchSeqRef.current
    const trimmedPhone = phone.trim()

    setPlayerOptions([])

    const isPhoneComplete = Boolean(
      clubSlug &&
        trimmedPhone &&
        validatePhoneNumber(trimmedPhone, country, { required: true }).valid,
    )

    if (!isPhoneComplete) {
      setIsSearchingPlayers(false)
      if (!isNameOverriddenRef.current && autoFilledNameRef.current) {
        setCustomerName('')
        autoFilledNameRef.current = null
      }
      return
    }

    setIsSearchingPlayers(true)
    phoneSearchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await listClubPlayers(clubSlug!, {
          search: trimmedPhone,
          order_by: '-last_used_at',
        })

        if (phoneSearchSeqRef.current !== currentSeq) {
          return
        }

        const matchingPlayers = results.filter((player) =>
          clubPlayerMatchesPhone(player, trimmedPhone, country),
        )
        setPlayerOptions(matchingPlayers)

        if (!isNameOverriddenRef.current) {
          if (matchingPlayers.length > 0 && matchingPlayers[0].display_name) {
            const defaultName = matchingPlayers[0].display_name
            setCustomerName(defaultName)
            autoFilledNameRef.current = defaultName
          } else if (autoFilledNameRef.current) {
            setCustomerName('')
            autoFilledNameRef.current = null
          }
        }
      } catch {
        if (phoneSearchSeqRef.current !== currentSeq) {
          return
        }
        setPlayerOptions([])
      } finally {
        if (phoneSearchSeqRef.current === currentSeq) {
          setIsSearchingPlayers(false)
        }
      }
    }, 300)
  }

  function handlePhoneChange(newPhone: string) {
    setCustomerPhone(newPhone)
    setValidationError(null)
    triggerPhoneSearch(newPhone, selectedCountry)
  }

  function handleCountryChange(newCountry: Country) {
    setSelectedCountry(newCountry)
    if (customerPhone) {
      triggerPhoneSearch(customerPhone, newCountry)
    }
  }

  function handleNameChange(newName: string) {
    setCustomerName(newName)
    isNameOverriddenRef.current = true
    setValidationError(null)
  }

  function handleSelectPlayer(player: ClubPlayer) {
    setCustomerName(player.display_name)
    isNameOverriddenRef.current = true
    setValidationError(null)
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

    await onSubmit({
      customer_name: trimmedName,
      customer_phone: normalizedPhone,
      notes: trimmedNotes,
    })
  }

  return (
    <>
      <AppSheet
        title="تعديل بيانات الحجز"
        isOpen
        onRequestClose={requestClose}
      >
        <form className="p-5 text-right" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-1">
            <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
              تقدر تعدل الاسم والموبايل والملاحظات. البحث عن لاعب بيساعد في التعبئة فقط.
            </p>
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
                onCountryChange={handleCountryChange}
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
                disabled={isSubmitting}
                error={Boolean(nameFieldError)}
                isLoading={isSearchingPlayers}
                onChange={handleNameChange}
                onSelectPlayer={handleSelectPlayer}
                playerOptions={playerOptions}
                value={customerName}
              />
            </label>
            {nameFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {nameFieldError}
              </p>
            ) : null}

            <label className="block space-y-2 text-sm font-bold text-[var(--sloty-text-primary)]">
              <span>ملاحظات</span>
              <textarea
                className="sloty-mobile-safe-input min-h-24 w-full resize-none rounded-xl border border-[var(--sloty-border)] bg-white px-3 py-2 font-semibold text-[var(--sloty-text-primary)] outline-none focus:border-[var(--sloty-primary)] focus:ring-2 focus:ring-[var(--sloty-primary)]/20"
                disabled={isSubmitting}
                onChange={(event) => {
                  setNotes(event.target.value)
                  setValidationError(null)
                }}
                placeholder="أضف ملاحظات على الحجز..."
                value={notes}
              />
            </label>
            {notesFieldError ? (
              <p className="-mt-2 text-xs font-bold text-[var(--sloty-danger)]">
                {notesFieldError}
              </p>
            ) : null}
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
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
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
