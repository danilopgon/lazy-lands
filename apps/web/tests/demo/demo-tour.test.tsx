import { render, screen } from '@/tests/intl'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type DriverConfig = {
  steps: { element?: string; popover: { title: string; description: string } }[]
}

const { mockDrive, mockDriver } = vi.hoisted(() => {
  const mockDrive = vi.fn()
  const mockDriver = vi.fn<
    (config: DriverConfig) => { drive: typeof mockDrive }
  >(() => ({ drive: mockDrive }))
  return { mockDrive, mockDriver }
})

vi.mock('driver.js', () => ({ driver: mockDriver }))
vi.mock('driver.js/dist/driver.css', () => ({}))

import { DemoTour } from '@/components/demo/demo-tour'

describe('DemoTour — per-screen tourKey and steps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('drives the exact steps passed via props when replayed', async () => {
    const user = userEvent.setup()
    render(
      <DemoTour
        tourKey="memory"
        steps={[
          { title: 'Reviewable memory', description: 'Accept, edit, dismiss.' },
          {
            element: '[data-tour="suggestions"]',
            title: 'Pending suggestions',
            description: 'Each proposal is reviewable.',
          },
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: /guided tour/i }))

    expect(mockDriver).toHaveBeenCalledTimes(1)
    const config = mockDriver.mock.calls[0]?.[0]
    expect(config?.steps).toHaveLength(2)
    expect(config?.steps[1]?.element).toBe('[data-tour="suggestions"]')
    expect(mockDrive).toHaveBeenCalledTimes(1)
  })

  it('auto-runs at most once per tourKey, independently of other screens', async () => {
    vi.useFakeTimers()
    window.localStorage.setItem('lazylands-demo-tour-seen-campaign', '1')

    render(
      <DemoTour tourKey="memory" steps={[{ title: 'a', description: 'b' }]} />
    )

    // A different tourKey's seen flag must not suppress this screen's auto-run.
    await vi.advanceTimersByTimeAsync(500)

    expect(window.localStorage.getItem('lazylands-demo-tour-seen-memory')).toBe(
      '1'
    )
    expect(mockDriver).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('does not auto-run again once the seen flag is set, even after a remount', async () => {
    vi.useFakeTimers()

    const first = render(
      <DemoTour tourKey="memory" steps={[{ title: 'a', description: 'b' }]} />
    )

    await vi.advanceTimersByTimeAsync(500)
    expect(window.localStorage.getItem('lazylands-demo-tour-seen-memory')).toBe(
      '1'
    )
    expect(mockDriver).toHaveBeenCalledTimes(1)

    // Remount the SAME tourKey: the persisted seen flag must suppress a second
    // auto-run, so the driver is never constructed again.
    first.unmount()
    render(
      <DemoTour tourKey="memory" steps={[{ title: 'a', description: 'b' }]} />
    )
    await vi.advanceTimersByTimeAsync(500)

    expect(mockDriver).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})
