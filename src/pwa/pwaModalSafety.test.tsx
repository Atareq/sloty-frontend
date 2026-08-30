import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useHasActiveModalTask } from './pwaReloadSafety'

describe('PWA modal-task safety', () => {
  afterEach(() => {
    document.querySelectorAll('[data-pwa-modal-test]').forEach((element) => {
      element.remove()
    })
  })

  it('blocks PWA prompts while any current or legacy modal task is active', async () => {
    const { result } = renderHook(() => useHasActiveModalTask())
    const modal = document.createElement('section')

    modal.dataset.pwaModalTest = 'true'
    modal.setAttribute('aria-modal', 'true')

    act(() => document.body.append(modal))

    await waitFor(() => expect(result.current).toBe(true))

    act(() => modal.remove())

    await waitFor(() => expect(result.current).toBe(false))
  })
})
