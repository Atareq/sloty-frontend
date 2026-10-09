import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAuthTokens,
  setAccessToken,
  setRefreshToken,
} from '../core/auth/authStorage'
import { createDevAccessToken } from '../core/auth/devAuth'
import { App } from './App'
import { router } from './router'

/**
 * Route-level coverage for `صورة الملعب`: renders the real `App` router
 * (ProtectedRoute → AppShell → RoleRoute → CourtFormPage) as an ADMIN with
 * only `fetch` stubbed, so the actual Court URLs are exercised end to end.
 */

const club = { id: 3, name: 'نادي الاختبار', slug: 'test-club', city: 'CAIRO', is_active: true }
const court = {
  id: 12,
  club: 3,
  name: 'ملعب الاختبار',
  sport_type: 'FOOTBALL',
  minimum_deposit: '100.00',
  cancellation_refund_notice_days: 2,
  slot_duration_minutes: 60,
  is_active: true,
  requires_digital_payment_reference: false,
  internal_hold_expiry_hours: 12,
  notes: '',
}
const existingImage = {
  id: 5,
  position: 0,
  image: {
    id: 105,
    display_url: 'https://images.sloty.test/images/5/display.webp',
    thumbnail_url: 'https://images.sloty.test/images/5/thumbnail.webp',
    width: 1200,
    height: 800,
  },
}

interface RecordedRequest {
  method: string
  path: string
  body: BodyInit | null | undefined
}

let requests: RecordedRequest[] = []
let courtImages: (typeof existingImage)[] = []

function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function fakeApi(
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input))
  const path = url.pathname.replace(/^.*\/api\/v1\//, '')
  const method = init?.method ?? 'GET'
  requests.push({ method, path, body: init?.body })

  if (path === 'me/') {
    return json(200, {
      id: 1,
      email: 'admin@sloty.test',
      first_name: 'مدير',
      last_name: 'المنصة',
      phone_number: null,
      is_active: true,
      profile_role: 'ADMIN',
      account_created_by: null,
    })
  }
  if (path === 'clubs/') return json(200, page([club]))
  if (path === 'clubs/test-club/') return json(200, club)
  if (path === 'clubs/test-club/courts/') {
    return method === 'POST' ? json(201, court) : json(200, page([court]))
  }
  if (path === 'clubs/test-club/courts/12/') return json(200, court)
  if (path === 'clubs/test-club/courts/12/images/') {
    return method === 'POST'
      ? json(201, { ...existingImage, id: 9, position: 1 })
      : json(200, courtImages)
  }
  if (path.startsWith('clubs/test-club/courts/12/images/') && method === 'DELETE') {
    return json(204)
  }
  if (path === 'clubs/test-club/courts/12/working-hours/') {
    return json(200, { court: 12, court_name: court.name, pricing_configured: false, working_hours: [] })
  }

  return json(200, page([]))
}

async function navigate(path: string): Promise<void> {
  await act(async () => {
    await router.navigate(path)
  })
}

function mutatingRequests(): RecordedRequest[] {
  return requests.filter(({ method }) => method !== 'GET')
}

async function findCourtImageInput(): Promise<HTMLElement> {
  return screen.findByLabelText('صورة الملعب', {}, { timeout: 3000 })
}

