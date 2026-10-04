'use client'

import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageSquarePlus, Pencil, SquareTerminal, Sparkles, LayoutDashboard, X } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { PRESENCE_STYLE, type AgentPresence } from '@/lib/agent-presence'
import type { ShellStatus } from '@/lib/agent-status'
import { displayName } from '@/lib/agent-status'
import type { FaceActivity } from '@/lib/avatar-motion'
import { isEditableTarget } from '@/lib/panel-layout'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { Button as ActionButton } from '@/components/ui/button'
import AgentFace from '@/components/AgentFace'
import AvatarPicker from '@/components/AvatarPicker'
import { Badge, Button, EmptyState, Field, IconButton, Notice, StatusDot, Textarea } from './ui'

// ── Pure helpers (tested in tests/colony-profile-card.test.ts) ─────────────────────────────

/** The selected colony agent, or `stale` when the colony named one this host does not know (removed, or on another host). */
export function resolveColonySelection(agents: Agent[], id: string | null): { agent: Agent | null; stale: boolean } {
  if (!id) return { agent: null, stale: false }
  const agent = agents.find(a => a.id === id) ?? null
  return { agent, stale: agent === null }
}

/** presenceOf's vocabulary → the shell's status dot vocabulary. Display only: presence itself comes from presenceOf. */
export function presenceStatus(presence: AgentPresence): ShellStatus {
  return presence === 'ready' ? 'idle' : presence
}

/** presenceOf's vocabulary → how the animated face behaves. */
export function faceActivityFor(presence: AgentPresence): FaceActivity {
  switch (presence) {
    case 'working': return 'active'
    case 'needs-you': return 'waiting'
    case 'offline': return 'offline'
    default: return 'idle'
  }
}

/** The avatar as an image URL AgentFace can paint, or null for an emoji / nothing (the caller shows a fallback). */
export function avatarImageSrc(avatar?: string): string | null {
  if (!avatar) return null
  return /^(https?:\/\/|\/)/.test(avatar) ? avatar : null
}

export interface ProfileDraft {
  label: string
  taskDescription: string
  /** Comma-separated */
  tags: string
  avatar: string
}

export function draftOf(agent: Agent): ProfileDraft {
  return {
    label: agent.label ?? '',
    taskDescription: agent.taskDescription ?? '',
    tags: (agent.tags ?? []).join(', '),
    avatar: agent.avatar ?? '',
  }
}

/** "a, b,, a " → ['a', 'b']: trimmed, no blanks, first occurrence wins. */
export function parseTagsCsv(csv: string): string[] {
  const seen = new Set<string>()
  for (const raw of csv.split(',')) {
    const t = raw.trim()
    if (t) seen.add(t)
  }
  return [...seen]
}

export interface ProfilePatch {
  label?: string
  taskDescription?: string
  tags?: string[]
  avatar?: string
}

/**
 * Only what the user changed, or null when nothing changed. A blank label is left out on purpose: it is a
 * guard against clearing a label by accident (the API would accept it), not an API limitation.
 */
export function buildProfilePatch(agent: Agent, draft: ProfileDraft): ProfilePatch | null {
  const patch: ProfilePatch = {}
  const label = draft.label.trim()
  if (label && label !== (agent.label ?? '')) patch.label = label
  const task = draft.taskDescription.trim()
  if (task !== (agent.taskDescription ?? '').trim()) patch.taskDescription = task
  const tags = parseTagsCsv(draft.tags)
  const before = agent.tags ?? []
  if (tags.length !== before.length || tags.some((t, i) => t !== before[i])) patch.tags = tags
  if (draft.avatar && draft.avatar !== (agent.avatar ?? '')) patch.avatar = draft.avatar
  return Object.keys(patch).length > 0 ? patch : null
}

// ── What the card needs from the shell ────────────────────────────────────────────────────

