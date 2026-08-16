import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ManagerPermissionFields } from './ManagerPermissionFields'

describe('ManagerPermissionFields', () => {
  it('renders settlement and pricing/working-hours toggles', () => {
    render(
      <ManagerPermissionFields
        fieldErrors={{}}
        isSubmitting={false}
        onChange={vi.fn()}
        values={{
          manager_can_settle_transactions: false,
          manager_can_change_pricing: false,
        }}
      />,
    )

    expect(
      screen.getByRole('checkbox', {
        name: /إدارة التسويات المالية والجرد/,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', {
        name: /تعديل الأسعار ومواعيد العمل/,
      }),
    ).toBeInTheDocument()
  })

  it('emits membership-level manager permission field changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ManagerPermissionFields
        fieldErrors={{}}
        isSubmitting={false}
        onChange={onChange}
        values={{
          manager_can_settle_transactions: false,
          manager_can_change_pricing: false,
        }}
      />,
    )

    await user.click(
      screen.getByRole('checkbox', {
        name: /إدارة التسويات المالية والجرد/,
      }),
    )
    await user.click(
      screen.getByRole('checkbox', {
        name: /تعديل الأسعار ومواعيد العمل/,
      }),
    )

    expect(onChange).toHaveBeenCalledWith(
      'manager_can_settle_transactions',
      true,
    )
    expect(onChange).toHaveBeenCalledWith(
      'manager_can_change_pricing',
      true,
    )
  })
})
