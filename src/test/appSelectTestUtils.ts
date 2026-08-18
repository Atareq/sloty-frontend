import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/**
 * Selects an AppSelect option through the same button/listbox interaction a
 * user performs. The submitted feature value remains owned by the component.
 */
export async function chooseAppSelectOption(
  user: UserEvent,
  trigger: HTMLElement,
  optionName: string,
): Promise<void> {
  const visibleOption = screen.queryByRole('option', { name: optionName })

  if (visibleOption) {
    await user.click(visibleOption)
    return
  }

  await user.click(trigger)
  await user.click(await screen.findByRole('option', { name: optionName }))
}
