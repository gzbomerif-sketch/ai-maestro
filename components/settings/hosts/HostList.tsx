'use client'

import type { Host } from '@/types/host'
import localVersion from '@/version.json'
import { Badge, Toggle } from '@/components/shell/ui'
import { compareVersions, type HealthStatus } from './hostUtils'

const DOT: Record<HealthStatus | 'unknown', string> = {
  online: 'bg-ok',
  offline: 'bg-danger',
  checking: 'bg-warn animate-pulse',
  unknown: 'bg-gray-600',
}

/** Left column of the Hosts card: one row per machine, with health and an enabled switch. */
export default function HostList({ hosts, selectedId, onSelect, health, versions, sessionCounts, onToggleEnabled }: {
  hosts: Host[]
  selectedId: string | null
  onSelect: (id: string) => void
  health: Record<string, HealthStatus>
  versions: Record<string, string>
  sessionCounts: Record<string, number>
  onToggleEnabled: (host: Host, enabled: boolean) => void
}) {
  return (
    <ul role="listbox" aria-label="Hosts" className="w-[330px] flex-none border-r border-hairline overflow-y-auto">
      {hosts.map(host => {
        const status = host.enabled === false ? 'unknown' : (health[host.id] ?? 'unknown')
        const version = versions[host.id]
        const outdated = version ? compareVersions(version, localVersion.version) < 0 : false
        const sessions = sessionCounts[host.id]
        const meta = [
          typeof sessions === 'number' ? `${sessions} ${sessions === 1 ? 'session' : 'sessions'}` : null,
          status === 'offline' ? 'unreachable' : status === 'checking' ? 'checking…' : null,
          outdated ? 'update available' : null,
        ].filter(Boolean).join(' · ')
        const selected = host.id === selectedId
        return (
          <li key={host.id} role="option" aria-selected={selected}
            className={`flex items-start gap-3 px-[18px] py-4 border-t border-hairline/70 first:border-t-0 cursor-pointer ${selected ? 'bg-raised/60' : 'hover:bg-raised/30'}`}
            onClick={() => onSelect(host.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(host.id) } }}
            tabIndex={0}>
            <span aria-hidden className={`mt-2 w-[7px] h-[7px] rounded-full flex-none ${DOT[status]}`} />
            <div className="min-w-0 flex-1">
              <div className={`text-[15px] font-medium truncate ${host.enabled === false ? 'text-ink-muted' : 'text-ink'}`}>
                {host.name}{host.isSelf && <span className="ml-2 align-[1px]"><Badge>This Mac</Badge></span>}
              </div>
              <div className="font-mono text-[12px] text-ink-muted truncate">{host.url}</div>
              {(meta || version) && (
                <div className={`text-[13px] truncate ${outdated ? 'text-warn' : 'text-ink-muted'}`}>
                  {meta}{meta && version ? ' · ' : ''}{version && <span className="font-mono text-[12px] text-gray-500">v{version}</span>}
                </div>
              )}
            </div>
            {!host.isSelf && (
              <span className="mt-0.5" onClick={e => e.stopPropagation()}>
                <Toggle checked={host.enabled !== false} onChange={v => onToggleEnabled(host, v)} label={`Enable ${host.name}`} />
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
