import { afterEach, describe, expect, it } from 'vitest'

import {
  clearMemoryReviewDraft,
  completeMemoryReviewDraft,
  readMemoryReviewDraft,
  rewriteMemoryReviewDraftSuggestions,
  writeMemoryReviewDraft,
} from '@/lib/sessions/memory-review-draft'

const validDraft = {
  campaign_id: 'camp-1',
  session_id: 'sess-1',
  session_number: 7,
  memory_suggestions: [
    {
      content: 'Captain Vess owes the party a favor.',
      type: 'relationship' as const,
      importance: 'high' as const,
      reason: 'The favor changes future negotiations.',
      related: ['Captain Vess'],
    },
  ],
}

describe('memory review draft storage', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('writes and reads a campaign/session scoped draft', () => {
    writeMemoryReviewDraft(validDraft)

    const draft = readMemoryReviewDraft('camp-1', 'sess-1')

    expect(draft?.campaign_id).toBe('camp-1')
    expect(draft?.session_id).toBe('sess-1')
    expect(draft?.memory_suggestions).toHaveLength(1)
    expect(draft?.memory_suggestions[0].content).toBe(
      'Captain Vess owes the party a favor.'
    )
  })

  it('clears invalid JSON or schema-mismatched storage', () => {
    sessionStorage.setItem(
      'lazy-lands:memory-review:v1:camp-1:sess-1',
      JSON.stringify({ version: 99, campaign_id: 'camp-1' })
    )

    expect(readMemoryReviewDraft('camp-1', 'sess-1')).toBeNull()
    expect(
      sessionStorage.getItem('lazy-lands:memory-review:v1:camp-1:sess-1')
    ).toBeNull()
  })

  it('returns null and clears the requested draft when campaign/session mismatch', () => {
    writeMemoryReviewDraft(validDraft)

    expect(readMemoryReviewDraft('camp-1', 'other-session')).toBeNull()
    expect(readMemoryReviewDraft('camp-1', 'sess-1')).not.toBeNull()

    clearMemoryReviewDraft('camp-1', 'sess-1')
    expect(readMemoryReviewDraft('camp-1', 'sess-1')).toBeNull()
  })

  it('completion clearing removes only the completed scoped draft', () => {
    writeMemoryReviewDraft(validDraft)
    writeMemoryReviewDraft({
      ...validDraft,
      session_id: 'sess-2',
      memory_suggestions: [
        { ...validDraft.memory_suggestions[0], content: 'Second draft' },
      ],
    })

    completeMemoryReviewDraft('camp-1', 'sess-1')

    expect(readMemoryReviewDraft('camp-1', 'sess-1')).toBeNull()
    expect(readMemoryReviewDraft('camp-1', 'sess-2')?.session_id).toBe('sess-2')
  })

  it('rewrites a scoped draft with remaining suggestions after one is processed', () => {
    writeMemoryReviewDraft({
      ...validDraft,
      memory_suggestions: [
        validDraft.memory_suggestions[0],
        {
          content: 'The warehouse fire exposed guild ledgers.',
          type: 'consequence' as const,
          importance: 'medium' as const,
          reason: 'Future faction pressure depends on this evidence.',
          related: ['Black Bear Guild'],
        },
      ],
    })

    rewriteMemoryReviewDraftSuggestions('camp-1', 'sess-1', [
      {
        content: 'The warehouse fire exposed guild ledgers.',
        type: 'consequence' as const,
        importance: 'medium' as const,
        reason: 'Future faction pressure depends on this evidence.',
        related: ['Black Bear Guild'],
      },
    ])

    const draft = readMemoryReviewDraft('camp-1', 'sess-1')
    expect(draft?.memory_suggestions).toHaveLength(1)
    expect(draft?.memory_suggestions[0].content).toBe(
      'The warehouse fire exposed guild ledgers.'
    )
  })

  it('clears a scoped draft when rewriting leaves no remaining suggestions', () => {
    writeMemoryReviewDraft(validDraft)

    rewriteMemoryReviewDraftSuggestions('camp-1', 'sess-1', [])

    expect(readMemoryReviewDraft('camp-1', 'sess-1')).toBeNull()
  })
})
