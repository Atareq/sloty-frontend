import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthTokens } from '../core/auth/authStorage'
import { App } from './App'
import { router } from './router'

const SITE_URL = 'https://sloty.baronlearning.com/'

function headContent(selector: string, attribute: string): string[] {
  return [...document.head.querySelectorAll(selector)].map(
    (element) => element.getAttribute(attribute) ?? '',
  )
}

function robots(): string[] {
  return headContent('meta[name="robots"]', 'content')
}

function canonical(): string[] {
  return headContent('link[rel="canonical"]', 'href')
}

/** Approved discovery contract page served by the mocked public endpoint. */
const discoveryPage = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      court_id: 1,
      court_name: 'Testing Main Court',
      club_slug: 'testing',
      club_name: 'Testing Club',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: 'شارع عباس العقاد',
      image_url: 'https://images.example/courts/1.jpg',
    },
  ],
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  return input instanceof Request ? input.url : String(input)
}

/** Serves the public discovery endpoint; every other request fails offline. */
async function fakeFetch(input: Parameters<typeof fetch>[0]): Promise<Response> {
  if (requestUrl(input).includes('/public/courts/')) {
    return new Response(JSON.stringify(discoveryPage), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  throw new TypeError('offline in tests')
}

async function navigate(path: string): Promise<void> {
  await act(async () => {
    await router.navigate(path)
  })
}

describe('App', () => {
  beforeEach(async () => {
    clearAuthTokens()
    vi.stubEnv('VITE_PUBLIC_SITE_URL', SITE_URL)
    vi.spyOn(globalThis, 'fetch').mockImplementation(fakeFetch)
    await router.navigate('/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('renders public discovery at / for visitors without a session', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'سلوتي لحجز ملاعب كرة القدم',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'ملاعب كرة القدم' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /تسجيل الدخول/ })[0])
      .toHaveAttribute('href', '/login')
  })

  it('applies indexable homepage SEO with one canonical and JSON-LD', async () => {
    render(<App />)
    await screen.findByRole('heading', { level: 1 })

    expect(document.title).toBe('Sloty | سلوتي لحجز وإدارة ملاعب كرة القدم')
    expect(headContent('meta[name="description"]', 'content')).toEqual([
      'سلوتي (Sloty) منصة مصرية لحجز وإدارة ملاعب كرة القدم، تساعد اللاعبين على معرفة المواعيد المتاحة وأصحاب الملاعب وفريق العمل على إدارة الحجوزات والمواعيد بسهولة.',
    ])
    expect(robots()).toEqual(['index, follow'])
    expect(canonical()).toEqual(['https://sloty.baronlearning.com/'])
    expect(headContent('meta[property="og:url"]', 'content')).toEqual([
      'https://sloty.baronlearning.com/',
    ])
    expect(
      document.head.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(1)
  })

  it('takes an anonymous visitor from discovery to a real Court public schedule', async () => {
    const user = userEvent.setup()
    render(<App />)

    const courtLink = await screen.findByRole('link', { name: 'Testing Main Court' })
    const discoveryCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => requestUrl(input).includes('/public/courts/'))
    expect(discoveryCall).toBeDefined()
    expect(requestUrl(discoveryCall![0])).toMatch(/\/public\/courts\/\?page=1$/)
    expect(new Headers(discoveryCall![1]?.headers).has('Authorization')).toBe(false)

    await user.click(courtLink)

    expect(router.state.location.pathname).toBe('/public/testing/courts/1/schedule')
    expect(document.title).toBe('جدول مواعيد الملعب | Sloty')
    expect(robots()).toEqual(['noindex, nofollow'])
    expect(canonical()).toEqual([])
  })

  it('shows the discovery error state when the public endpoint is unavailable', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ detail: 'Not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'تعذر تحميل الملاعب الآن. حاول مرة أخرى.',
    )
    expect(screen.queryByTestId('discovery-court-card')).not.toBeInTheDocument()
    expect(robots()).toEqual(['index, follow'])
  })

  it('follows the internal link to the About page and swaps SEO', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1 })

    await user.click(screen.getAllByRole('link', { name: 'عن سلوتي' })[0])

    expect(
      await screen.findByRole('heading', { level: 1, name: 'عن سلوتي' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/about/')
    expect(document.title).toBe('عن سلوتي | Sloty')
    expect(canonical()).toEqual(['https://sloty.baronlearning.com/about/'])
    expect(robots()).toEqual(['index, follow'])
    expect(
      document.head.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(1)
  })

  it('marks /login noindex and removes public canonical, Open Graph, and JSON-LD', async () => {
    render(<App />)
    await screen.findByRole('heading', { level: 1 })

    await navigate('/login')

    expect(
      await screen.findByRole('heading', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Sloty | سلوتي')
    expect(robots()).toEqual(['noindex, nofollow'])
    expect(canonical()).toEqual([])
    expect(document.head.querySelector('meta[property^="og:"]')).toBeNull()
    expect(
      document.head.querySelector('script[type="application/ld+json"]'),
    ).toBeNull()
  })

  it('keeps protected application routes noindex after the auth redirect', async () => {
    render(<App />)

    for (const path of ['/dashboard', '/transactions', '/settlements', '/admin/clubs']) {
      await navigate(path)
      await screen.findByRole('heading', { name: 'تسجيل الدخول' })

      expect(router.state.location.pathname).toBe('/login')
      expect(robots()).toEqual(['noindex, nofollow'])
      expect(canonical()).toEqual([])
    }
  })

  it('keeps the shared public court schedule out of the index', async () => {
    render(<App />)

    await navigate('/public/demo-club/courts/1/schedule')

    expect(document.title).toBe('جدول مواعيد الملعب | Sloty')
    expect(robots()).toEqual(['noindex, nofollow'])
    expect(canonical()).toEqual([])
  })

  it('navigates from /login to the Public Courts Home (/) when المتابعة كزائر is clicked without creating auth state', async () => {
    const user = userEvent.setup()
    render(<App />)

    await navigate('/login')

    expect(
      await screen.findByText('مش من فريق العمل في الملعب؟'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('تقدر تدخل كزائر وتشوف المواعيد المتاحة فقط.'),
    ).toBeInTheDocument()
    const guestButton = screen.getByRole('button', {
      name: 'المتابعة كزائر',
    })
    await user.click(guestButton)

    expect(router.state.location.pathname).toBe('/')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'سلوتي لحجز ملاعب كرة القدم',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'ملاعب كرة القدم' }),
    ).toBeInTheDocument()
    expect(robots()).toEqual(['index, follow'])
    expect(canonical()).toEqual(['https://sloty.baronlearning.com/'])
  })
})