describe('Court image field on the real Admin Court routes', () => {
  beforeEach(async () => {
    requests = []
    courtImages = []
    clearAuthTokens()
    setAccessToken(createDevAccessToken('ADMIN'))
    setRefreshToken('dev-refresh-token')
    window.URL.createObjectURL = vi.fn(() => 'blob:court-image-preview')
    window.URL.revokeObjectURL = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockImplementation(fakeApi)
    await router.navigate('/')
  })

  afterEach(() => {
    clearAuthTokens()
    vi.restoreAllMocks()
  })

  it('renders صورة الملعب as a native image file input on /admin/clubs/test-club/courts/new', async () => {
    render(<App />)
    await navigate('/admin/clubs/test-club/courts/new')

    const imageInput = await findCourtImageInput()

    expect(router.state.location.pathname).toBe('/admin/clubs/test-club/courts/new')
    expect(imageInput).toBeVisible()
    expect(imageInput).toHaveAttribute('type', 'file')
    expect(imageInput).toHaveAttribute('accept', 'image/*')
    expect(screen.getByRole('button', { name: 'حفظ الملعب' })).toBeInTheDocument()
  })

  it('renders صورة الملعب with the current image preview on /admin/clubs/test-club/courts/12', async () => {
    courtImages = [existingImage]
    render(<App />)
    await navigate('/admin/clubs/test-club/courts/12')

    const imageInput = await findCourtImageInput()

    expect(router.state.location.pathname).toBe('/admin/clubs/test-club/courts/12')
    expect(imageInput).toBeVisible()
    expect(imageInput).toHaveAttribute('type', 'file')
    expect(imageInput).toHaveAttribute('accept', 'image/*')
    expect(
      await screen.findByRole('img', { name: 'الصورة الحالية للملعب' }),
    ).toHaveAttribute('src', existingImage.image.thumbnail_url)
  })

  it('reaches both Court forms from the Club Courts list', async () => {
    render(<App />)
    await navigate('/admin/clubs/test-club/courts')

    const main = await screen.findByRole('main')
    expect(
      await within(main).findByRole('link', { name: 'إضافة ملعب' }, { timeout: 3000 }),
    ).toHaveAttribute('href', '/admin/clubs/test-club/courts/new')
    expect(
      await within(main).findByRole('link', { name: 'تعديل الملعب' }),
    ).toHaveAttribute('href', '/admin/clubs/test-club/courts/12')
  })

  it('edit without a replacement sends only the JSON Court PATCH, with no image', async () => {
    const user = userEvent.setup()
    courtImages = [existingImage]
    render(<App />)
    await navigate('/admin/clubs/test-club/courts/12')
    await findCourtImageInput()
    await screen.findByDisplayValue('ملعب الاختبار')
    requests = []

    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    await waitFor(() => {
      expect(mutatingRequests()).toHaveLength(1)
    })
    const [patch] = mutatingRequests()
    expect(patch).toMatchObject({ method: 'PATCH', path: 'clubs/test-club/courts/12/' })
    expect(typeof patch!.body).toBe('string')
    expect(JSON.parse(patch!.body as string)).not.toHaveProperty('image')
    expect(requests.some(({ path }) => path.includes('/images/'))).toBe(false)
  })

  it('edit with a new file keeps the Court PATCH as JSON, then uploads the File as multipart image', async () => {
    const user = userEvent.setup()
    const replacement = new File(['court'], 'court.png', { type: 'image/png' })
    courtImages = [existingImage]
    render(<App />)
    await navigate('/admin/clubs/test-club/courts/12')
    await screen.findByDisplayValue('ملعب الاختبار')

    await user.upload(await findCourtImageInput(), replacement)
    requests = []
    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    await waitFor(() => {
      expect(mutatingRequests().map(({ method, path }) => `${method} ${path}`)).toEqual([
        'PATCH clubs/test-club/courts/12/',
        'POST clubs/test-club/courts/12/images/',
        'DELETE clubs/test-club/courts/12/images/5/',
      ])
    })
    const [patch, upload] = mutatingRequests()
    expect(JSON.parse(patch!.body as string)).not.toHaveProperty('image')
    expect(upload!.body).toBeInstanceOf(FormData)
    expect((upload!.body as FormData).get('image')).toBe(replacement)
  })

  it('create with a selected file POSTs the Court as before, then uploads the File for the new Court', async () => {
    const user = userEvent.setup()
    const selected = new File(['court'], 'court.png', { type: 'image/png' })
    render(<App />)
    await navigate('/admin/clubs/test-club/courts/new')

    await user.type(await screen.findByLabelText('اسم الملعب'), 'ملعب جديد')
    await user.type(screen.getByLabelText(/الحد الأدنى للعربون/), '50')
    await user.upload(await findCourtImageInput(), selected)
    requests = []
    await user.click(screen.getByRole('button', { name: 'حفظ الملعب' }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin/clubs/test-club/courts')
    })
    const [create, upload] = mutatingRequests()
    expect(create).toMatchObject({ method: 'POST', path: 'clubs/test-club/courts/' })
    expect(JSON.parse(create!.body as string)).toMatchObject({ name: 'ملعب جديد', minimum_deposit: '50' })
    expect(upload).toMatchObject({ method: 'POST', path: 'clubs/test-club/courts/12/images/' })
    expect((upload!.body as FormData).get('image')).toBe(selected)
  })
})
