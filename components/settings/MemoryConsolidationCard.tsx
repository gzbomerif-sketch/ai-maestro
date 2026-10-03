'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Pause, Play, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, Row, Button, Select, NumberField, Toggle, Notice, GroupLabel } from '@/components/shell/ui'

/**
 * Settings → Memory: when and how much consolidation runs on this host.
 * Consolidation is the part of memory that spends money (Jev on the host's key,
 * the summarizer on the Claude subscription). See lib/memory/settings.ts.
 */

interface Consolidation {
  paused: boolean
  startHour: number
  endHour: number
  backlog: boolean
  agentsPerSweep: number
  maxPassagesPerRun: number
  maxSummaryCallsPerRun: number
}

interface Status {
  state: 'paused' | 'in_window' | 'scheduled'
  pausedByEnvironment: boolean
  inWindow: boolean
  nextWindowAt: string | null
  backlogRunning: boolean
  agents: { memoryOn: number; building: number; historyWaiting: number }
  lastRunAt: number | null
  last24h: { agents: number; conversations: number; memories: number }
}

const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const windowHours = (c: Pick<Consolidation, 'startHour' | 'endHour'>) => ((c.endHour - c.startHour + 24) % 24) || 24

function ago(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

function when(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `today at ${time}`
  if (d.toDateString() === tomorrow.toDateString()) return `tonight at ${time}`
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

/** Everything the Save button covers (pause saves on its own) */
const scheduleOf = (c: Consolidation): Omit<Consolidation, 'paused'> => ({
  startHour: c.startHour,
  endHour: c.endHour,
  backlog: c.backlog,
  agentsPerSweep: c.agentsPerSweep,
  maxPassagesPerRun: c.maxPassagesPerRun,
  maxSummaryCallsPerRun: c.maxSummaryCallsPerRun,
})

const STATE_PILL: Record<Status['state'], { label: string; cls: string }> = {
  paused: { label: 'Paused', cls: 'text-warn' },
  in_window: { label: 'Window open', cls: 'text-ok' },
  scheduled: { label: 'Scheduled', cls: 'text-accent' },
}

export default function MemoryConsolidationCard() {
  const [stored, setStored] = useState<Consolidation | null>(null)
  const [form, setForm] = useState<Consolidation | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState<'pause' | 'save' | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [advanced, setAdvanced] = useState(false)

  const apply = (data: { consolidation: Consolidation; status: Status }) => {
    setStored(data.consolidation)
    setForm(data.consolidation)
    setStatus(data.status)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/memory')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      apply(await res.json())
    } catch (err) {
      setMessage({ ok: false, text: `Could not load: ${(err as Error).message}` })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const put = async (consolidation: Partial<Consolidation>, kind: 'pause' | 'save', ok: string) => {
    setBusy(kind)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consolidation }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`)
      apply(data)
      setMessage({ ok: true, text: ok })
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message })
    } finally {
      setBusy(null)
    }
  }

  if (!form || !stored || !status) {
    return (
      <>
        <GroupLabel>Consolidation</GroupLabel>
        <Card><div className="px-[22px] py-4">{message ? <Notice tone="error">{message.text}</Notice> : <Notice><span className="inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</span></Notice>}</div></Card>
      </>
    )
  }

  const paused = stored.paused
  const scheduleForm = scheduleOf(form)
  const dirty = JSON.stringify(scheduleForm) !== JSON.stringify(scheduleOf(stored))
  const pill = STATE_PILL[status.state]
  const set = (patch: Partial<Consolidation>) => setForm({ ...form, ...patch })
  const hours = Array.from({ length: 24 }, (_, h) => h)
  const stat = (value: ReactNode, sub?: ReactNode) => <span className="text-[14px] text-ink">{value}{sub && <span className="text-ink-muted"> {sub}</span>}</span>

  return (
    <>
      <GroupLabel action={
        <span className="flex items-center gap-3 text-[13px]">
          <span className={pill.cls}>{pill.label}</span>
          {status.backlogRunning && <span className="text-ok">Catching up history</span>}
        </span>
      }>Consolidation</GroupLabel>
      <Card>
        <Row wrap title={stored.paused ? 'Paused' : 'Running on schedule'}
          description={status.pausedByEnvironment
            ? 'Paused by MEMORY_CONSOLIDATION_PAUSED on this host. Remove it to resume.'
            : paused
              ? "No new runs start: not the nightly schedule, the history catch-up, or an agent's Consolidate button. A run in progress finishes."
              : 'Turns conversations into memories. This is the part that costs money (classifier key, Claude summarizer). Search and recall stay local.'}
          control={
            <Button variant={stored.paused ? 'accent' : 'outline'} disabled={busy !== null || status.pausedByEnvironment}
              onClick={() => put({ paused: !stored.paused }, 'pause', stored.paused ? 'Resumed' : 'Paused')}>
              {busy === 'pause' ? <Loader2 className="w-4 h-4 animate-spin" /> : stored.paused ? <Play strokeWidth={1.5} className="w-4 h-4" /> : <Pause strokeWidth={1.5} className="w-4 h-4" />}
              {stored.paused ? 'Resume' : 'Pause'}
            </Button>
          } />
        <Row title="Agents building memory" control={stat(status.agents.building, `of ${status.agents.memoryOn} with memory`)} />
        <Row title="History still waiting" control={stat(status.agents.historyWaiting, 'agents')} />
        <Row title="Last run" control={stat(status.lastRunAt ? ago(status.lastRunAt) : 'never')} />
        <Row title="Last 24 hours" control={stat(`${status.last24h.memories} memories`, `from ${status.last24h.conversations} conversations, ${status.last24h.agents} agents`)} />
      </Card>

      <GroupLabel>Schedule</GroupLabel>
      <Card>
        <Row wrap title="Nightly window"
          description={<>{windowHours(form)} hours. {!stored.paused && status.nextWindowAt && !dirty && (status.inWindow ? 'Open now. ' : `Next ${when(status.nextWindowAt)}. `)}Each agent with memory consolidates once at the start.</>}
          control={
            <span className="flex items-center gap-2 text-[14px] text-ink-muted">
              <Select value={form.startHour} onChange={e => set({ startHour: Number(e.target.value) })} aria-label="Window start">
                {hours.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </Select>
              to
              <Select value={form.endHour} onChange={e => set({ endHour: Number(e.target.value) })} aria-label="Window end">
                {hours.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </Select>
            </span>
          } />
        <Row wrap title="Catch up older history"
          description="Agents with months of conversations keep consolidating, newest first, until the window closes. Off: one run per agent per night."
          control={<Toggle checked={form.backlog} onChange={v => set({ backlog: v })} label="Catch up older history" />} />
        <button type="button" onClick={() => setAdvanced(!advanced)}
          className="w-full flex items-center gap-1.5 px-[22px] py-3 border-t border-hairline/70 text-[14px] text-ink-muted hover:text-ink">
          {advanced ? <ChevronDown strokeWidth={1.5} className="w-4 h-4" /> : <ChevronRight strokeWidth={1.5} className="w-4 h-4" />}Limits per run
        </button>
        {advanced && (
          <>
            <Row wrap title="Classifier calls" description="Jev calls per agent per run (50–10,000). The next run continues."
              control={<NumberField min={50} max={10000} step={50} value={form.maxPassagesPerRun} onChange={e => set({ maxPassagesPerRun: Number(e.target.value) })} aria-label="Classifier calls" />} />
            <Row wrap title="Summarizer calls" description="Claude calls per agent per run (0–50). 0 keeps verbatim memories only."
              control={<NumberField min={0} max={50} value={form.maxSummaryCallsPerRun} onChange={e => set({ maxSummaryCallsPerRun: Number(e.target.value) })} aria-label="Summarizer calls" />} />
            <Row wrap title="Agents per pass" description="Agents the night sweep visits every 15 minutes (1–200)."
              control={<NumberField min={1} max={200} value={form.agentsPerSweep} onChange={e => set({ agentsPerSweep: Number(e.target.value) })} aria-label="Agents per pass" />} />
          </>
        )}
        {(dirty || message) && (
          <div className="flex items-center gap-3 px-[22px] py-4 border-t border-hairline/70">
            {message && <Notice tone={message.ok ? 'success' : 'error'}>{message.text}</Notice>}
            {dirty && (
              <span className="ml-auto flex gap-2">
                <Button onClick={() => setForm(stored)}>Discard</Button>
                <Button variant="accent" onClick={() => put(scheduleForm, 'save', 'Saved')} disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Save schedule'}</Button>
              </span>
            )}
          </div>
        )}
      </Card>
      <p className="mt-3 text-[13px] text-gray-500">
        These apply to every agent on this host. Per agent, memory and recall are switched in the agent&apos;s Skills tab.
      </p>
    </>
  )
}
