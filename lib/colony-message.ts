/**
 * Colony panel ↔ Bot Crossing. The framed colony posts `{ type, agentId }` when a bot is opened;
 * only messages from the colony's own origin, in exactly that shape, are acted on.
 * Spec: docs/superpowers/specs/2026-10-04-colony-panel-design.md
 */
export const COLONY_OPEN_AGENT = 'bot-crossing:open-agent'

export interface ColonyStatus {
  enabled: boolean
  running: boolean
  url: string | null
  reason: string | null
  fix: string | null
  log: string[]
}

/** The agent id a message asks to open, or null for anything to ignore. */
export function parseColonyMessage(event: { origin: string; data: unknown }, colonyOrigin: string | null): string | null {
  if (!colonyOrigin || event.origin !== colonyOrigin) return null
  const data = event.data as { type?: unknown; agentId?: unknown } | null
  if (!data || typeof data !== 'object' || data.type !== COLONY_OPEN_AGENT) return null
  const id = data.agentId
  return typeof id === 'string' && id.length > 0 && id.length <= 128 ? id : null
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
