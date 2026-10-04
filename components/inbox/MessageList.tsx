'use client'

import { AlertCircle, Clock, Globe, Inbox, Send, ShieldCheck } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import AgentAvatar, { type AgentAvatarSubject } from '@/components/AgentAvatar'
import { Button, EmptyState } from '@/components/shell/ui'
import { formatDistanceToNow } from '@/lib/utils'
import type { MessageSummary } from '@/lib/messageQueue'
import { partyOf, snippetOf, type Box } from './helpers'

interface MessageListProps {
  box: Box
  messages: MessageSummary[]
  selectedId?: string
  /** Avatar subject for the counterparty of a message (sender in inbox, recipient in sent). */
  avatarOf: (msg: MessageSummary) => AgentAvatarSubject
  onSelect: (id: string) => void
  hasMore: boolean
  onLoadMore: () => void
  /** True when the unread-only filter is hiding everything that is left. */
  filteredEmpty?: boolean
}

/** Messages in a box: avatar, sender, subject, snippet, relative time and an unread marker per row. */
export default function MessageList({ box, messages, selectedId, avatarOf, onSelect, hasMore, onLoadMore, filteredEmpty = false }: MessageListProps) {
  if (messages.length === 0 && !hasMore) {
    const Icon = box === 'inbox' ? Inbox : Send
    return (
      <EmptyState
        icon={<Icon strokeWidth={1.5} className="w-6 h-6" />}
        title={filteredEmpty ? 'No unread messages' : box === 'inbox' ? 'No inbox messages' : 'No sent messages'}
      />
    )
  }

  return (
    <ScrollArea className="flex-1 min-h-0 [&>[data-radix-scroll-area-viewport]>div]:!block">
      <ul data-inbox-list className="divide-y divide-hairline/60" aria-label={box === 'inbox' ? 'Inbox messages' : 'Sent messages'}>
        {messages.map(msg => {
          const unread = box === 'inbox' && msg.status === 'unread'
          const selected = selectedId === msg.id
          const party = partyOf(msg, box)
          const urgent = msg.priority === 'urgent'
          const high = msg.priority === 'high'
          return (
            <li key={msg.id}>
              <button
                type="button"
                onClick={() => onSelect(msg.id)}
                aria-current={selected ? 'true' : undefined}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left border-l-2 transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-fill ${
                  selected ? 'bg-raised border-l-accent-fill' : unread ? 'bg-accent-fill/5 border-l-accent-fill/60' : 'border-l-transparent'
                }`}
              >
                <AgentAvatar agent={avatarOf(msg)} size="sm" className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    {box === 'sent' && <span className="text-[12px] text-ok font-medium flex-none">To</span>}
                    <span className={`truncate text-[14px] ${unread ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{party.name}</span>
                    {box === 'inbox' && (msg.fromVerified !== false
                      ? <span title="AI Maestro Agent" className="flex-none"><ShieldCheck className="w-3.5 h-3.5 text-ok" /></span>
                      : <span title="External Agent" className="flex-none"><Globe className="w-3.5 h-3.5 text-accent" /></span>)}
                    {urgent && <span title="Urgent" className="flex-none"><AlertCircle className="w-3.5 h-3.5 text-danger" /></span>}
                    {high && <span title="High priority" className="flex-none"><Clock className="w-3.5 h-3.5 text-warn" /></span>}
                    <time dateTime={msg.timestamp} title={new Date(msg.timestamp).toLocaleString()} className="ml-auto flex-none text-[12px] text-ink-muted">
                      {formatDistanceToNow(msg.timestamp)}
                    </time>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-[13px] ${unread ? 'font-semibold text-ink' : 'text-ink'}`}>{msg.subject}</span>
                    {unread && (
                      <span role="img" aria-label="Unread" className="ml-auto flex-none w-2 h-2 rounded-full bg-accent-fill" />
                    )}
                  </span>
                  <span className="block truncate text-[12px] text-ink-muted">{snippetOf(msg.preview)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {hasMore && (
        <div className="p-3 flex justify-center">
          <Button onClick={onLoadMore}>Load more messages</Button>
        </div>
      )}
    </ScrollArea>
  )
}
