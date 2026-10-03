'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Users } from 'lucide-react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import { useMeetingMessages } from '@/hooks/useMeetingMessages'
import { displayName, formatAge } from '@/lib/agent-status'
import { Button, EmptyState, Notice } from './ui'

/** The team's meeting chat: everyone's messages, and a composer that broadcasts or targets one member. */
export default function TeamChat({ team, meeting, members, onStart, starting }: {
  team: Team
  meeting: Meeting | null
  members: Agent[]
  onStart: () => void
  starting: boolean
}) {
  const { messages, sendToAgent, broadcastToAll, markAsRead } = useMeetingMessages({
    meetingId: meeting?.id ?? null,
    participantIds: team.agentIds,
    teamName: team.name,
    isActive: !!meeting,
  })
  const [to, setTo] = useState<string>('all')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { markAsRead(); endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length, markAsRead])
  useEffect(() => { if (to !== 'all' && !team.agentIds.includes(to)) setTo('all') }, [team.agentIds, to])

  if (!meeting) {
    return (
      <div className="flex-1 grid place-items-center p-10">
        <EmptyState icon={<Users strokeWidth={1.5} className="w-6 h-6" />} title="No meeting running"
          description={members.length ? 'Start a meeting to talk to all members at once.' : 'Add members from the Members panel (＋ then E), then start a meeting.'}
          action={<Button variant="accent" onClick={onStart} disabled={starting || members.length === 0}>Start meeting</Button>} />
      </div>
    )
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setError(null)
    try {
      if (to === 'all') await broadcastToAll(body)
      else await sendToAgent(to, body)
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }
  const now = Date.now()

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {messages.length === 0 && <p className="text-[14px] text-ink-muted">No messages yet. Say hi to the team.</p>}
        {messages.map(m => m.isMine ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl px-4 py-2.5 bg-raised text-ink text-[15px] whitespace-pre-wrap">{m.preview}</div>
          </div>
        ) : (
          <div key={m.id} className="max-w-[80%]">
            <div className="text-[12px] text-ink-muted"><span className="text-ink font-medium">{m.displayFrom}</span> · {formatAge(m.timestamp, now) || 'now'}</div>
            <div className="text-[15px] text-ink whitespace-pre-wrap mt-0.5">{m.preview}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="px-8 pb-6 pt-2">
        <div className="rounded-[18px] border border-control-off bg-surface px-4 pt-3.5 pb-3">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} aria-label="Message the team"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={to === 'all' ? 'Message the team' : `Message ${displayName(members.find(m => m.id === to) ?? members[0])}`}
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-gray-500 resize-none focus:outline-none min-h-[44px]" style={{ maxHeight: 160 }} />
          <div className="flex items-center gap-3 mt-1">
            <select value={to} onChange={e => setTo(e.target.value)} aria-label="Send to"
              className="h-[28px] rounded-[8px] border border-control-border bg-sunken px-2 text-[13px] text-ink-muted focus:outline-none">
              <option value="all">To: Everyone</option>
              {members.map(m => <option key={m.id} value={m.id}>To: {displayName(m)}</option>)}
            </select>
            {error && <Notice tone="error">{error}</Notice>}
            <button type="button" onClick={send} disabled={sending || !text.trim()} aria-label="Send"
              className="ml-auto grid place-items-center w-[34px] h-[34px] rounded-full bg-accent-fill text-white disabled:opacity-40">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
