import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../core/api/apiClient'
import { getClub, updateClub } from '../../clubs/clubsApi'
import type { Club } from '../../clubs/clubs.types'
import {
  createCourt,
  getCourt,
  listCourtImages,
  replaceCourtPrimaryImage,
  updateCourt,
} from '../courtsApi'
import type { Court, CourtImage } from '../courts.types'
import { CourtFormPage } from './CourtFormPage'

vi.mock('../courtsApi', () => ({
  createCourt: vi.fn(),
  getCourt: vi.fn(),
  listCourtImages: vi.fn(),
  replaceCourtPrimaryImage: vi.fn(),
  updateCourt: vi.fn(),
}))

vi.mock('../../clubs/clubsApi', () => ({
  getClub: vi.fn(),
  updateClub: vi.fn(),
}))

vi.mock('../components/CourtWorkingHoursSection/CourtWorkingHoursSection', () => ({
  CourtWorkingHoursSection: () => null,
}))

const mockedCreateCourt = vi.mocked(createCourt)
const mockedGetCourt = vi.mocked(getCourt)
const mockedListCourtImages = vi.mocked(listCourtImages)
const mockedReplaceCourtPrimaryImage = vi.mocked(replaceCourtPrimaryImage)
const mockedUpdateCourt = vi.mocked(updateCourt)
const mockedGetClub = vi.mocked(getClub)
const mockedUpdateClub = vi.mocked(updateClub)

const parentClub: Club = {
  id: 1,
  name: 'نادي النصر',
  slug: 'nasr',
  governorate: 'CAIRO',
  city: 'NASR_CITY',
  phone_number: '+201012345678',
  is_active: true,
}

const savedCourt: Court = {
  id: 7,
  club: 1,
  name: 'ملعب النخيل',
  sport_type: 'FOOTBALL',
  minimum_deposit: '100',
  cancellation_refund_notice_days: 3,
  slot_duration_minutes: 60,
  is_active: true,
  requires_digital_payment_reference: false,
  internal_hold_expiry_hours: 12,
}

function courtImage(id: number): CourtImage {
  return {
    id,
    position: 0,
    image: {
      id: id + 100,
      display_url: `https://images.sloty.test/images/${id}/display.webp`,
      thumbnail_url: `https://images.sloty.test/images/${id}/thumbnail.webp`,
      width: 1200,
      height: 800,
    },
  }
}

const selectedFile = new File(['court'], 'court.png', { type: 'image/png' })

function renderCourtForm(initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          element={<CourtFormPage />}
          path="/admin/clubs/:clubSlug/courts/new"
        />
        <Route
          element={<CourtFormPage />}
          path="/admin/clubs/:clubSlug/courts/:courtId"
        />
        <Route element={<p>تم الحفظ</p>} path="/admin/clubs/:clubSlug/courts" />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillRequiredCreateFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('اسم الملعب'), 'ملعب النخيل')
  await user.type(screen.getByLabelText(/الحد الأدنى للعربون/), '100')
}

