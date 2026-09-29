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

async function navigate(path: string): Promise<void> {
  await act(async () => {
    await router.navigate(path)
  })
}

describe('App', () => {
  beforeEach(async () => {
    clearAuthTokens()
    vi.stubEnv('VITE_PUBLIC_SITE_URL', SITE_URL)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline in tests'))
    await router.navigate('/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('renders the public homepage at / for visitors without a session', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'إدارة وحجز الملاعب بسهولة مع Sloty',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /تسجيل الدخول/ })[0])
      .toHaveAttribute('href', '/login')
  })

  it('applies indexable homepage SEO with one canonical and JSON-LD', async () => {
    render(<App />)
    await screen.findByRole('heading', { level: 1 })

    expect(document.title).toBe(
      'Sloty | سلوتي لحجز وإدارة ملاعب كرة القدم في أسيوط ومصر',
    )
    expect(robots()).toEqual(['index, follow'])
    expect(canonical()).toEqual(['https://sloty.baronlearning.com/'])
    expect(headContent('meta[property="og:url"]', 'content')).toEqual([
      'https://sloty.baronlearning.com/',
    ])
    expect(
      document.head.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(1)
  })

  it('follows the homepage internal link to the Assiut page and swaps SEO', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1 })

    await user.click(
      screen.getAllByRole('link', { name: 'حجز ملاعب كرة القدم في أسيوط' })[0],
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'ملاعب كرة القدم والحجز في أسيوط',
      }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/assiut/')
    expect(document.title).toBe('حجز ملاعب كرة القدم في أسيوط | Sloty')
    expect(canonical()).toEqual(['https://sloty.baronlearning.com/assiut/'])
    expect(robots()).toEqual(['index, follow'])
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
})
