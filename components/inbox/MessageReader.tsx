'use client'

import type { ReactNode } from 'react'
import { Archive, ArrowLeft, Check, Copy, Forward, Globe, Mail, ShieldCheck, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import AgentAvatar, { type AgentAvatarSubject } from '@/components/AgentAvatar'
import { EmptyState } from '@/components/shell/ui'
import type { Message } from '@/lib/messageQueue'
import { partyOf, priorityTone, type Box } from './helpers'

interface MessageReaderProps {
  box: Box
  /** The opened message; null renders the "select a message" placeholder. */
  message: Message | null
  /** Avatar subject for the counterparty (sender in inbox, recipient in sent). */
  avatar: AgentAvatarSubject | null
  /** Narrow layouts show the reader alone; this returns to the list. */
  onBack?: () => void
  onArchive: () => void
  onDelete: () => void
  /** Delete needs a second click; true while that confirmation is armed. */
  deleteArmed: boolean
  onForward: () => void
  onCopy: (format: 'regular' | 'llm') => void
  copySuccess: boolean
  /** Reply / compose bar pinned to the bottom of the reader. */
  footer?: ReactNode
}

const toolbarBase =
  'inline-flex items-center justify-center gap-1.5 h-[32px] rounded-[10px] border border-control-border text-[13px] text-ink transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'
const iconButton = `${toolbarBase} w-[32px]`
const labelButton = `${toolbarBase} px-2.5`

/** One message opened as a thread card: header, actions, body, context and the reply bar slot. */
export default function MessageReader({
  box, message, avatar, onBack, onArchive, onDelete, deleteArmed, onForward, onCopy, copySuccess, footer,
}: MessageReaderProps) {
  if (!message) {
    return (
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <EmptyState
          icon={<Mail strokeWidth={1.5} className="w-8 h-8" />}
          title={box === 'inbox' ? 'Select a message to read' : 'Select a sent message to view'}
        />
      </div>
    )
  }

  const party = partyOf(message, box)
  const verified = message.fromVerified !== false

  return (
    <section className="flex-1 min-w-0 min-h-0 flex flex-col" aria-label="Message">
      <ScrollArea className="flex-1 min-h-0 [&>[data-radix-scroll-area-viewport]>div]:!block">
      <header className="px-4 py-3 border-b border-hairline/70">
        {onBack && (
          <button type="button" onClick={onBack}
            className="mb-2 inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill rounded">
            <ArrowLeft strokeWidth={1.5} className="w-4 h-4" /> Back
          </button>
        )}
        <h2 className="text-[16px] font-semibold text-ink mb-2 break-words line-clamp-3">{message.subject}</h2>
        <div className="flex items-center gap-2.5">
          {avatar && <AgentAvatar agent={avatar} size="sm" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-medium text-ink truncate">
                <span className="text-ink-muted font-normal">{box === 'inbox' ? 'From ' : 'To '}</span>{party.name}
              </span>
              {box === 'inbox' && (verified
                ? <span title="AI Maestro Agent" className="flex-none"><ShieldCheck className="w-4 h-4 text-ok" /></span>
                : <span title="External Agent" className="flex-none"><Globe className="w-4 h-4 text-accent" /></span>)}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-ink-muted">
              <span className="truncate">{party.address}</span>
              <span className="flex-none" aria-hidden>&bull;</span>
              <time dateTime={message.timestamp} className="flex-none">{new Date(message.timestamp).toLocaleString()}</time>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <span className={`text-[12px] px-2 py-0.5 rounded ${priorityTone(message.priority)}`}>{message.priority}</span>
          <span className="text-[12px] px-2 py-0.5 rounded bg-raised text-ink-muted">{message.content.type}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger className={`${iconButton} ${copySuccess ? 'text-ok border-ok/40' : ''}`} aria-label="Copy message" title="Copy">
                {copySuccess ? <Check strokeWidth={1.5} className="w-4 h-4" /> : <Copy strokeWidth={1.5} className="w-4 h-4" />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => onCopy('regular')}>
                  <Copy strokeWidth={1.5} /> Copy Message
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onCopy('llm')}>
                  <Copy strokeWidth={1.5} /> Copy for LLM
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {box === 'inbox' && (
              <>
                <button type="button" onClick={onForward} aria-label="Forward" title="Forward" className={iconButton}>
                  <Forward strokeWidth={1.5} className="w-4 h-4" />
                </button>
                <button type="button" onClick={onArchive} title="Archive" className={labelButton}>
                  <Archive strokeWidth={1.5} className="w-4 h-4" />Archive
                </button>
                <button type="button" onClick={onDelete} aria-label={deleteArmed ? 'Confirm delete' : 'Delete'} title={deleteArmed ? 'Click again to delete' : 'Delete'}
                  className={deleteArmed ? `${labelButton} border-danger/50 text-danger bg-danger/10` : `${iconButton} text-danger hover:bg-danger/10`}>
                  <Trash2 strokeWidth={1.5} className="w-4 h-4" />{deleteArmed && 'Confirm delete'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>
        <div className="p-4 space-y-4">
          <div className="p-4 bg-raised rounded-lg">
            <pre className="whitespace-pre-wrap break-words text-[14px] text-ink font-sans">{message.content.message}</pre>
          </div>
          {message.content.context && (
            <div>
              <h3 className="text-[13px] font-semibold text-ink-muted mb-2">Context</h3>
              <pre className="p-3 bg-raised rounded text-[12px] overflow-x-auto text-ink font-mono">
                {JSON.stringify(message.content.context, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>

      {footer}
    </section>
  )
}
