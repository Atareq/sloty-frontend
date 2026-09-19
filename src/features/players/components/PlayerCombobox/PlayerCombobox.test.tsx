import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerCombobox } from './PlayerCombobox'
import { listClubPlayers } from '../../playersApi'
import type { ClubPlayer } from '../../players.types'

vi.mock('../../playersApi', () => ({
  listClubPlayers: vi.fn(),
}))

const mockedListClubPlayers = vi.mocked(listClubPlayers)

const mockPlayers: ClubPlayer[] = [
  {
    id: 101,
    display_name: 'كابتن طارق',
    phone_number: '01012345678',
    player_number: 1,
    player_profile: {
      id: 1001,
      phone_number: '01012345678',
      full_name: 'كابتن طارق',
      verified: true,
      has_account: true,
      created_at: '2026-09-01T12:00:00Z',
      updated_at: '2026-09-01T12:00:00Z',
    },
    last_used_at: '2026-09-17T20:00:00Z',
  },
  {
    id: 102,
    display_name: 'طارق محمد',
    player_number: 2,
    player_profile: {
      id: 1002,
      phone_number: '01012345678',
      full_name: 'طارق محمد',
      verified: false,
      has_account: false,
      created_at: '2026-09-01T12:00:00Z',
      updated_at: '2026-09-01T12:00:00Z',
    },
    last_used_at: '2026-08-15T18:00:00Z',
  },
]

describe('PlayerCombobox', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders input with correct placeholder and aria attributes', () => {
    render(
      <PlayerCombobox
        onChange={vi.fn()}
        value=""
      />,
    )

    const input = screen.getByRole('combobox', { name: 'اسم اللاعب' })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute(
      'placeholder',
      'اختر اسمًا محفوظًا أو اكتب اسمًا جديدًا',
    )
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens dropdown when clicking chevron and displays options with last used badge', async () => {
    const user = userEvent.setup()
    render(
      <PlayerCombobox
        onChange={vi.fn()}
        playerOptions={mockPlayers}
        value=""
      />,
    )

    const toggleButton = screen.getByRole('button', {
      name: 'عرض قائمة اللاعبين',
    })
    await user.click(toggleButton)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('كابتن طارق')).toBeInTheDocument()
    expect(screen.getByText('آخر استخدام')).toBeInTheDocument()
    expect(screen.getByText('طارق محمد')).toBeInTheDocument()
    expect(screen.getAllByText('01012345678')).toHaveLength(2)
  })

  it('selects option on click and notifies callbacks', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSelectPlayer = vi.fn()

    render(
      <PlayerCombobox
        onChange={onChange}
        onSelectPlayer={onSelectPlayer}
        playerOptions={mockPlayers}
        value=""
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'عرض قائمة اللاعبين' }),
    )
    await user.click(screen.getByText('طارق محمد'))

    expect(onChange).toHaveBeenCalledWith('طارق محمد')
    expect(onSelectPlayer).toHaveBeenCalledWith(mockPlayers[1])
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports keyboard navigation with ArrowDown, ArrowUp, Enter, and Escape', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSelectPlayer = vi.fn()

    render(
      <PlayerCombobox
        onChange={onChange}
        onSelectPlayer={onSelectPlayer}
        playerOptions={mockPlayers}
        value=""
      />,
    )

    const input = screen.getByRole('combobox')
    await user.click(input)

    // Open via ArrowDown
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // Down to second option
    await user.keyboard('{ArrowDown}')
    // Select second option with Enter
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('طارق محمد')
    expect(onSelectPlayer).toHaveBeenCalledWith(mockPlayers[1])
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    // Test Escape key closes dropdown
    await user.click(
      screen.getByRole('button', { name: 'عرض قائمة اللاعبين' }),
    )
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('triggers debounced name search when typing in the input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    mockedListClubPlayers.mockResolvedValueOnce([
      {
        id: 201,
        display_name: 'أحمد كابتن',
        phone_number: '01222333444',
        player_number: 10,
        player_profile: {
          id: 1201,
          phone_number: '01222333444',
          full_name: 'أحمد كابتن',
          verified: true,
          has_account: false,
          created_at: '2026-09-01T12:00:00Z',
          updated_at: '2026-09-01T12:00:00Z',
        },
        last_used_at: '2026-09-10T12:00:00Z',
      },
    ])

    function ControlledPlayerCombobox() {
      const [val, setVal] = useState('')
      return (
        <PlayerCombobox
          clubSlug="barcelona-fc"
          onChange={(v) => {
            setVal(v)
            onChange(v)
          }}
          value={val}
        />
      )
    }

    render(<ControlledPlayerCombobox />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'أحمد')

    expect(onChange).toHaveBeenLastCalledWith('أحمد')

    await waitFor(() => {
      expect(mockedListClubPlayers).toHaveBeenCalledWith('barcelona-fc', {
        search: 'أحمد',
        order_by: '-last_used_at',
      })
    })

    expect(await screen.findByText('أحمد كابتن')).toBeInTheDocument()
  })

  it('displays empty state when no saved players match', async () => {
    const user = userEvent.setup()

    render(
      <PlayerCombobox
        onChange={vi.fn()}
        playerOptions={[]}
        value=""
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'عرض قائمة اللاعبين' }),
    )

    expect(
      screen.getByText('مفيش لاعب محفوظ بالبيانات دي'),
    ).toBeInTheDocument()
  })

  it('displays loading state during active search', async () => {
    const user = userEvent.setup()
    render(
      <PlayerCombobox
        isLoading
        onChange={vi.fn()}
        playerOptions={[]}
        value=""
      />,
    )

    const toggle = screen.getByRole('button', {
      name: 'عرض قائمة اللاعبين',
    })
    await user.click(toggle)

    expect(screen.getByText('جاري البحث...')).toBeInTheDocument()
  })
})
