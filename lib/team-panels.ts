/** Team workspace panel tabs, keys and routing helpers. Pure. Spec: 2026-10-03-team-workspace-design.md */
export type TeamTool = 'kanban' | 'tasks' | 'documents' | 'instructions' | 'members' | 'browser'
export type TeamTab = TeamTool | `term:${string}`

export const TEAM_TOOLS: { id: TeamTool; label: string; key: string }[] = [
  { id: 'kanban', label: 'Kanban', key: 'K' },
  { id: 'tasks', label: 'Tasks', key: 'A' },
  { id: 'documents', label: 'Documents', key: 'D' },
  { id: 'instructions', label: 'Instructions', key: 'N' },
  { id: 'members', label: 'Members', key: 'E' },
  { id: 'browser', label: 'Browser', key: 'B' },
]
const TOOL_IDS = new Set<string>(TEAM_TOOLS.map(t => t.id))

export function isTeamTab(v: unknown): v is TeamTab {
  return typeof v === 'string' && (TOOL_IDS.has(v) || /^term:[\w.:-]+$/.test(v))
}

export const termTab = (agentId: string): TeamTab => `term:${agentId}`
export function termAgentId(tab: string): string | null {
  return tab.startsWith('term:') && tab.length > 5 ? tab.slice(5) : null
}

/** Letters pick tools; digits 1–9 pick the first nine members' terminals. */
export function teamTabForKey(key: string, memberIds: string[]): TeamTab | null {
  if (/^[1-9]$/.test(key)) {
    const id = memberIds[Number(key) - 1]
    return id ? termTab(id) : null
  }
  return TEAM_TOOLS.find(t => t.key === key.toUpperCase())?.id ?? null
}

export function teamTabLabel(tab: string, nameOf: (id: string) => string | undefined): string {
  const agentId = termAgentId(tab)
  if (agentId) return nameOf(agentId) ?? agentId
  return TEAM_TOOLS.find(t => t.id === tab)?.label ?? tab
}

export function pruneMemberTabs(tabs: string[], memberIds: string[]): string[] {
  const members = new Set(memberIds)
  return tabs.filter(t => { const id = termAgentId(t); return !id || members.has(id) })
}

export function activeMeetingFor<M extends { teamId: string | null; status: string; startedAt: string }>(teamId: string, meetings: M[]): M | null {
  return meetings
    .filter(m => m.teamId === teamId && m.status === 'active')
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0] ?? null
}

/** Where an old full-screen Teams/Meeting URL should land inside the shell. */
export function redirectTarget(pathname: string, params: { get(k: string): string | null }, meetingTeamId?: string | null): string {
  const toTeam = (id: string) => `/?team=${encodeURIComponent(id)}`
  const teamPage = pathname.match(/^\/teams\/([^/]+)\/?$/)
  if (teamPage) return toTeam(decodeURIComponent(teamPage[1]))
  if (pathname.startsWith('/team-meeting')) {
    const team = params.get('team')
    if (team) return toTeam(team)
    const meeting = params.get('meeting')
    if (meeting && meeting !== 'new' && meetingTeamId) return toTeam(meetingTeamId)
  }
  return '/'
}

/**
 * Meeting messages reach agents wrapped in an <external-content …> safety envelope
 * (with a "[The content below comes from another party…]" notice). Show people the text only.
 */
export function meetingText(raw: string): string {
  const m = raw.match(/^\s*<external-content\b[^>]*>\s*([\s\S]*?)\s*<\/external-content>\s*$/)
  if (!m) return raw
  return m[1].replace(/^\[The content below comes from another party[^\]]*\]\s*/, '').trim()
}

/** Turn per-recipient delivery results into what the chat should tell the user. */
export function summarizeDelivery(results: boolean[]): { ok: boolean; message: string | null } {
  if (results.length === 0) return { ok: false, message: 'No members to message' }
  const delivered = results.filter(Boolean).length
  if (delivered === results.length) return { ok: true, message: null }
  if (delivered === 0) return { ok: false, message: 'Message not delivered' }
  return { ok: false, message: `Delivered to ${delivered} of ${results.length} members` }
}
