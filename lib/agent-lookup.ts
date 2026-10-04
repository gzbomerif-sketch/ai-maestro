/**
 * Resolve the full agent record behind a loose reference (a message sender, a
 * task assignee) so surfaces can hand AgentAvatar the real portrait. Pure.
 */

export interface AgentRefCandidate {
  id: string
  name?: string
  alias?: string
  label?: string
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase()

/**
 * Match order: id (exact), then name, alias, label (case-insensitive); the first non-empty ref that hits wins.
 * A name/alias/label tier with more than one hit is ambiguous (shared display name, same name on two hosts):
 * return undefined rather than guess, so the caller falls back to the initial instead of the wrong portrait.
 */
export function findAgentByRef<T extends AgentRefCandidate>(agents: readonly T[], ...refs: (string | null | undefined)[]): T | undefined {
  for (const ref of refs) {
    const key = norm(ref)
    if (!key) continue
    const byId = agents.find(a => a.id === ref)
    if (byId) return byId
    for (const field of ['name', 'alias', 'label'] as const) {
      const hits = agents.filter(a => norm(a[field]) === key)
      if (hits.length > 1) return undefined
      if (hits.length === 1) return hits[0]
    }
  }
  return undefined
}
