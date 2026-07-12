import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: mockApiFetch,
}))

import {
  registerSession,
  getSessions,
  downloadSessionPdf,
  SessionApiError,
  SessionCampaignNotFoundError,
  SessionNotExportableError,
  SessionValidationError,
} from '@/lib/sessions/api'

describe('sessions api client (Block 7a frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('registerSession posts { summary, consequences } to POST /campaigns/{id}/sessions', async () => {
    const responseBody = {
      session_id: 'sess-1',
      session_number: 1,
      memory_suggestions: [],
    }
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 })
    )

    const result = await registerSession('camp-1', {
      summary: 'The party arrived in town.',
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/campaigns/camp-1/sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ summary: 'The party arrived in town.' }),
      })
    )
    expect(result.session_id).toBe('sess-1')
    expect(result.session_number).toBe(1)
  })

  it('registerSession throws SessionCampaignNotFoundError on 404', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    )

    await expect(
      registerSession('forged-id', { summary: 'x' })
    ).rejects.toBeInstanceOf(SessionCampaignNotFoundError)
  })

  it('registerSession throws SessionApiError with the backend message on other failures', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Could not save the session.' }), {
        status: 500,
      })
    )

    let caught: unknown
    try {
      await registerSession('camp-1', { summary: 'x' })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(SessionApiError)
    expect((caught as Error).message).toMatch(/could not save the session/i)
  })

  it('getSessions returns the chronological session list', async () => {
    const responseBody = [
      {
        id: 'sess-1',
        session_number: 1,
        summary: 'First session',
        consequences: null,
        created_at: '2026-06-01T10:00:00Z',
      },
      {
        id: 'sess-2',
        session_number: 2,
        summary: 'Second session',
        consequences: 'Something changed',
        created_at: '2026-06-08T10:00:00Z',
      },
    ]
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 })
    )

    const result = await getSessions('camp-1')

    expect(mockApiFetch).toHaveBeenCalledWith('/campaigns/camp-1/sessions')
    expect(result).toHaveLength(2)
    expect(result[0].session_number).toBe(1)
  })

  it('getSessions returns an empty array for a campaign with no sessions', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    )

    const result = await getSessions('camp-1')

    expect(result).toEqual([])
  })
})

describe('downloadSessionPdf (PDF export download client)', () => {
  let createObjectURL: ReturnType<typeof vi.spyOn>
  let revokeObjectURL: ReturnType<typeof vi.spyOn>
  let anchorClick: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-url')
    revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    // jsdom does not navigate on anchor.click(); stub it to observe the trigger.
    anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    anchorClick.mockRestore()
  })

  function pdfResponse(): Response {
    return new Response('%PDF-1.7 bytes', {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="session-8.pdf"',
      },
    })
  }

  it('requests the export endpoint with repeated section_id params and no body', async () => {
    mockApiFetch.mockResolvedValue(pdfResponse())

    await downloadSessionPdf('sess-8', ['synopsis', 'beats'])

    expect(mockApiFetch).toHaveBeenCalledTimes(1)
    const [path, init] = mockApiFetch.mock.calls[0]
    expect(path).toBe(
      '/sessions/sess-8/export.pdf?section_id=synopsis&section_id=beats'
    )
    // IDs-only: a plain GET with no request body carrying prose.
    expect(init).toBeUndefined()
  })

  it('creates and revokes an object URL and returns the attachment filename on success', async () => {
    mockApiFetch.mockResolvedValue(pdfResponse())

    const filename = await downloadSessionPdf('sess-8', ['synopsis'])

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(filename).toBe('session-8.pdf')
  })

  it('throws SessionValidationError on 422 without creating an object URL', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Select one or more unique saved sections.' }),
        {
          status: 422,
        }
      )
    )

    await expect(
      downloadSessionPdf('sess-8', ['synopsis', 'synopsis'])
    ).rejects.toBeInstanceOf(SessionValidationError)
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('throws SessionNotExportableError on 409 (missing/invalid draft)', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'This saved session draft cannot be exported.',
        }),
        {
          status: 409,
        }
      )
    )

    await expect(
      downloadSessionPdf('sess-8', ['synopsis'])
    ).rejects.toBeInstanceOf(SessionNotExportableError)
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('throws SessionCampaignNotFoundError on 404', async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found.' }), { status: 404 })
    )

    await expect(
      downloadSessionPdf('forged', ['synopsis'])
    ).rejects.toBeInstanceOf(SessionCampaignNotFoundError)
    expect(createObjectURL).not.toHaveBeenCalled()
  })
})
