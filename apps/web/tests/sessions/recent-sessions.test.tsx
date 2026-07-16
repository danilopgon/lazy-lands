import { render, screen } from '@/tests/intl'
import { describe, expect, it } from 'vitest'

import { RecentSessions } from '@/components/campaigns/recent-sessions'

describe('RecentSessions', () => {
  it('does not offer a summary-only completed generated session as a draft', () => {
    render(
      <RecentSessions
        campaignId="camp-1"
        isLoading={false}
        isError={false}
        sessions={[
          {
            id: 'completed-generated',
            session_number: 8,
            summary: 'The party resolved the raid.',
            consequences: null,
            has_generated_content: true,
            status: 'registered',
            created_at: '2026-07-10T10:00:00Z',
          },
        ]}
      />
    )

    expect(screen.queryByText(/draft/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /resume draft/i })).toBeNull()
  })

  it('offers a generated draft based on persisted status', () => {
    render(
      <RecentSessions
        campaignId="camp-1"
        isLoading={false}
        isError={false}
        sessions={[
          {
            id: 'open-generated',
            session_number: 9,
            summary: 'The Scribe proposed a raid.',
            consequences: null,
            has_generated_content: true,
            status: 'draft',
            created_at: '2026-07-11T10:00:00Z',
          },
        ]}
      />
    )

    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /resume draft/i })).toHaveAttribute(
      'href',
      '/campaigns/camp-1/sessions/open-generated'
    )
  })
})
