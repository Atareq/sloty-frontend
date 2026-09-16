import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppPagination } from './AppPagination'

describe('AppPagination', () => {
  it('renders nothing when there is no previous and no next page', () => {
    const { container } = render(
      <AppPagination
        currentPage={1}
        hasNext={false}
        hasPrevious={false}
        onPageChange={vi.fn()}
        totalCount={5}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders pagination with primary next and secondary previous buttons', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    render(
      <AppPagination
        currentPage={2}
        hasNext={true}
        hasPrevious={true}
        itemLabel="حجز"
        onPageChange={onPageChange}
        totalCount={30}
      />,
    )

    const prevButton = screen.getByRole('button', { name: 'السابق' })
    const nextButton = screen.getByRole('button', { name: 'التالي' })

    expect(prevButton).toBeEnabled()
    expect(nextButton).toBeEnabled()
    expect(screen.getByText('صفحة 2 · 30 حجز')).toBeInTheDocument()

    await user.click(nextButton)
    expect(onPageChange).toHaveBeenCalledWith(3)

    await user.click(prevButton)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('disables buttons when hasNext or hasPrevious is false', () => {
    render(
      <AppPagination
        currentPage={1}
        hasNext={true}
        hasPrevious={false}
        onPageChange={vi.fn()}
        totalCount={10}
      />,
    )

    expect(screen.getByRole('button', { name: 'السابق' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'التالي' })).toBeEnabled()
  })
})

