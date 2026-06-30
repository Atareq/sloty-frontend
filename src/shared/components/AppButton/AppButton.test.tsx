import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppButton } from './AppButton'

describe('AppButton', () => {
  it('renders children text', () => {
    render(<AppButton>حفظ</AppButton>)

    expect(screen.getByRole('button', { name: 'حفظ' })).toBeInTheDocument()
  })

  it('respects the disabled state from native button props', () => {
    render(<AppButton disabled>حفظ</AppButton>)

    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled()
  })
})
