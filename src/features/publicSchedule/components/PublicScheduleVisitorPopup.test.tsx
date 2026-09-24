import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicScheduleVisitorPopup } from './PublicScheduleVisitorPopup'
import { publicScheduleVisitorCopy } from '../../../shared/copy/appCopy'

describe('PublicScheduleVisitorPopup', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders exact approved Arabic copy when open', () => {
    render(<PublicScheduleVisitorPopup isOpen={true} onClose={onClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: publicScheduleVisitorCopy.title.trim().replace(/\s+/g, ' '),
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.bodyPlayer),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.stayTuned),
    ).toBeInTheDocument()
    expect(
      screen.getByText(publicScheduleVisitorCopy.bodyStaff),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: publicScheduleVisitorCopy.continueAction }),
    ).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<PublicScheduleVisitorPopup isOpen={false} onClose={onClose} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(publicScheduleVisitorCopy.title)).not.toBeInTheDocument()
  })

  it('calls onClose when clicking the primary استمرار button', async () => {
    const user = userEvent.setup()
    render(<PublicScheduleVisitorPopup isOpen={true} onClose={onClose} />)

    const continueButton = screen.getByRole('button', {
      name: publicScheduleVisitorCopy.continueAction,
    })
    await user.click(continueButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when pressing Escape key', async () => {
    const user = userEvent.setup()
    render(<PublicScheduleVisitorPopup isOpen={true} onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the close X button', async () => {
    const user = userEvent.setup()
    render(<PublicScheduleVisitorPopup isOpen={true} onClose={onClose} />)

    const closeButton = screen.getByRole('button', { name: 'إغلاق' })
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
