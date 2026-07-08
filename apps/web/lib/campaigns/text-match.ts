/**
 * Case-insensitive check of whether any of the given text fields contains the
 * query. Nullable fields count as empty. Shared by the entity list searches so
 * NPCs, factions, and any future searchable entity match consistently.
 *
 * @param {(string | null | undefined)[]} fields - The entity's text fields.
 * @param {string} query - The already-lowercased query.
 * @returns {boolean} Whether any field contains the query.
 */
export function matchesQuery(
  fields: (string | null | undefined)[],
  query: string
): boolean {
  return fields.some((field) => (field ?? '').toLowerCase().includes(query))
}
