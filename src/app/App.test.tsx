import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { clearAuthTokens } from '../core/auth/authStorage'
import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    clearAuthTokens()
    window.history.pushState(null, '', '/')
  })

  it('renders the router shell', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' }))
      .toBeInTheDocument()
  })
})
