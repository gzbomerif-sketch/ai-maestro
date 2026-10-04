'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Globe, HelpCircle, ShieldCheck, SquarePen, X } from 'lucide-react'
import { IconButton } from '@/components/shell/ui'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Message, MessageSummary } from '@/lib/messageQueue'
import { findAgentByRef } from '@/lib/agent-lookup'
import type { AgentAvatarSubject } from '@/components/AgentAvatar'
import MessageList from '@/components/inbox/MessageList'
import MessageReader from '@/components/inbox/MessageReader'
import ComposeBar, { ComposeForm } from '@/components/inbox/ComposeBar'
import { formatAgentName, partyOf, replyDraft, visibleMessages, type Box } from '@/components/inbox/helpers'

/**
 * Agent recipient info for messaging
 */
export interface AgentRecipient {
  id: string              // Agent ID (UUID)
  name: string            // Technical name for lookups (e.g., "23blocks-api-crm")
  alias: string           // Display name for UI (e.g., "CRM")
  tmuxSessionName?: string // Tmux session name (for backward compatibility)
  hostId?: string         // Host ID for cross-host messaging (e.g., 'macbook-pro', 'mac-mini')
  avatar?: string         // Agent avatar (portrait path, URL or emoji) for sender avatars
}

interface MessageCenterProps {
  sessionName: string
  agentId?: string  // Primary identifier when available
  allAgents: AgentRecipient[]
  hostUrl?: string  // Base URL for remote hosts (e.g., http://100.80.12.6:23000)
  isActive?: boolean  // Only fetch data when active (prevents API flood with many agents)
  /** Kept for callers (floating window passes it). Layout is now driven by the measured width, not this flag. */
  compact?: boolean
}

/** Below this width the list and the reader share one pane (list, then message with Back). */
const TWO_PANE_MIN_WIDTH = 640

/**
 * The AMP inbox: owns every fetch, poll, send and mark-read call, and lays out
 * the two panes (list left, reader right). Presentation lives in components/inbox/*.
 */
