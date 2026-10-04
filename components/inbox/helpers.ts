/**
 * Pure presentation helpers for the inbox (list, reader, reply bar).
 * No React, no fetching: kept separate so they can be unit-tested in node.
 */

type Priority = 'low' | 'normal' | 'high' | 'urgent'

export type Box = 'inbox' | 'sent'

/** The fields of a message (summary or full) that decide who the "other party" is. */
export interface PartyFields {
  from: string
  fromAlias?: string
  fromLabel?: string
  fromHost?: string
  to: string
  toAlias?: string
  toLabel?: string
  toHost?: string
}

/** Collapse whitespace and cut to `max` characters with an ellipsis. */
export function snippetOf(text: string | undefined | null, max = 120): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

/** Semantic-token classes for a priority chip. */
export function priorityTone(priority: string): string {
  switch (priority) {
    case 'urgent': return 'text-danger bg-danger/10'
    case 'high': return 'text-warn bg-warn/10'
    case 'low': return 'text-ink-muted bg-raised'
    default: return 'text-accent bg-accent/10'
  }
}

/** name@host form used for routing and display (alias preferred over id, host always shown). */
export function formatAgentName(id: string, alias?: string, host?: string): string {
  return `${alias || id}@${host || 'unknown-host'}`
}

/** The counterparty of a message in a box: the sender in the inbox, the recipient in sent. */
export function partyOf(msg: PartyFields, box: Box): { name: string; address: string } {
  if (box === 'inbox') {
    return {
      name: msg.fromLabel || msg.fromAlias || msg.from,
      address: `${msg.fromAlias || msg.from}@${msg.fromHost || 'unknown-host'}`,
    }
  }
  return {
    name: msg.toLabel || msg.toAlias || msg.to,
    address: `${msg.toAlias || msg.to}@${msg.toHost || 'unknown-host'}`,
  }
}

/** Prefill for replying: route by the technical sender id, "Re: " subject, response type. */
export function replyDraft(msg: Pick<PartyFields, 'from' | 'fromHost'> & { subject: string }): {
  to: string
  subject: string
  type: 'response'
} {
  return {
    to: `${msg.from}@${msg.fromHost || 'unknown-host'}`,
    subject: `Re: ${msg.subject}`,
    type: 'response',
  }
}

/** Client-side "unread only" filter; `keepId` (the open message) stays so it does not vanish once read. */
export function visibleMessages<T extends { id: string; status: string }>(messages: T[], unreadOnly: boolean, keepId?: string): T[] {
  return unreadOnly ? messages.filter(m => m.status === 'unread' || m.id === keepId) : messages
}

export type { Priority }
