'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Team, Meeting } from '@/types/team'
import { activeMeetingFor } from '@/lib/team-panels'
import { SectionLabel, Dialog, Field, Button, Notice } from './ui'

/** Sidebar "Teams" list with a live marker and a create dialog. */
export default function TeamSection({ teams, meetings, activeTeamId, onSelectTeam, onCreateTeam }: {
  teams: Team[]
  meetings: Meeting[]
  activeTeamId: string | null
  onSelectTeam: (id: string) => void
  onCreateTeam: (name: string) => Promise<string | null>
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const close = () => { setCreating(false); setName(''); setError(null) }
  const create = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    const id = await onCreateTeam(name.trim()).catch(() => null)
    setBusy(false)
    if (!id) { setError('Could not create the team.'); return }
    close()
    onSelectTeam(id)
  }

  return (
    <div>
      <SectionLabel count={teams.length || undefined}
        action={<button type="button" aria-label="New team" title="New team" onClick={() => setCreating(true)}
          className="grid place-items-center w-5 h-5 rounded-[6px] text-ink-muted hover:text-ink hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-2"><Plus strokeWidth={1.5} className="w-3.5 h-3.5" /></button>}>
        Teams
      </SectionLabel>
      {teams.map(t => {
        const live = !!activeMeetingFor(t.id, meetings)
        const on = t.id === activeTeamId
        return (
          <button key={t.id} type="button" onClick={() => onSelectTeam(t.id)} aria-current={on ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] transition-colors duration-[120ms] ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${on ? 'relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-accent-fill bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
            <span className="truncate">{t.name}</span>
            <span className="ml-auto text-[12px]">
              {live ? <span className="text-ok">● live</span> : <span className="text-gray-500">{t.agentIds.length || ''}</span>}
            </span>
          </button>
        )
      })}
      <Dialog open={creating} onClose={close} title="New team"
        footer={<><Button onClick={close}>Cancel</Button><Button variant="accent" onClick={create} disabled={!name.trim() || busy}>{busy ? 'Creating…' : 'Create team'}</Button></>}>
        <div className="space-y-3">
          <label className="block">
            <span className="block text-[14px] text-ink mb-1.5">Name</span>
            <Field className="w-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Web launch"
              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) create() }} />
          </label>
          <p className="text-[13px] text-ink-muted">Add members afterwards from the team&apos;s Members panel.</p>
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      </Dialog>
    </div>
  )
}
