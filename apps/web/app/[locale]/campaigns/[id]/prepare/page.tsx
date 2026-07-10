import { PrepareSessionView } from '@/components/sessions/prepare-session-form'

export default async function PrepareSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PrepareSessionView campaignId={id} />
}
