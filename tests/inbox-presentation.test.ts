import { describe, it, expect } from 'vitest'
import { snippetOf, priorityTone, partyOf, replyDraft, visibleMessages, formatAgentName } from '@/components/inbox/helpers'

describe('snippetOf', () => {
  it('collapses whitespace and returns short text untouched', () => {
    expect(snippetOf('  hello \n\n  world  ')).toBe('hello world')
  })
  it('truncates with an ellipsis at the limit', () => {
    const out = snippetOf('a'.repeat(50), 10)
    expect(out).toHaveLength(10)
    expect(out.endsWith('…')).toBe(true)
  })
  it('tolerates missing input', () => {
    expect(snippetOf(undefined)).toBe('')
    expect(snippetOf(null)).toBe('')
  })
})

describe('priorityTone', () => {
  it('uses semantic tokens only', () => {
    for (const p of ['urgent', 'high', 'normal', 'low', 'bogus']) {
      expect(priorityTone(p)).not.toMatch(/gray-|blue-|red-|orange-/)
    }
    expect(priorityTone('urgent')).toContain('danger')
    expect(priorityTone('high')).toContain('warn')
  })
})

const msg = {
  from: 'agent-1', fromAlias: 'crm', fromLabel: 'CRM Bot', fromHost: 'mac-mini',
  to: 'agent-2', toAlias: 'api', toHost: undefined,
}

describe('partyOf', () => {
  it('shows the sender in the inbox, preferring label then alias then id', () => {
    expect(partyOf(msg, 'inbox')).toEqual({ name: 'CRM Bot', address: 'crm@mac-mini' })
    expect(partyOf({ ...msg, fromLabel: undefined }, 'inbox').name).toBe('crm')
    expect(partyOf({ ...msg, fromLabel: undefined, fromAlias: undefined }, 'inbox').name).toBe('agent-1')
  })
  it('shows the recipient in sent, with an unknown-host fallback', () => {
    expect(partyOf(msg, 'sent')).toEqual({ name: 'api', address: 'api@unknown-host' })
  })
})

describe('replyDraft', () => {
  it('routes by technical sender id and prefixes the subject', () => {
    expect(replyDraft({ from: 'agent-1', fromHost: 'mac-mini', subject: 'Deploy' })).toEqual({
      to: 'agent-1@mac-mini', subject: 'Re: Deploy', type: 'response',
    })
  })
  it('falls back to unknown-host', () => {
    expect(replyDraft({ from: 'a', subject: 'x' }).to).toBe('a@unknown-host')
  })
})

describe('visibleMessages / formatAgentName', () => {
  const list = [{ id: 'a', status: 'unread' }, { id: 'b', status: 'read' }, { id: 'c', status: 'read' }]
  it('filters to unread only on request', () => {
    expect(visibleMessages(list, true)).toEqual([{ id: 'a', status: 'unread' }])
    expect(visibleMessages(list, false)).toBe(list)
  })
  it('keeps the open message in the filtered list', () => {
    expect(visibleMessages(list, true, 'b').map(m => m.id)).toEqual(['a', 'b'])
  })
  it('formats name@host', () => {
    expect(formatAgentName('id', 'alias', 'h')).toBe('alias@h')
    expect(formatAgentName('id')).toBe('id@unknown-host')
  })
})
