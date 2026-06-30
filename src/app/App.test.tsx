import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { clearAccessToken } from '../core/auth/authStorage'
import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    clearAccessToken()
    window.history.pushState(null, '', '/')
  })

  it('renders the router shell', async () => {
    render(<App />)

    expect(
      screen.getByRole('main').closest('[aria-label="هيكل تطبيق سلوتي"]'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' }))
      .toBeInTheDocument()
  })
})
