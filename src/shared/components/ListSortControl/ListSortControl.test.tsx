import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { listCopy } from '../../copy/appCopy'
import { ListSortControl } from './ListSortControl'

describe('ListSortControl', () => {
  it('renders two arrow actions with newest pressed by default', () => {
    render(
      <ListSortControl onChange={vi.fn()} value="newest" />,
    )

    const newest = screen.getByRole('button', { name: listCopy.newestFirst })
    const oldest = screen.getByRole('button', { name: listCopy.oldestFirst })

    expect(screen.getByRole('group', { name: listCopy.ordering }))
      .toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(newest).toHaveAttribute('aria-pressed', 'true')
    expect(oldest).toHaveAttribute('aria-pressed', 'false')
    expect(newest).toHaveAttribute('title', listCopy.newestFirst)
    expect(oldest).toHaveAttribute('title', listCopy.oldestFirst)
    expect(screen.queryByText('-created')).not.toBeInTheDocument()
    expect(screen.queryByText('created')).not.toBeInTheDocument()
    expect(screen.queryByText('start_time')).not.toBeInTheDocument()
  })

  it('emits semantic newest/oldest values from keyboard and pointer', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    const { rerender } = render(
      <ListSortControl onChange={onChange} value="newest" />,
    )

    const oldest = screen.getByRole('button', { name: listCopy.oldestFirst })

    oldest.focus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('oldest')
    expect(onChange.mock.calls[0]?.[0]).not.toMatch(/created|start_time/)

    onChange.mockClear()
    rerender(<ListSortControl onChange={onChange} value="oldest" />)
    await user.click(screen.getByRole('button', { name: listCopy.newestFirst }))
    expect(onChange).toHaveBeenCalledWith('newest')

    onChange.mockClear()
    rerender(<ListSortControl onChange={onChange} value="newest" />)
    await user.click(screen.getByRole('button', { name: listCopy.newestFirst }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps both arrows accessible while disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListSortControl disabled onChange={onChange} value="newest" />,
    )

    const newest = screen.getByRole('button', { name: listCopy.newestFirst })
    const oldest = screen.getByRole('button', { name: listCopy.oldestFirst })

    expect(newest).toBeDisabled()
    expect(oldest).toBeDisabled()
    await user.click(oldest)
    expect(onChange).not.toHaveBeenCalled()
  })
})
