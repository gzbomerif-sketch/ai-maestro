/**
 * Colony panel ↔ Bot Crossing. The framed colony posts `{ type, agentId }` when a bot is opened;
 * only messages from the colony's own origin, in exactly that shape, are acted on.
 * Spec: docs/superpowers/specs/2026-10-04-colony-panel-design.md
 */
export const COLONY_OPEN_AGENT = 'bot-crossing:open-agent'

/** Host→colony nudge to rescan now (e.g. right after an agent is created). Bot Crossing's
 * `isHostRefresh` checks this exact string. */
export const COLONY_REFRESH = 'bot-crossing:refresh'

export interface ColonyStatus {
  enabled: boolean
  running: boolean
  url: string | null
  reason: string | null
  fix: string | null
  log: string[]
}

/** Posted by the colony when a bot is selected (the HUD card appears); never sent on deselect. */
export const COLONY_SELECT_AGENT = 'bot-crossing:select-agent'

export type ColonyEvent = { kind: 'open' | 'select'; agentId: string }

/** What a colony message asks for, or null for anything to ignore. */
export function parseColonyEvent(event: { origin: string; data: unknown }, colonyOrigin: string | null): ColonyEvent | null {
  if (!colonyOrigin || event.origin !== colonyOrigin) return null
  const data = event.data as { type?: unknown; agentId?: unknown } | null
  if (!data || typeof data !== 'object') return null
  const kind = data.type === COLONY_OPEN_AGENT ? 'open' : data.type === COLONY_SELECT_AGENT ? 'select' : null
  if (!kind) return null
  const id = data.agentId
  return typeof id === 'string' && id.length > 0 && id.length <= 128 ? { kind, agentId: id } : null
}

/** The agent id a message asks to open, or null for anything to ignore (select events included). */
export function parseColonyMessage(event: { origin: string; data: unknown }, colonyOrigin: string | null): string | null {
  const parsed = parseColonyEvent(event, colonyOrigin)
  return parsed?.kind === 'open' ? parsed.agentId : null
}

export function findAgent<T extends { id: string }>(agents: T[], id: string | null): T | null {
  return id ? agents.find(a => a.id === id) ?? null : null
}

/** The colony page, told that AI Maestro frames it and where to post back. */
export function colonyFrameUrl(url: string, hostOrigin: string): string {
  const u = new URL(url)
  u.searchParams.set('host', 'aimaestro')
  u.searchParams.set('hostOrigin', hostOrigin)
  return u.toString()
}

export function originOf(url: string | null): string | null {
  if (!url) return null
  try { return new URL(url).origin } catch { return null }
}

/**
 * The colony binds to localhost on the machine running AI Maestro. Opened from another device,
 * the frame's `localhost` would be that device, so the panel explains instead of going blank.
 */
export function colonyReachableFrom(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/** What the host reports when AI Maestro itself cannot be asked. */
export const UNREACHABLE: ColonyStatus = { enabled: true, running: false, url: null, reason: 'Could not reach AI Maestro for the colony status.', fix: null, log: [] }

/**
 * Fold one status poll into the last known state. A single failed fetch keeps the previous
 * status: the fetch is same-origin, so a lone failure is usually the dev server mid-compile,
 * and conceding immediately would unmount the iframe and throw away the colony state this
 * feature exists to preserve. Two misses in a row concede for real.
 */
export function nextColonyStatus(
  prev: ColonyStatus | null,
  fetched: ColonyStatus | null,
  failures: number,
): { status: ColonyStatus; failures: number } {
  if (fetched) return { status: fetched, failures: 0 }
  const n = failures + 1
  return { status: prev && n < 2 ? prev : UNREACHABLE, failures: n }
}

/**
 * Whether the live iframe should exist at all. `everShown` is the lazy-boot gate: the colony
 * is a whole 3D game, so it boots the first time a Colony tab opens — never in a session that
 * has not looked — and then stays mounted so later tabs find it alive.
 */
export function shouldShowColony(everShown: boolean, local: boolean, status: ColonyStatus | null): boolean {
  return everShown && local && !!status?.running && !!status.url
}
