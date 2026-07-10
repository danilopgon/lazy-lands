import { GeneratedSessionView } from '@/components/sessions/generated-session-view'

export default async function GeneratedSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  return <GeneratedSessionView campaignId={id} sessionId={sessionId} />
}
