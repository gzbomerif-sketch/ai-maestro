'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, Wifi, Loader2 } from 'lucide-react'
import type { Host } from '@/types/host'
import localVersion from '@/version.json'
import { Button, IconButton, Field, Textarea, Toggle, Row, Notice } from '@/components/shell/ui'
import { compareVersions, formatDate, syncSourceLabel, type HealthStatus } from './hostUtils'

const editable = (h: Host) => ({ name: h.name, url: h.url, description: h.description ?? '', tailscale: !!h.tailscale })

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <h4 className="text-[15px] font-normal text-gray-400 mt-6 mb-2.5">{label}</h4>
      <div className="bg-sunken/60 border border-hairline rounded-[14px] overflow-hidden">{children}</div>
    </>
  )
}

/** Right column of the Hosts card: the selected machine's settings, status and removal. */
export default function HostDetail({ host, health, version, sessions, onSave, onCheck, onDelete }: {
  host: Host
  health: HealthStatus | undefined
  version: string | undefined
  sessions: number | undefined
  onSave: (data: Partial<Host>) => Promise<void>
  onCheck: () => void
  onDelete: () => void
}) {
  const [form, setForm] = useState(() => editable(host))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setForm(editable(host)) }, [host])
  useEffect(() => { setSaved(false) }, [host.id])  // the post-save refetch must not hide "Saved"

  const original = editable(host)
  const dirty = JSON.stringify(form) !== JSON.stringify(original)
  const isLocal = host.type === 'local' || host.isSelf
  const outdated = version ? compareVersions(version, localVersion.version) < 0 : false
  const sync = syncSourceLabel(host.syncSource)

  const save = async () => {
    setSaving(true)
    try {
      await onSave({ ...host, ...form, description: form.description || undefined })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 min-w-0 px-[22px] py-[18px] overflow-y-auto">
      <div className="flex items-center gap-2.5">
        <span className="text-[15px] font-medium text-ink truncate">{host.name}</span>
        <span className="font-mono text-[12px] text-gray-500 truncate">{host.id}</span>
        <span className="ml-auto">
          <IconButton label="Revert changes" onClick={() => { setForm(original); setSaved(false) }}><RotateCcw strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </span>
      </div>

      <div className="mt-3.5 bg-sunken/60 border border-hairline rounded-[14px] overflow-hidden">
        <Row wrap title="Display name" description={isLocal ? 'How this machine shows up from other devices.' : 'Shown in the sidebar and breadcrumbs.'}
          control={<Field value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setSaved(false) }} aria-label="Display name" />} />
        {!isLocal && (
          <Row wrap title="URL" description="Where this dashboard reaches the host."
            control={<Field mono value={form.url} onChange={e => { setForm({ ...form, url: e.target.value }); setSaved(false) }} aria-label="URL" />} />
        )}
        <Row wrap title="Description" description="Optional note for your team."
          control={<div className="w-[260px]"><Textarea rows={2} className="min-h-[60px]" value={form.description} placeholder={isLocal ? 'e.g., Main development machine' : ''}
            onChange={e => { setForm({ ...form, description: e.target.value }); setSaved(false) }} aria-label="Description" /></div>} />
        {!isLocal && (
          <Row title="Tailscale VPN" description="This host is reached over Tailscale."
            control={<Toggle checked={form.tailscale} onChange={v => { setForm({ ...form, tailscale: v }); setSaved(false) }} label="Tailscale VPN" />} />
        )}
        {(dirty || saved) && (
          <div className="flex items-center gap-3 px-[22px] py-3.5 border-t border-hairline/70">
            {saved && !dirty && <Notice tone="success">Saved</Notice>}
            {dirty && (
              <span className="ml-auto flex gap-2">
                <Button onClick={() => setForm(original)}>Discard</Button>
                <Button variant="accent" onClick={save} disabled={saving || !form.name.trim() || (!isLocal && !form.url.trim())}>{saving ? 'Saving…' : 'Save'}</Button>
              </span>
            )}
          </div>
        )}
      </div>

      <Group label="Status">
        <Row title="Health" description={host.offlineReason || (host.enabled === false ? 'Disabled: not checked.' : 'Checked through this dashboard.')}
          control={
            <span className="flex items-center gap-3">
              <span className={`text-[14px] ${health === 'online' ? 'text-ok' : health === 'offline' ? 'text-danger' : 'text-ink-muted'}`}>
                {health === 'online' ? '● Online' : health === 'offline' ? '● Offline' : health === 'checking' ? 'Checking…' : 'Unknown'}
              </span>
              {!isLocal && (
                <Button onClick={onCheck} disabled={health === 'checking'}>
                  {health === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi strokeWidth={1.5} className="w-4 h-4" />}Test
                </Button>
              )}
            </span>
          } />
        <Row title="Version" description={outdated ? `Update available (this dashboard runs v${localVersion.version}).` : version ? 'Up to date.' : 'Not reported yet.'}
          control={<span className={`font-mono text-[13px] ${outdated ? 'text-warn' : 'text-ink-muted'}`}>{version ? `v${version}` : '—'}</span>} />
        <Row title="Sessions" description="Agent sessions currently running here."
          control={<span className="text-[14px] text-ink-muted">{typeof sessions === 'number' ? sessions : '—'}</span>} />
        {sync && (
          <Row wrap title="Sync" description={host.lastSyncError ? <span className="text-warn">{host.lastSyncError}</span> : host.syncedAt ? `Last synced ${formatDate(host.syncedAt)}` : undefined}
            control={<span className="text-[14px] text-ink-muted">{sync}</span>} />
        )}
      </Group>

      {!isLocal && (
        <Group label="Danger zone">
          <Row wrap title="Remove host" description="Stops syncing with this machine. Agents on it are not deleted."
            control={<Button variant="danger" onClick={onDelete}>Remove</Button>} />
        </Group>
      )}
    </div>
  )
}
