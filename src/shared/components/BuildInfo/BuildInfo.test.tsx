import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminBuildInfoFooter, BuildInfo } from './BuildInfo'

vi.mock('../../../core/config/buildInfo', async () => {
  const actual = await vi.importActual<
    typeof import('../../../core/config/buildInfo')
  >('../../../core/config/buildInfo')

  return {
    ...actual,
    getFrontendBuildInfo: vi.fn(() => ({
      release: 'v0.4.0',
      commit: 'a13c92e34abcdef',
      shortCommit: 'a13c92e',
    })),
  }
})

describe('BuildInfo', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders FE and API release lines with short commits', () => {
    render(
      <BuildInfo
        backendBuildInfo={{
          service: 'sloty-backend',
          release: 'v0.7.0',
          commit: '91bd3aa28ef00',
          shortCommit: '91bd3aa',
        }}
      />,
    )

    const root = screen.getByLabelText('معلومات الإصدار')
    expect(root).toHaveTextContent('FE  v0.4.0 · a13c92e', {
      normalizeWhitespace: false,
    })
    expect(root).toHaveTextContent('API v0.7.0 · 91bd3aa', {
      normalizeWhitespace: false,
    })
    expect(root).toHaveClass('select-text')
    expect(root).toHaveClass('overflow-x-hidden')
  })

  it('shows API — when backend metadata is unavailable', () => {
    render(<BuildInfo backendBuildInfo={null} showApiUnavailable />)

    const root = screen.getByLabelText('معلومات الإصدار')
    expect(root).toHaveTextContent('FE  v0.4.0 · a13c92e', {
      normalizeWhitespace: false,
    })
    expect(root).toHaveTextContent('API —', { normalizeWhitespace: false })
  })

  it('omits the API line while backend metadata is still loading', () => {
    render(<BuildInfo backendBuildInfo={null} showApiUnavailable={false} />)

    const root = screen.getByLabelText('معلومات الإصدار')
    expect(root).toHaveTextContent('FE  v0.4.0 · a13c92e', {
      normalizeWhitespace: false,
    })
    expect(root.textContent ?? '').not.toContain('API')
  })

  it('wraps the same BuildInfo for shared Admin menu footers', () => {
    const { container } = render(
      <AdminBuildInfoFooter
        backendBuildInfo={{
          service: 'sloty-backend',
          release: 'v0.7.0',
          commit: '91bd3aa28ef00',
          shortCommit: '91bd3aa',
        }}
      />,
    )

    expect(container.firstElementChild).toHaveClass('overflow-x-hidden')
    expect(screen.getByLabelText('معلومات الإصدار')).toHaveTextContent(
      'FE  v0.4.0 · a13c92e',
      { normalizeWhitespace: false },
    )
  })
})
