import { PrepareSessionView } from '@/components/sessions/prepare-session-form'

/**
 * Server component for the prepare-next-session route.
 *
 * @param {object} root0 - Page params.
 * @param {Promise<{ id: string }>} root0.params - Campaign id.
 * @returns {Promise<React.ReactElement>} The prepare session view element.
 */
export default async function PrepareSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PrepareSessionView campaignId={id} />
}
