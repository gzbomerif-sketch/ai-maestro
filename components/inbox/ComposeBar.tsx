'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Forward, Globe, Maximize2, Send, Server } from 'lucide-react'
import AgentAvatar from '@/components/AgentAvatar'
import { Button, IconButton } from '@/components/shell/ui'
import type { AgentRecipient } from '@/components/MessageCenter'

const control =
  'w-full bg-sunken border border-control-border rounded-[10px] px-3 text-[14px] text-ink placeholder:text-ink-muted disabled:opacity-50 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'
const label = 'block text-[13px] text-ink-muted mb-1.5'

/* ------------------------------------------------------------------ */
/* Reply bar: pinned to the bottom of the reader                      */
/* ------------------------------------------------------------------ */

interface ComposeBarProps {
  /** Who the reply goes to, shown as the bar's label. */
  replyingTo: string
  text: string
  onTextChange: (text: string) => void
  onSend: () => void
  sending: boolean
  /** Open the full compose form prefilled for this reply. */
  onExpand: () => void
}

/** Quick reply at the bottom of the reader. Cmd/Ctrl+Enter sends. */
export default function ComposeBar({ replyingTo, text, onTextChange, onSend, sending, onExpand }: ComposeBarProps) {
  const canSend = text.trim().length > 0 && !sending
  return (
    <div className="flex-none border-t border-hairline/70 bg-surface px-4 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor="inbox-reply" className="text-[13px] text-ink-muted truncate">
          Reply to <span className="text-ink">{replyingTo}</span>
        </label>
        <IconButton label="Open full composer" onClick={onExpand}>
          <Maximize2 strokeWidth={1.5} className="w-4 h-4" />
        </IconButton>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          id="inbox-reply"
          name="reply"
          aria-label="Reply message"
          rows={1}
          value={text}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSend) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder="Write a reply…"
          className={`${control} py-2 leading-relaxed resize-none min-h-[38px] max-h-40`}
        />
        <Button variant="accent" onClick={onSend} disabled={!canSend}>
          <Send strokeWidth={1.5} className="w-4 h-4" />
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Full compose / forward form                                        */
/* ------------------------------------------------------------------ */

type Priority = 'low' | 'normal' | 'high' | 'urgent'
type MessageType = 'request' | 'response' | 'notification' | 'update'

interface ComposeFormProps {
  to: string
  subject: string
  message: string
  priority: Priority
  type: MessageType
  onToChange: (v: string) => void
  onSubjectChange: (v: string) => void
  onMessageChange: (v: string) => void
  onPriorityChange: (v: Priority) => void
  onTypeChange: (v: MessageType) => void
  allAgents: AgentRecipient[]
  /** The agent whose inbox this is; excluded from recipient suggestions. */
  agentId?: string
  isForwarding: boolean
  /** "name@host" of the message being forwarded, for the banner. */
  forwardingFrom: string
  loading: boolean
  onSend: () => void
  onCancel: () => void
}

function SelectField({ id, name, value, onChange, children, ariaLabel }: {
  id?: string; name: string; value: string; onChange: (v: string) => void; children: React.ReactNode; ariaLabel: string
}) {
  return (
    <div className="relative">
      <select id={id} name={name} aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)}
        className={`${control} h-[34px] appearance-none pr-8 cursor-pointer`}>
        {children}
      </select>
      <ChevronDown strokeWidth={1.5} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
    </div>
  )
}