export default function MessageCenter({ sessionName, agentId, allAgents, hostUrl, isActive = false }: MessageCenterProps) {
  // Use agentId as primary identifier if available, fall back to sessionName
  const messageIdentifier = agentId || sessionName
  // Base URL for API calls - empty for local, full URL for remote hosts
  const apiBaseUrl = hostUrl || ''
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [sentMessages, setSentMessages] = useState<MessageSummary[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [view, setView] = useState<'inbox' | 'sent' | 'compose'>('inbox')
  const [unreadCount, setUnreadCount] = useState(0)
  const [sentCount, setSentCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isForwarding, setIsForwarding] = useState(false)
  const [forwardingOriginalMessage, setForwardingOriginalMessage] = useState<Message | null>(null)
  const [inboxLimit, setInboxLimit] = useState(25)  // Pagination: number of inbox messages to load
  const [sentLimit, setSentLimit] = useState(25)    // Pagination: number of sent messages to load
  const [hasMoreInbox, setHasMoreInbox] = useState(false)
  const [hasMoreSent, setHasMoreSent] = useState(false)

  // Compose form state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeMessage, setComposeMessage] = useState('')
  const [composePriority, setComposePriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [composeType, setComposeType] = useState<'request' | 'response' | 'notification' | 'update'>('request')

  // Inline reply bar (reader footer) state
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)

  // Presentation-only state
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [showExternalAgentInfo, setShowExternalAgentInfo] = useState(false)
  const [width, setWidth] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  // Toast notification state (replaces native alert/confirm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  // The other party as an avatar subject: the registered agent when we know it, else a name-only stand-in
  const counterpartOf = (m: MessageSummary | Message, box: Box): AgentAvatarSubject => {
    const ref = box === 'inbox'
      ? { id: m.from, alias: m.fromAlias, label: m.fromLabel }
      : { id: m.to, alias: m.toAlias, label: m.toLabel }
    const known = findAgentByRef(allAgents, ref.id, ref.alias, ref.label)
    return known
      ? { id: known.id, name: known.name, label: known.alias, avatar: known.avatar }
      : { id: ref.id, name: ref.alias || ref.id, label: ref.label }
  }

  // Show a toast notification that auto-dismisses
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Fetch inbox messages with pagination
  const fetchMessages = useCallback(async (limit?: number) => {
    try {
      const fetchLimit = limit ?? inboxLimit
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&box=inbox&limit=${fetchLimit}`)
      if (!response.ok) return
      const data = await response.json()
      const msgs = data.messages || []
      setMessages(msgs)
      // If we got exactly the limit, there may be more
      setHasMoreInbox(msgs.length === fetchLimit)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [messageIdentifier, apiBaseUrl, inboxLimit])

  // Fetch sent messages with pagination
  const fetchSentMessages = useCallback(async (limit?: number) => {
    try {
      const fetchLimit = limit ?? sentLimit
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&box=sent&limit=${fetchLimit}`)
      if (!response.ok) return
      const data = await response.json()
      const msgs = data.messages || []
      setSentMessages(msgs)
      // If we got exactly the limit, there may be more
      setHasMoreSent(msgs.length === fetchLimit)
    } catch (error) {
      console.error('Error fetching sent messages:', error)
    }
  }, [messageIdentifier, apiBaseUrl, sentLimit])

  // Load more inbox messages
  const loadMoreInbox = useCallback(() => {
    const newLimit = inboxLimit + 25
    setInboxLimit(newLimit)
    fetchMessages(newLimit)
  }, [inboxLimit, fetchMessages])

  // Load more sent messages
  const loadMoreSent = useCallback(() => {
    const newLimit = sentLimit + 25
    setSentLimit(newLimit)
    fetchSentMessages(newLimit)
  }, [sentLimit, fetchSentMessages])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&action=unread-count`)
      if (!response.ok) return
      const data = await response.json()
      setUnreadCount(data.count || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [messageIdentifier, apiBaseUrl])

  // Fetch sent count
  const fetchSentCount = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&action=sent-count`)
      if (!response.ok) return
      const data = await response.json()
      setSentCount(data.count || 0)
    } catch (error) {
      console.error('Error fetching sent count:', error)
    }
  }, [messageIdentifier, apiBaseUrl])

  // Load message details
  const loadMessage = async (messageId: string, box: 'inbox' | 'sent' = 'inbox') => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&id=${messageId}&box=${box}`)
      if (!response.ok) return
      const message = await response.json()
      setSelectedMessage(message)

      // Mark as read if unread (inbox only)
      if (box === 'inbox' && message.status === 'unread') {
        await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&id=${messageId}&action=read`, {
          method: 'PATCH',
        })
        fetchMessages()
        fetchUnreadCount()
      }
    } catch (error) {
      console.error('Error loading message:', error)
    }
  }

  // POST a new message (shared by the compose form and the reply bar)
  const postNewMessage = (to: string, subject: string, priority: 'low' | 'normal' | 'high' | 'urgent', type: 'request' | 'response' | 'notification' | 'update', message: string) =>
    fetch(`${apiBaseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: sessionName,
        to,
        subject,
        priority,
        content: {
          type,
          message,
        },
      }),
    })

  // Send message
  const sendMessage = async () => {
    if (!composeTo || !composeSubject || !composeMessage) {
      showToast('Please fill in all fields', 'error')
      return
    }

    setLoading(true)
    try {
      // If forwarding, use the forward API
      if (isForwarding && forwardingOriginalMessage) {
        // Extract the note from the message (everything before "--- Forwarded Message ---")
        const forwardNote = composeMessage.split('--- Forwarded Message ---')[0].trim()

        const response = await fetch(`${apiBaseUrl}/api/messages/forward`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: forwardingOriginalMessage.id,
            fromSession: messageIdentifier,
            toSession: composeTo,
            forwardNote: forwardNote || undefined,
          }),
        })

        if (response.ok) {
          // Reset form
          setComposeTo('')
          setComposeSubject('')
          setComposeMessage('')
          setComposePriority('normal')
          setComposeType('request')
          setIsForwarding(false)
          setForwardingOriginalMessage(null)
          setView('inbox')
          showToast('Message forwarded successfully!', 'success')
          fetchMessages()
          fetchUnreadCount()
        } else {
          const error = await response.json()
          showToast(`Failed to forward: ${error.error}`, 'error')
        }
      } else {
        // Regular message send
        const response = await postNewMessage(composeTo, composeSubject, composePriority, composeType, composeMessage)

        if (response.ok) {
          // Reset form
          setComposeTo('')
          setComposeSubject('')
          setComposeMessage('')
          setComposePriority('normal')
          setComposeType('request')
          setView('inbox')
          showToast('Message sent successfully!', 'success')
        } else {
          showToast('Failed to send message', 'error')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      showToast('Error sending message', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Quick reply from the reader footer: the same send path as the compose form, prefilled like Reply always was
  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return
    const draft = replyDraft(selectedMessage)
    setReplySending(true)
    try {
      const response = await postNewMessage(draft.to, draft.subject, 'normal', draft.type, replyText)
      if (response.ok) {
        setReplyText('')
        showToast('Message sent successfully!', 'success')
      } else {
        showToast('Failed to send message', 'error')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      showToast('Error sending message', 'error')
    } finally {
      setReplySending(false)
    }
  }

  // Open the full compose form for the current message, carrying any reply draft along
  const expandReply = () => {
    if (!selectedMessage) return
    const draft = replyDraft(selectedMessage)
    setComposeTo(draft.to)
    setComposeSubject(draft.subject)
    setComposeType(draft.type)
    if (replyText) setComposeMessage(replyText)
    setReplyText('')
    setIsForwarding(false)
    setForwardingOriginalMessage(null)
    setView('compose')
  }

  // Delete message (with confirmation via pendingDelete state)
  const deleteMessage = async (messageId: string) => {
    if (pendingDelete !== messageId) {
      // First click: show confirmation
      setPendingDelete(messageId)
      showToast('Click delete again to confirm', 'info')
      setTimeout(() => setPendingDelete(null), 5000) // Reset after 5s
      return
    }

    // Second click: actually delete
    setPendingDelete(null)
    try {
      await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&id=${messageId}`, {
        method: 'DELETE',
      })
      setSelectedMessage(null)
      fetchMessages()
      fetchUnreadCount()
      showToast('Message deleted', 'success')
    } catch (error) {
      console.error('Error deleting message:', error)
      showToast('Failed to delete message', 'error')
    }
  }

  // Archive message
  const archiveMessage = async (messageId: string) => {
    try {
      await fetch(`${apiBaseUrl}/api/messages?agent=${encodeURIComponent(messageIdentifier)}&id=${messageId}&action=archive`, {
        method: 'PATCH',
      })
      setSelectedMessage(null)
      fetchMessages()
      fetchUnreadCount()
    } catch (error) {
      console.error('Error archiving message:', error)
    }
  }

  // Copy message to clipboard (regular format)
  const copyMessageRegular = async () => {
    if (!selectedMessage) return

    try {
      await navigator.clipboard.writeText(selectedMessage.content.message)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Error copying message:', error)
    }
  }

  // Copy message to clipboard (LLM-friendly markdown format)
  const copyMessageForLLM = async () => {
    if (!selectedMessage) return

    // Format message in markdown for LLM consumption
    const isInboxMessage = view === 'inbox'
    let markdown = `# Message: ${selectedMessage.subject}\n\n`

    if (isInboxMessage) {
      markdown += `**From:** ${formatAgentName(selectedMessage.from, selectedMessage.fromAlias, selectedMessage.fromHost)}\n`
      markdown += `**To:** ${sessionName}\n`
    } else {
      markdown += `**From:** ${sessionName}\n`
      markdown += `**To:** ${formatAgentName(selectedMessage.to, selectedMessage.toAlias, selectedMessage.toHost)}\n`
    }

    markdown += `**Date:** ${new Date(selectedMessage.timestamp).toLocaleString()}\n`
    markdown += `**Priority:** ${selectedMessage.priority}\n`
    markdown += `**Type:** ${selectedMessage.content.type}\n\n`

    markdown += `## Message Content\n\n`
    markdown += `${selectedMessage.content.message}\n`

    if (selectedMessage.content.context) {
      markdown += `\n## Context\n\n`
      markdown += '```json\n'
      markdown += JSON.stringify(selectedMessage.content.context, null, 2)
      markdown += '\n```\n'
    }

    if (selectedMessage.forwardedFrom) {
      markdown += `\n## Forwarding Information\n\n`
      markdown += `**Originally From:** ${selectedMessage.forwardedFrom.originalFrom}\n`
      markdown += `**Originally To:** ${selectedMessage.forwardedFrom.originalTo}\n`
      markdown += `**Original Date:** ${new Date(selectedMessage.forwardedFrom.originalTimestamp).toLocaleString()}\n`
      markdown += `**Forwarded By:** ${selectedMessage.forwardedFrom.forwardedBy}\n`
      markdown += `**Forwarded At:** ${new Date(selectedMessage.forwardedFrom.forwardedAt).toLocaleString()}\n`
      if (selectedMessage.forwardedFrom.forwardNote) {
        markdown += `**Forward Note:** ${selectedMessage.forwardedFrom.forwardNote}\n`
      }
    }

    try {
      await navigator.clipboard.writeText(markdown)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Error copying message:', error)
    }
  }

  // Prepare to forward message
  const prepareForward = (message: Message) => {
    // Build forwarded content with human-readable agent names
    const fromDisplay = formatAgentName(message.from, message.fromAlias, message.fromHost)
    const toDisplay = formatAgentName(message.to, message.toAlias, message.toHost)
    let forwardedContent = `--- Forwarded Message ---\n`
    forwardedContent += `From: ${fromDisplay}\n`
    forwardedContent += `To: ${toDisplay}\n`
    forwardedContent += `Sent: ${new Date(message.timestamp).toLocaleString()}\n`
    forwardedContent += `Subject: ${message.subject}\n\n`
    forwardedContent += `${message.content.message}\n`
    forwardedContent += `--- End of Forwarded Message ---`

    // Set compose form for forwarding
    setComposeTo('')
    setComposeSubject(`Fwd: ${message.subject}`)
    setComposeMessage(forwardedContent)
    setComposePriority(message.priority)
    setComposeType('notification')
    setIsForwarding(true)
    setForwardingOriginalMessage(message)
    setView('compose')
  }

  // Only fetch when this agent is active (prevents API flood with 40+ agents)
  useEffect(() => {
    if (!isActive) return
    fetchMessages()
    fetchSentMessages()
    fetchUnreadCount()
    fetchSentCount()
  }, [messageIdentifier, isActive])

  // Polling - only when active
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      fetchMessages()
      fetchSentMessages()
      fetchUnreadCount()
      fetchSentCount()
    }, 10000)
    return () => clearInterval(interval)
  }, [messageIdentifier, isActive])

  // A reply draft belongs to the message it was written for
  useEffect(() => {
    setReplyText('')
  }, [selectedMessage?.id])

  // Measure our own width: the inbox lives in resizable floating windows and in full-width tabs
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (typeof w === 'number') setWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Switching mailbox drops the open message (it belongs to the other box)
  const changeBox = (next: Box) => {
    setView(next)
    setSelectedMessage(null)
  }

  const narrow = width > 0 && width < TWO_PANE_MIN_WIDTH
  const box: Box = view === 'sent' ? 'sent' : 'inbox'
  const boxMessages = box === 'inbox' ? visibleMessages(messages, unreadOnly, selectedMessage?.id) : sentMessages
  const showList = !narrow || !selectedMessage
  const showReader = !narrow || !!selectedMessage

  return (
    <div ref={rootRef} className="flex flex-col h-full w-full relative bg-surface text-ink">
      {/* Toast notification */}
      {toast && (
        <div role="status" className={`absolute top-2 right-2 z-50 px-4 py-2 rounded-[10px] border text-[13px] font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-raised text-ok border-ok/40' :
          toast.type === 'error' ? 'bg-raised text-danger border-danger/40' :
          'bg-raised text-ink border-hairline'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header: mailbox tabs, unread filter, help, new message */}
      <div className="flex-none flex items-center gap-2 px-3 py-2.5 border-b border-hairline/70">
        <Tabs value={view === 'compose' ? '' : view} onValueChange={v => changeBox(v as Box)}>
          <TabsList className="h-[34px] rounded-full bg-raised/70 p-0.5">
            <TabsTrigger value="inbox" className="h-[28px] rounded-full px-3 text-[13px] gap-1.5 data-[state=active]:bg-ink data-[state=active]:text-sunken">
              Inbox
              {unreadCount > 0 && (
                <span className="min-w-[16px] px-1 rounded-full bg-accent-fill text-white text-[10px] leading-[16px] text-center" aria-label={`${unreadCount} unread`}>{unreadCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="h-[28px] rounded-full px-3 text-[13px] gap-1.5 data-[state=active]:bg-ink data-[state=active]:text-sunken">
              Sent
              {sentCount > 0 && <span className="text-[11px] text-ink-muted">{sentCount}</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {view === 'inbox' && (
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(v => !v)}
            className={`h-[28px] px-2.5 rounded-full border text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${
              unreadOnly ? 'border-accent-fill bg-accent-fill/15 text-ink' : 'border-control-border text-ink-muted hover:text-ink hover:bg-raised'
            }`}
          >
            Unread only
          </button>
        )}
        <span className="ml-auto flex items-center gap-1">
          <IconButton label="Agent types" active={showExternalAgentInfo} onClick={() => setShowExternalAgentInfo(v => !v)}>
            <HelpCircle strokeWidth={1.5} className="w-4 h-4" />
          </IconButton>
          <IconButton label="New message" active={view === 'compose'} onClick={() => setView('compose')}>
            <SquarePen strokeWidth={1.5} className="w-4 h-4" />
          </IconButton>
        </span>
      </div>

      {/* Agent Types Info Panel */}
      {showExternalAgentInfo && (
        <div className="flex-none p-4 bg-raised border-b border-hairline/70">
          <div className="flex items-start gap-4">
            <div className={`flex-1 grid gap-4 ${narrow ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {/* AI Maestro Agents */}
              <div className="p-3 bg-surface rounded-lg border border-hairline">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-ok/20 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-ok" />
                  </div>
                  <span className="text-[14px] font-medium text-ok">AI Maestro Agents</span>
                </div>
                <p className="text-[12px] text-ink-muted mb-2">
                  Registered agents in your AI Maestro network. These appear in autocomplete when composing messages.
                </p>
                <ul className="text-[12px] text-ink-muted space-y-1">
                  <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-ok rounded-full"></span>Local agents on this machine</li>
                  <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-ok rounded-full"></span>Network agents on other hosts</li>
                  <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-ok rounded-full"></span>Push notifications supported</li>
                </ul>
              </div>

              {/* External Agents */}
              <div className="p-3 bg-surface rounded-lg border border-hairline">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <span className="text-[14px] font-medium text-accent">External Agents</span>
                </div>
                <p className="text-[12px] text-ink-muted mb-2">
                  Agents outside AI Maestro that use the messaging API. Type their address manually in compose.
                </p>
                <ul className="text-[12px] text-ink-muted space-y-1">
                  <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-accent rounded-full"></span>Custom Claude Code agents</li>
                  <li className="flex items-center gap-1.5"><span className="w-1 h-1 bg-accent rounded-full"></span>Third-party integrations</li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-accent rounded-full"></span>
                    Use format: <code className="bg-raised px-1 rounded font-mono">name@host</code>
                  </li>
                </ul>
              </div>
            </div>
            <IconButton label="Close agent types" onClick={() => setShowExternalAgentInfo(false)}>
              <X strokeWidth={1.5} className="w-4 h-4" />
            </IconButton>
          </div>
        </div>
      )}

      {/* Inbox / Sent: list left, reader right */}
      {view !== 'compose' && (
        <div className="flex flex-1 min-h-0">
          {showList && (
            <div className={`${narrow ? 'w-full' : 'w-[320px] flex-none border-r border-hairline/70'} min-h-0 flex flex-col`}>
              <MessageList
                box={box}
                messages={boxMessages}
                selectedId={selectedMessage?.id}
                avatarOf={m => counterpartOf(m, box)}
                onSelect={id => loadMessage(id, box)}
                hasMore={box === 'inbox' ? hasMoreInbox : hasMoreSent}
                onLoadMore={box === 'inbox' ? loadMoreInbox : loadMoreSent}
                filteredEmpty={box === 'inbox' && unreadOnly && messages.length > 0}
              />
            </div>
          )}
          {showReader && (
            <MessageReader
              box={box}
              message={selectedMessage}
              avatar={selectedMessage ? counterpartOf(selectedMessage, box) : null}
              onBack={narrow ? () => setSelectedMessage(null) : undefined}
              onArchive={() => selectedMessage && archiveMessage(selectedMessage.id)}
              onDelete={() => selectedMessage && deleteMessage(selectedMessage.id)}
              deleteArmed={!!selectedMessage && pendingDelete === selectedMessage.id}
              onForward={() => selectedMessage && prepareForward(selectedMessage)}
              onCopy={format => (format === 'llm' ? copyMessageForLLM() : copyMessageRegular())}
              copySuccess={copySuccess}
              footer={box === 'inbox' && selectedMessage ? (
                <ComposeBar
                  replyingTo={partyOf(selectedMessage, 'inbox').address}
                  text={replyText}
                  onTextChange={setReplyText}
                  onSend={sendReply}
                  sending={replySending}
                  onExpand={expandReply}
                />
              ) : undefined}
            />
          )}
        </div>
      )}

      {/* Compose View */}
      {view === 'compose' && (
        <div className="flex-1 min-h-0">
          <ComposeForm
            to={composeTo}
            subject={composeSubject}
            message={composeMessage}
            priority={composePriority}
            type={composeType}
            onToChange={setComposeTo}
            onSubjectChange={setComposeSubject}
            onMessageChange={setComposeMessage}
            onPriorityChange={setComposePriority}
            onTypeChange={setComposeType}
            allAgents={allAgents}
            agentId={agentId}
            isForwarding={isForwarding}
            forwardingFrom={forwardingOriginalMessage ? formatAgentName(forwardingOriginalMessage.from, forwardingOriginalMessage.fromAlias, forwardingOriginalMessage.fromHost) : ''}
            loading={loading}
            onSend={sendMessage}
            onCancel={() => {
              setView('inbox')
              setIsForwarding(false)
              setForwardingOriginalMessage(null)
            }}
          />
        </div>
      )}
    </div>
  )
}
