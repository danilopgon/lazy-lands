import { SessionExportView } from '@/components/sessions/session-export-view'

/**
 * Server component for the PDF export route of a generated-session draft.
 *
 * @param {object} root0 - Page params.
 * @param {Promise<{ id: string; sessionId: string }>} root0.params - Campaign and session ids.
 * @returns {Promise<React.ReactElement>} The session export view element.
 */
export default async function SessionExportPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  return <SessionExportView campaignId={id} sessionId={sessionId} />
}
