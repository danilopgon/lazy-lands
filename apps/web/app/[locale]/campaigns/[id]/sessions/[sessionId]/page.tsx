import { GeneratedSessionView } from '@/components/sessions/generated-session-view'

/**
 * Server component for the resumable generated-session draft route.
 *
 * @param {object} root0 - Page params.
 * @param {Promise<{ id: string; sessionId: string }>} root0.params - Campaign and session ids.
 * @returns {Promise<React.ReactElement>} The generated session view element.
 */
export default async function GeneratedSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  return <GeneratedSessionView campaignId={id} sessionId={sessionId} />
}