describe('CourtFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn(() => 'blob:court-image-preview')
    window.URL.revokeObjectURL = vi.fn()
    mockedCreateCourt.mockResolvedValue(savedCourt)
    mockedUpdateCourt.mockResolvedValue(savedCourt)
    mockedGetClub.mockResolvedValue(parentClub)
    mockedUpdateClub.mockResolvedValue(parentClub)
    mockedGetCourt.mockResolvedValue(savedCourt)
    mockedListCourtImages.mockResolvedValue([])
    mockedReplaceCourtPrimaryImage.mockResolvedValue(courtImage(9))
  })

  it('uses human policy wording while preserving backend payload fields', async () => {
    const user = userEvent.setup()

    renderCourtForm('/admin/clubs/nasr/courts/new')

    expect(screen.getByText('مدة انتظار الحجز بدون العربون')).toBeInTheDocument()
    expect(
      screen.getByText(
        'لو العربون متدفعش خلال المدة دي، الحجز هيتلغي تلقائيًا.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('سياسة استرداد التأمين')).toBeInTheDocument()
    const refundField = screen.getByText('سياسة استرداد التأمين').closest('label')
    expect(within(refundField!).getByText('أيام')).toBeInTheDocument()
    expect(screen.queryByText('internal_hold_expiry_hours')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('سعر الفترة الواحده')).not.toBeInTheDocument()

    await fillRequiredCreateFields(user)
    await user.type(screen.getByLabelText(/سياسة استرداد التأمين/), '3')
    expect(
      screen.getByText('يسترد العميل التأمين عند الإلغاء قبل الموعد بـ 3 أيام'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    await waitFor(() => {
      expect(mockedCreateCourt).toHaveBeenCalledWith(
        'nasr',
        expect.objectContaining({
          internal_hold_expiry_hours: 12,
          cancellation_refund_notice_days: 3,
        }),
      )
    })
    expect(await screen.findByText('تم الحفظ')).toBeInTheDocument()
    expect(mockedReplaceCourtPrimaryImage).not.toHaveBeenCalled()
  })

  it('loads the Club phone by route slug and saves it before a phone-free Court create', async () => {
    const user = userEvent.setup()

    renderCourtForm('/admin/clubs/nasr/courts/new')

    const clubPhoneInput = await screen.findByLabelText('رقم هاتف النادي')
    await waitFor(() => {
      expect(clubPhoneInput).toHaveValue('010 12345678')
    })
    expect(mockedGetClub).toHaveBeenCalledWith('nasr')

    await user.clear(clubPhoneInput)
    await user.type(clubPhoneInput, '01098765432')
    await fillRequiredCreateFields(user)
    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    await waitFor(() => {
      expect(mockedUpdateClub).toHaveBeenCalledWith(1, {
        phone_number: '+201098765432',
      })
      expect(mockedCreateCourt).toHaveBeenCalledWith(
        'nasr',
        expect.not.objectContaining({ phone_number: expect.anything() }),
      )
    })
    expect(
      mockedUpdateClub.mock.invocationCallOrder[0],
    ).toBeLessThan(mockedCreateCourt.mock.invocationCallOrder[0])
  })

  it('does not save either resource when the Club phone is invalid', async () => {
    const user = userEvent.setup()

    renderCourtForm('/admin/clubs/nasr/courts/new')

    const clubPhoneInput = await screen.findByLabelText('رقم هاتف النادي')
    await waitFor(() => {
      expect(clubPhoneInput).toHaveValue('010 12345678')
    })
    await user.clear(clubPhoneInput)
    await user.type(clubPhoneInput, '123')
    await fillRequiredCreateFields(user)
    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    expect(await screen.findByText('رقم الموبايل غير صحيح')).toBeInTheDocument()
    expect(mockedUpdateClub).not.toHaveBeenCalled()
    expect(mockedCreateCourt).not.toHaveBeenCalled()
  })

  it('stops before the Court save when the Club phone update fails', async () => {
    const user = userEvent.setup()
    mockedUpdateClub.mockRejectedValueOnce(new Error('club update unavailable'))

    renderCourtForm('/admin/clubs/nasr/courts/new')

    const clubPhoneInput = await screen.findByLabelText('رقم هاتف النادي')
    await waitFor(() => {
      expect(clubPhoneInput).toHaveValue('010 12345678')
    })
    await user.clear(clubPhoneInput)
    await user.type(clubPhoneInput, '01098765432')
    await fillRequiredCreateFields(user)
    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    await waitFor(() => {
      expect(mockedUpdateClub).toHaveBeenCalledWith(1, {
        phone_number: '+201098765432',
      })
    })
    expect(mockedCreateCourt).not.toHaveBeenCalled()
  })

  it('renders a Club phone field error directly below the Club phone input', async () => {
    const user = userEvent.setup()
    mockedUpdateClub.mockRejectedValueOnce(
      new ApiClientError('يرجى مراجعة البيانات المدخلة.', 400, {
        code: 'VALIDATION_ERROR',
        fieldErrors: {
          phone_number: [
            { code: 'invalid', message: 'رقم هاتف النادي غير صالح.' },
          ],
        },
      }),
    )

    renderCourtForm('/admin/clubs/nasr/courts/new')

    const clubPhoneInput = await screen.findByLabelText('رقم هاتف النادي')
    await waitFor(() => {
      expect(clubPhoneInput).toHaveValue('010 12345678')
    })
    await user.clear(clubPhoneInput)
    await user.type(clubPhoneInput, '01098765432')
    await fillRequiredCreateFields(user)
    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    const phoneError = await screen.findByText('رقم هاتف النادي غير صالح.')

    expect(clubPhoneInput.parentElement?.parentElement).toContainElement(
      phoneError,
    )
    expect(mockedCreateCourt).not.toHaveBeenCalled()
  })

  describe('صورة الملعب', () => {
    it('renders a native image file input with helper text in create mode', () => {
      renderCourtForm('/admin/clubs/nasr/courts/new')

      const imageInput = screen.getByLabelText('صورة الملعب')

      expect(imageInput).toHaveAttribute('type', 'file')
      expect(imageInput).toHaveAttribute('accept', 'image/*')
      expect(imageInput).not.toHaveAttribute('multiple')
      expect(imageInput).toHaveAccessibleDescription('اختر صورة واضحة للملعب')
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('creates the Court as before, then uploads the selected image for the new Court', async () => {
      const user = userEvent.setup()

      renderCourtForm('/admin/clubs/nasr/courts/new')

      await fillRequiredCreateFields(user)
      await user.upload(screen.getByLabelText('صورة الملعب'), selectedFile)

      expect(
        screen.getByRole('img', { name: 'الصورة الجديدة للملعب' }),
      ).toHaveAttribute('src', 'blob:court-image-preview')

      await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

      expect(await screen.findByText('تم الحفظ')).toBeInTheDocument()
      expect(mockedCreateCourt).toHaveBeenCalledTimes(1)
      const [, payload] = mockedCreateCourt.mock.calls[0]
      expect(payload).not.toHaveProperty('image')
      expect(payload).toEqual(
        expect.objectContaining({
          name: 'ملعب النخيل',
          sport_type: 'FOOTBALL',
          minimum_deposit: '100',
          slot_duration_minutes: 60,
          internal_hold_expiry_hours: 12,
        }),
      )
      expect(mockedReplaceCourtPrimaryImage).toHaveBeenCalledWith(
        'nasr',
        7,
        selectedFile,
      )
      expect(
        mockedCreateCourt.mock.invocationCallOrder[0],
      ).toBeLessThan(mockedReplaceCourtPrimaryImage.mock.invocationCallOrder[0])
    })

    it('moves to the created Court edit page with the image error when the upload fails, so a retry cannot duplicate the Court', async () => {
      const user = userEvent.setup()
      mockedReplaceCourtPrimaryImage.mockRejectedValueOnce(
        new ApiClientError('حجم الصورة أكبر من المسموح.', 400, {
          code: 'IMAGE_UPLOAD_TOO_LARGE',
        }),
      )

      renderCourtForm('/admin/clubs/nasr/courts/new')

      await fillRequiredCreateFields(user)
      await user.upload(screen.getByLabelText('صورة الملعب'), selectedFile)
      await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

      await waitFor(() => {
        expect(mockedGetCourt).toHaveBeenCalledWith('nasr', '7')
      })
      expect(mockedCreateCourt).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('تم الحفظ')).not.toBeInTheDocument()
      expect(
        await screen.findByText(
          'تم حفظ بيانات الملعب، لكن تعذر رفع الصورة. حجم الصورة أكبر من المسموح.',
        ),
      ).toBeInTheDocument()
    })

    it('shows an image error carried in navigation state when the edit page mounts fresh', async () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/admin/clubs/nasr/courts/7',
              state: { courtImageError: 'تم حفظ بيانات الملعب، لكن تعذر رفع الصورة. حاول مرة أخرى.' },
            },
          ]}
        >
          <Routes>
            <Route
              element={<CourtFormPage />}
              path="/admin/clubs/:clubSlug/courts/:courtId"
            />
          </Routes>
        </MemoryRouter>,
      )

      expect(
        await screen.findByText(
          'تم حفظ بيانات الملعب، لكن تعذر رفع الصورة. حاول مرة أخرى.',
        ),
      ).toBeInTheDocument()
    })

    it('shows the current image preview and leaves it untouched when saving without a new file', async () => {
      const user = userEvent.setup()
      mockedListCourtImages.mockResolvedValueOnce([courtImage(1)])

      renderCourtForm('/admin/clubs/nasr/courts/7')

      expect(
        await screen.findByRole('img', { name: 'الصورة الحالية للملعب' }),
      ).toHaveAttribute(
        'src',
        'https://images.sloty.test/images/1/thumbnail.webp',
      )
      expect(screen.getByLabelText('اسم الملعب')).toHaveValue('ملعب النخيل')

      await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

      await waitFor(() => {
        expect(mockedUpdateCourt).toHaveBeenCalledTimes(1)
      })
      const [, , payload] = mockedUpdateCourt.mock.calls[0]
      expect(payload).not.toHaveProperty('image')
      expect(mockedReplaceCourtPrimaryImage).not.toHaveBeenCalled()
      expect(
        screen.getByRole('img', { name: 'الصورة الحالية للملعب' }),
      ).toBeInTheDocument()
    })

    it('replaces the current image with the newly selected file after the Court update', async () => {
      const user = userEvent.setup()
      mockedListCourtImages.mockResolvedValueOnce([courtImage(1)])

      renderCourtForm('/admin/clubs/nasr/courts/7')

      await screen.findByRole('img', { name: 'الصورة الحالية للملعب' })
      await user.upload(screen.getByLabelText('صورة الملعب'), selectedFile)

      expect(
        screen.getByRole('img', { name: 'الصورة الجديدة للملعب' }),
      ).toHaveAttribute('src', 'blob:court-image-preview')

      await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

      await waitFor(() => {
        expect(mockedReplaceCourtPrimaryImage).toHaveBeenCalledWith(
          'nasr',
          7,
          selectedFile,
        )
      })
      expect(
        mockedUpdateCourt.mock.invocationCallOrder[0],
      ).toBeLessThan(mockedReplaceCourtPrimaryImage.mock.invocationCallOrder[0])
      expect(
        await screen.findByRole('img', { name: 'الصورة الحالية للملعب' }),
      ).toHaveAttribute(
        'src',
        'https://images.sloty.test/images/9/thumbnail.webp',
      )
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(
        'blob:court-image-preview',
      )
    })

    it('shows a Backend image field error under صورة الملعب, not as a generic form error', async () => {
      const user = userEvent.setup()
      mockedReplaceCourtPrimaryImage.mockRejectedValueOnce(
        new ApiClientError('يرجى مراجعة البيانات المدخلة.', 400, {
          code: 'VALIDATION_ERROR',
          fieldErrors: {
            image: [
              { code: 'invalid', message: 'الملف المرفوع ليس صورة صالحة.' },
            ],
          },
        }),
      )

      renderCourtForm('/admin/clubs/nasr/courts/7')

      await user.upload(await screen.findByLabelText('صورة الملعب'), selectedFile)
      await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

      const imageError = await screen.findByText(
        'تم حفظ بيانات الملعب، لكن تعذر رفع الصورة. الملف المرفوع ليس صورة صالحة.',
      )
      const imageField = screen.getByLabelText('صورة الملعب').parentElement

      expect(imageField).toContainElement(imageError)
      expect(
        screen.queryByText('يرجى مراجعة البيانات المدخلة.'),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('img', { name: 'الصورة الجديدة للملعب' }),
      ).toBeInTheDocument()
    })

    it('keeps Court editing available when the current image list cannot be loaded', async () => {
      const user = userEvent.setup()
      mockedListCourtImages.mockRejectedValueOnce(new Error('not found'))

      renderCourtForm('/admin/clubs/nasr/courts/7')

      expect(
        await screen.findByText('تعذر تحميل الصورة الحالية للملعب.'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('اسم الملعب')).toHaveValue('ملعب النخيل')

      await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

      await waitFor(() => {
        expect(mockedUpdateCourt).toHaveBeenCalledTimes(1)
      })
      expect(mockedReplaceCourtPrimaryImage).not.toHaveBeenCalled()
    })
  })
})