/**
 * Provided by AppShell around the whole shell so the card works from the agent workspace and the
 * team workspace alike. ColonyPanel renders no card when it is absent.
 */
export interface ColonyCardEnv {
  agents: Agent[]
  unread: Record<string, number>
  /** An agent is mid-wake: New conversation waits */
  wakingAgentId: string | null
  onOpenWorkspace: (agent: Agent) => void
  onOpenTerminal: (agent: Agent) => void
  onOpenSkills: (agent: Agent) => void
  /** Select the agent and, if it is asleep, run the shell's wake flow */
  onNewConversation: (agent: Agent) => void
  /** The agent list changed (a profile edit): re-read it so the sidebar follows */
  onAgentsChanged: () => void
}

export const ColonyCardEnvContext = createContext<ColonyCardEnv | null>(null)

// ── The card ─────────────────────────────────────────────────────────────────────────────

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-3 text-[13px]">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** A bot's profile, shown inside the Colony window when its bot is selected. */
export default function ColonyProfileCard({ agent, env, hidden = false, onClose }: {
  agent: Agent
  env: ColonyCardEnv
  /** The colony window is minimized: the card stays mounted but must not claim Esc */
  hidden?: boolean
  onClose: () => void
}) {
  const { presenceOf } = useSessionActivity()
  const presence = presenceOf(agent)
  const status = presenceStatus(presence)
  const unread = env.unread[agent.id] ?? 0
  const imgSrc = avatarImageSrc(agent.avatar)
  const busy = env.wakingAgentId === agent.id

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>(() => draftOf(agent))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = useMemo(() => buildProfilePatch(agent, draft), [agent, draft])
  const usedAvatars = useMemo(
    () => env.agents.filter(a => a.id !== agent.id && a.avatar).map(a => a.avatar as string),
    [env.agents, agent.id],
  )

  // Esc: leave the form first, then dismiss. Only while the colony window is showing, and never for
  // an Esc meant for something else: a terminal or chat field outside the card, or a dialog/menu/picker.
  // Capture phase + preventDefault is how this stays one-Esc-one-action without touching WorkArea: its
  // bubble listener (maximize restore) already yields to defaultPrevented, so when the card takes the Esc
  // the window stays put and the next Esc restores it.
  const rootRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (hidden) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || pickerOpen) return
      const target = e.target as Element | null
      if (target?.closest?.('[role="dialog"],[aria-modal="true"],[role="menu"]')) return
      if (isEditableTarget(target) && !rootRef.current?.contains(target)) return
      e.preventDefault()
      if (editing) { setEditing(false); setError(null) } else onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [hidden, editing, pickerOpen, onClose])

  const startEdit = () => { setDraft(draftOf(agent)); setError(null); setEditing(true) }

  const save = async () => {
    if (!patch) { setEditing(false); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agent.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error || `Could not save (${res.status})`)
      }
      setEditing(false)
      env.onAgentsChanged()
      // The colony rescans at once, so the bot's name and face follow the edit
      window.dispatchEvent(new Event('aimaestro:colony-refresh'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const name = displayName(agent)
  const host = agent.hostName || agent.hostId
  const program = [agent.program, agent.model].filter(Boolean).join(' · ')

  return (
    <aside ref={rootRef} aria-label={`${name} profile`}
      className="w-full max-w-sm h-full flex flex-col overflow-y-auto bg-surface border-l border-hairline/70 text-ink">
      <header className="flex items-start gap-3 p-4">
        <div className="flex-none w-16 h-16 rounded-[14px] overflow-hidden bg-sunken border border-hairline grid place-items-center text-2xl text-ink-muted">
          {imgSrc
            ? <AgentFace src={imgSrc} width={64} activity={faceActivityFor(presence)} alt={name} />
            : <span aria-hidden>{agent.avatar || name.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-[16px] font-medium text-ink truncate">{name}</h2>
          {agent.label && agent.name && agent.label !== agent.name && (
            <div className="text-[12px] text-ink-muted truncate">{agent.name}</div>
          )}
          <div className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
            <StatusDot status={status} />
            <span>{PRESENCE_STYLE[presence].label}</span>
            {unread > 0 && <Badge>{unread}</Badge>}
          </div>
        </div>
        <div className="flex-none flex items-center">
          {!editing && <IconButton label="Edit profile" onClick={startEdit}><Pencil strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
          <IconButton label="Close profile (Esc)" onClick={onClose}><X strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      </header>

      {editing ? (
        <form className="flex flex-col gap-3 px-4 pb-4" onSubmit={e => { e.preventDefault(); void save() }}>
          <label className="flex flex-col gap-1 text-[13px] text-ink-muted">
            Label
            <Field className="w-full" value={draft.label} placeholder={agent.name} maxLength={80}
              onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-ink-muted">
            Task description
            <Textarea rows={3} value={draft.taskDescription}
              onChange={e => setDraft(d => ({ ...d, taskDescription: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-ink-muted">
            Tags (comma separated)
            <Field className="w-full" value={draft.tags} placeholder="backend, api"
              onChange={e => setDraft(d => ({ ...d, tags: e.target.value }))} />
          </label>
          <div className="flex items-center gap-3 text-[13px] text-ink-muted">
            <span>Avatar</span>
            <ActionButton type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              {draft.avatar && draft.avatar !== (agent.avatar ?? '') ? 'Change again' : 'Change avatar'}
            </ActionButton>
            {draft.avatar && draft.avatar !== (agent.avatar ?? '') && <span className="text-accent">New avatar selected</span>}
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex items-center justify-end gap-2">
            <Button onClick={() => { setEditing(false); setError(null) }} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={saving || !patch}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
            </Button>
          </div>
        </form>
      ) : (
        <dl className="flex flex-col gap-2 px-4 pb-4">
          {agent.taskDescription && <Detail label="Task">{agent.taskDescription}</Detail>}
          {host && <Detail label="Host">{host === 'local' ? 'this Mac' : host}</Detail>}
          {program && <Detail label="Program">{program}</Detail>}
          {agent.workingDirectory && <Detail label="Directory"><span className="font-mono text-[12px] break-all">{agent.workingDirectory}</span></Detail>}
          {agent.tags && agent.tags.length > 0 && (
            <Detail label="Tags">
              <span className="flex flex-wrap gap-1.5">
                {agent.tags.map(t => <span key={t} className="rounded-full border border-hairline px-2 text-[12px] text-ink-muted">{t}</span>)}
              </span>
            </Detail>
          )}
        </dl>
      )}

      <section className="border-t border-hairline/70">
        <h3 className="px-4 pt-3 text-[13px] text-ink-muted">Tasks</h3>
        {/* AgentTaskList lands here (Track B) */}
        <EmptyState title="Tasks arrive with the next update" />
      </section>

      <div className="mt-auto grid grid-cols-2 gap-2 p-4 border-t border-hairline/70">
        <ActionButton variant="default" size="sm" disabled={busy} onClick={() => env.onNewConversation(agent)}>
          {busy ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}New conversation
        </ActionButton>
        <ActionButton variant="outline" size="sm" onClick={() => env.onOpenWorkspace(agent)}>
          <LayoutDashboard />Open workspace
        </ActionButton>
        <ActionButton variant="outline" size="sm" onClick={() => env.onOpenTerminal(agent)}>
          <SquareTerminal />Terminal
        </ActionButton>
        <ActionButton variant="outline" size="sm" onClick={() => env.onOpenSkills(agent)}>
          <Sparkles />Skills
        </ActionButton>
      </div>

      <AvatarPicker
        isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        onSelect={url => setDraft(d => ({ ...d, avatar: url }))}
        currentAvatar={draft.avatar || agent.avatar} usedAvatars={usedAvatars}
      />
    </aside>
  )
}
