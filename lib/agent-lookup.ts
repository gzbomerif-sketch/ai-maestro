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

/** Match order: id, then name, then alias, then label — first non-empty ref that hits wins. */
export function findAgentByRef<T extends AgentRefCandidate>(agents: readonly T[], ...refs: (string | null | undefined)[]): T | undefined {
  for (const ref of refs) {
    const key = norm(ref)
    if (!key) continue
    const hit = agents.find(a => a.id === ref)
      ?? agents.find(a => norm(a.name) === key)
      ?? agents.find(a => norm(a.alias) === key)
      ?? agents.find(a => norm(a.label) === key)
    if (hit) return hit
  }
  return undefined
}
