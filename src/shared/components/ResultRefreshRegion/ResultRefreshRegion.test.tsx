import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResultRefreshRegion } from './ResultRefreshRegion'

describe('ResultRefreshRegion', () => {
  it('keeps previous results visible and marks the region busy while refreshing', () => {
    render(
      <ResultRefreshRegion isRefreshing>
        <p>أحمد محمد</p>
      </ResultRefreshRegion>,
    )

    expect(screen.getByText('نتائج البحث')).toBeInTheDocument()
    expect(screen.getByText('أحمد محمد')).toBeInTheDocument()
    expect(screen.getByText('أحمد محمد').parentElement).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })
})