/** Full compose/forward form: recipient autocomplete, subject, priority, type and body. */
export function ComposeForm({
  to, subject, message, priority, type, onToChange, onSubjectChange, onMessageChange, onPriorityChange, onTypeChange,
  allAgents, agentId, isForwarding, forwardingFrom, loading, onSend, onCancel,
}: ComposeFormProps) {
  // Agent autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredAgents, setFilteredAgents] = useState<AgentRecipient[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const recipientRef = useRef<HTMLDivElement>(null)

  // Filter agents based on input for autocomplete
  useEffect(() => {
    if (!to) {
      setFilteredAgents([])
      setShowSuggestions(false)
      return
    }
    const searchTerm = to.toLowerCase()
    // Filter out current agent and match by alias or host
    const filtered = allAgents.filter(agent => {
      if (agent.id === agentId) return false
      const aliasMatch = agent.alias.toLowerCase().includes(searchTerm)
      const hostMatch = agent.hostId?.toLowerCase().includes(searchTerm)
      const fullMatch = `${agent.alias}@${agent.hostId || 'unknown-host'}`.toLowerCase().includes(searchTerm)
      return aliasMatch || hostMatch || fullMatch
    })
    setFilteredAgents(filtered)
    setShowSuggestions(filtered.length > 0)
    setSelectedIndex(-1)
  }, [to, allAgents, agentId])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (recipientRef.current && !recipientRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Select an agent from suggestions: technical name plus host for cross-host compatibility
  const selectAgent = (agent: AgentRecipient) => {
    onToChange(`${agent.name}@${agent.hostId || 'unknown-host'}`)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  // Handle keyboard navigation in autocomplete
  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredAgents.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < filteredAgents.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) selectAgent(filteredAgents[selectedIndex])
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  // The "To" value looks like an external agent when it matches nobody in the autocomplete list
  const isExternalRecipient = (() => {
    if (!to) return false
    const v = to.toLowerCase()
    return !allAgents.some(agent =>
      agent.name.toLowerCase() === v ||
      agent.alias.toLowerCase() === v ||
      `${agent.name}@${agent.hostId || 'unknown-host'}`.toLowerCase() === v ||
      `${agent.alias}@${agent.hostId || 'unknown-host'}`.toLowerCase() === v
    )
  })()

  return (
    <div className="h-full overflow-y-auto p-4">
      {isForwarding && (
        <div className="mb-4 p-3 rounded-[10px] border border-hairline bg-raised">
          <p className="flex items-center gap-1.5 text-[14px] text-ink">
            <Forward strokeWidth={1.5} className="w-4 h-4 text-accent flex-none" />
            Forwarding message from <strong className="truncate">{forwardingFrom}</strong>
          </p>
          <p className="text-[12px] text-ink-muted mt-1">
            You can add a note at the top of the message before the forwarded content.
          </p>
        </div>
      )}

      <div className="space-y-3.5 max-w-2xl">
        <div className="relative" ref={recipientRef}>
          <label htmlFor="compose-to" className={label}>To</label>
          <input
            id="compose-to"
            name="to"
            type="text"
            aria-label="Recipient agent name"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="compose-to-suggestions"
            value={to}
            onChange={e => onToChange(e.target.value)}
            onKeyDown={handleToKeyDown}
            onFocus={() => to && filteredAgents.length > 0 && setShowSuggestions(true)}
            autoComplete="off"
            className={`${control} h-[34px]`}
            placeholder="Type agent name or agent@host"
          />

          {showSuggestions && filteredAgents.length > 0 && (
            <div
              id="compose-to-suggestions"
              role="listbox"
              aria-label="Agent suggestions"
              className="absolute z-20 w-full mt-1 bg-popover border border-hairline rounded-[10px] shadow-lg max-h-60 overflow-y-auto p-1"
            >
              {filteredAgents.map((agent, index) => {
                const isSelected = index === selectedIndex
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    key={agent.id}
                    onClick={() => selectAgent(agent)}
                    className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left text-[14px] ${
                      isSelected ? 'bg-accent-fill text-white' : 'text-ink hover:bg-control-off'
                    }`}
                  >
                    <AgentAvatar agent={{ id: agent.id, name: agent.name, label: agent.alias, avatar: agent.avatar }} size="xs" />
                    <span className="font-medium">{agent.alias}</span>
                    <span className={`text-[13px] truncate ${isSelected ? 'text-white/80' : 'text-ink-muted'}`}>@{agent.hostId || 'unknown-host'}</span>
                    {agent.hostId && <Server strokeWidth={1.5} className={`ml-auto w-4 h-4 flex-none ${isSelected ? 'text-white/80' : 'text-ink-muted'}`} />}
                  </button>
                )
              })}
            </div>
          )}

          {isExternalRecipient ? (
            <div className="mt-2 flex items-center gap-2 p-2 rounded-[10px] border border-hairline bg-raised">
              <Globe className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="text-[12px]">
                <span className="text-ink font-medium">External Agent</span>
                <span className="text-ink-muted ml-1">— This agent is not registered in AI Maestro. The message will be sent via API.</span>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[12px] text-ink-muted">
              Agent name, or <code className="font-mono">agent@host</code> for external agents.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="compose-subject" className={label}>Subject</label>
          <input
            id="compose-subject"
            name="subject"
            type="text"
            aria-label="Message subject"
            value={subject}
            onChange={e => onSubjectChange(e.target.value)}
            className={`${control} h-[34px]`}
            placeholder="Enter subject"
          />
        </div>

        <div className="flex gap-2.5">
          <div className="flex-1">
            <label htmlFor="compose-priority" className={label}>Priority</label>
            <SelectField id="compose-priority" name="priority" ariaLabel="Priority" value={priority} onChange={v => onPriorityChange(v as Priority)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </SelectField>
          </div>
          <div className="flex-1">
            <label htmlFor="compose-type" className={label}>Type</label>
            <SelectField id="compose-type" name="type" ariaLabel="Type" value={type} onChange={v => onTypeChange(v as MessageType)}>
              <option value="request">Request</option>
              <option value="response">Response</option>
              <option value="notification">Notification</option>
              <option value="update">Update</option>
            </SelectField>
          </div>
        </div>

        <div>
          <label htmlFor="compose-message" className={label}>Message</label>
          <textarea
            id="compose-message"
            name="message"
            aria-label="Message body"
            value={message}
            onChange={e => onMessageChange(e.target.value)}
            rows={8}
            className={`${control} py-2 leading-relaxed resize-y`}
            placeholder="Enter your message..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="accent" onClick={onSend} disabled={loading}>
            <Send strokeWidth={1.5} className="w-4 h-4" />
            {loading ? (isForwarding ? 'Forwarding…' : 'Sending…') : (isForwarding ? 'Forward' : 'Send')}
          </Button>
        </div>
      </div>
    </div>
  )
}
