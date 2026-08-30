import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PwaInstallNotice, PwaUpdateNotice } from './PwaExperience'

describe('PWA install notice', () => {
  it('uses safe current-scope copy and calls the Chromium prompt on demand', async () => {
    const user = userEvent.setup()
    const onInstall = vi.fn().mockResolvedValue('accepted')

    render(
      <PwaInstallNotice
        installKind="chromium"
        onDismiss={vi.fn()}
        onInstall={onInstall}
      />,
    )

    expect(screen.getByText('افتح Sloty أسرع من الشاشة الرئيسية.'))
      .toBeInTheDocument()
    expect(screen.queryByText(/الجدول يفضل متاح/)).not.toBeInTheDocument()
    expect(onInstall).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'تثبيت Sloty' }))

    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('shows iOS instructions without a fake install button', () => {
    render(
      <PwaInstallNotice
        installKind="ios"
        onDismiss={vi.fn()}
        onInstall={vi.fn()}
      />,
    )

    expect(screen.getByText('لتثبيت Sloty على الآيفون:')).toBeInTheDocument()
    expect(screen.getByText('افتح قائمة المشاركة')).toBeInTheDocument()
    expect(screen.getByText('اختار "إضافة إلى الشاشة الرئيسية"'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تثبيت Sloty' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'مش دلوقتي' }))
      .toBeInTheDocument()
  })
})

describe('PWA update notice', () => {
  it('never applies an update until the user chooses to', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    render(<PwaUpdateNotice onLater={vi.fn()} onUpdate={onUpdate} />)

    expect(screen.getByText('في تحديث جديد لـ Sloty')).toBeInTheDocument()
    expect(onUpdate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'تحديث الآن' }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('keeps the application running when the user chooses later', async () => {
    const user = userEvent.setup()
    const onLater = vi.fn()
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    render(<PwaUpdateNotice onLater={onLater} onUpdate={onUpdate} />)
    await user.click(screen.getByRole('button', { name: 'لاحقًا' }))

    expect(onLater).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
