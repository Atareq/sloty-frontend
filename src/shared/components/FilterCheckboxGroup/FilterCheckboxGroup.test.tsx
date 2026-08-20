import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterCheckboxGroup } from './FilterCheckboxGroup'

describe('FilterCheckboxGroup', () => {
  it('renders an accessible group and reports whole-row checkbox changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <FilterCheckboxGroup
        label="حالة العملية"
        onChange={onChange}
        options={[
          { key: 'open', label: 'مفتوحة', checked: false },
          { key: 'closed', label: 'مغلقة', checked: true },
        ]}
      />,
    )

    expect(screen.getByRole('group', { name: 'حالة العملية' }))
      .toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'مغلقة' })).toBeChecked()

    await user.click(screen.getByText('مفتوحة'))

    expect(onChange).toHaveBeenCalledWith('open', true)
  })

  it('keeps disabled options unavailable', () => {
    render(
      <FilterCheckboxGroup
        label="الفلاتر"
        onChange={vi.fn()}
        options={[{ key: 'locked', label: 'غير متاح', checked: false, disabled: true }]}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'غير متاح' })).toBeDisabled()
  })
})
