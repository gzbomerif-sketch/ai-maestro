'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Server } from 'lucide-react'
import type { Host } from '@/types/host'
import { Button, IconButton, Notice, EmptyState, GroupLabel, Row, Card } from '@/components/shell/ui'
import HostList from './hosts/HostList'
import HostDetail from './hosts/HostDetail'
import AddHostDialog from './hosts/AddHostDialog'
import { formatDate, type HealthStatus, type OrganizationInfo, type SyncResult } from './hosts/hostUtils'

/** Settings → Hosts: the machines in this mesh, as a list + detail card (T3 Providers style). */
export default function HostsSection() {
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [healthStatus, setHealthStatus] = useState<Record<string, HealthStatus>>({})
  const [hostVersions, setHostVersions] = useState<Record<string, string>>({})
  const [hostSessionCounts, setHostSessionCounts] = useState<Record<string, number>>({})
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)

  // Load hosts and organization on mount
  useEffect(() => {
    fetchHosts()
    fetchOrganization()
  }, [])

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/organization')
      if (response.ok) {
        const data = await response.json()
        setOrganizationInfo(data)
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err)
    }
  }

  // Function to refresh all hosts health/version
  const refreshAllHosts = () => {
    // Get all enabled hosts
    const enabledHosts = hosts.filter(h => h.enabled)

    // Set ALL hosts to 'checking' state first (so user sees all spinners)
    const checkingState: Record<string, 'checking'> = {}
    enabledHosts.forEach(h => { checkingState[h.id] = 'checking' })
    setHealthStatus(prev => ({ ...prev, ...checkingState }))

    // Then check each host
    enabledHosts.forEach(host => {
      if (host.isSelf) {
        // For this machine, fetch version and sessions directly (no proxy needed)
        Promise.all([
          fetch('/api/config').then(res => res.json()),
          fetch('/api/sessions').then(res => res.json())
        ])
          .then(([configData, sessionsData]) => {
            if (configData.version) {
              setHostVersions(prev => ({ ...prev, [host.id]: configData.version }))
            }
            if (sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
              setHostSessionCounts(prev => ({ ...prev, [host.id]: sessionsData.sessions.length }))
            }
            setHealthStatus(prev => ({ ...prev, [host.id]: 'online' }))
          })
          .catch(() => {
            setHealthStatus(prev => ({ ...prev, [host.id]: 'offline' }))
          })
      } else {
        // For remote hosts, use the health proxy (don't set 'checking' again, already done above)
        checkHealthWithoutSettingChecking(host)
      }
    })
  }

  // Check health without setting 'checking' state (used by refreshAllHosts which sets it upfront)
  const checkHealthWithoutSettingChecking = async (host: Host) => {
    try {
      const response = await fetch(`/api/hosts/health?url=${encodeURIComponent(host.url)}`, {
        signal: AbortSignal.timeout(15000),
      })

      if (response.ok) {
        const data = await response.json()
        setHealthStatus(prev => ({ ...prev, [host.id]: 'online' }))
        if (data.version) {
          setHostVersions(prev => ({ ...prev, [host.id]: data.version }))
        }
        if (typeof data.sessionCount === 'number') {
          setHostSessionCounts(prev => ({ ...prev, [host.id]: data.sessionCount }))
        }
      } else {
        setHealthStatus(prev => ({ ...prev, [host.id]: 'offline' }))
      }
    } catch {
      setHealthStatus(prev => ({ ...prev, [host.id]: 'offline' }))
    }
  }

  // Auto-check health for all hosts on mount to get versions
  useEffect(() => {
    if (hosts.length > 0) {
      refreshAllHosts()
    }
  }, [hosts]) // Run when hosts change (not just length)

  const fetchHosts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hosts')
      if (!response.ok) throw new Error('Failed to fetch hosts')
      const data = await response.json()
      setHosts(data.hosts || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hosts')
    } finally {
      setLoading(false)
    }
  }

  const checkHealth = async (host: Host) => {
    setHealthStatus(prev => ({ ...prev, [host.id]: 'checking' }))

    try {
      // Use proxy endpoint to avoid CORS and network accessibility issues
      const response = await fetch(`/api/hosts/health?url=${encodeURIComponent(host.url)}`, {
        signal: AbortSignal.timeout(15000), // 15 second timeout (remote /api/sessions can take 5-10s)
      })

      if (response.ok) {
        const data = await response.json()
        setHealthStatus(prev => ({ ...prev, [host.id]: 'online' }))
        // Store version if available
        if (data.version) {
          setHostVersions(prev => ({ ...prev, [host.id]: data.version }))
        }
        // Store session count if available
        if (typeof data.sessionCount === 'number') {
          setHostSessionCounts(prev => ({ ...prev, [host.id]: data.sessionCount }))
        }
      } else {
        setHealthStatus(prev => ({ ...prev, [host.id]: 'offline' }))
      }
    } catch (err) {
      console.error(`Health check failed for ${host.id}:`, err)
      setHealthStatus(prev => ({ ...prev, [host.id]: 'offline' }))
    }
  }

  const handleAdd = async (hostData: Partial<Host>): Promise<SyncResult | void> => {
    try {
      const response = await fetch('/api/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hostData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to add host')
      }

      await fetchHosts()

      // Return sync result if available
      if (data.sync) {
        return data.sync as SyncResult
      }
    } catch (err) {
      throw err
    }
  }

  const handleUpdate = async (hostId: string, data: Partial<Host>) => {
    const response = await fetch(`/api/hosts/${hostId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const message = body.message || body.error || 'Failed to update host'
      setError(message)
      throw new Error(message)
    }
    setError(null)
    await fetchHosts()
  }

  const handleDelete = async (hostId: string) => {
    if (!confirm('Are you sure you want to delete this host?')) return

    try {
      const response = await fetch(`/api/hosts/${hostId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || data.error || 'Failed to delete host')
      }

      await fetchHosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete host')
    }
  }

  // Keep a valid selection: this machine first, else the first host
  useEffect(() => {
    if (hosts.length === 0) { setSelectedId(null); return }
    if (!selectedId || !hosts.some(h => h.id === selectedId)) {
      setSelectedId((hosts.find(h => h.isSelf) ?? hosts[0]).id)
    }
  }, [hosts, selectedId])

  useEffect(() => { if (hosts.length > 0) setCheckedAt(Date.now()) }, [hosts])

  const checking = Object.values(healthStatus).some(s => s === 'checking')
  const selected = hosts.find(h => h.id === selectedId)
  const minutesAgo = checkedAt ? Math.round((Date.now() - checkedAt) / 60000) : null

  return (
    <>
      {organizationInfo?.isSet && (
        <>
          <GroupLabel>Organization</GroupLabel>
          <Card>
            <Row wrap title={<span className="font-mono">{organizationInfo.organization}</span>}
              description={<>Set by {organizationInfo.setBy} on {formatDate(organizationInfo.setAt)} · permanent. Agents are addressed as <code className="font-mono">name@{organizationInfo.organization}.aimaestro.local</code></>} />
          </Card>
        </>
      )}

      <GroupLabel action={
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <IconButton label="Refresh all hosts" onClick={() => { refreshAllHosts(); setCheckedAt(Date.now()) }}>
              <RefreshCw strokeWidth={1.5} className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            </IconButton>
            {minutesAgo !== null && <span className="font-mono">{checking ? 'Checking…' : `Checked ${minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`}`}</span>}
          </span>
          <Button onClick={() => setShowWizard(true)}><Plus strokeWidth={1.5} className="w-4 h-4" />Add host</Button>
        </span>
      }>Machines in your mesh</GroupLabel>

      {error && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}

      <div className="flex bg-surface border border-hairline rounded-[14px] overflow-hidden min-h-[520px]">
        {loading ? (
          <div className="p-6"><Notice>Loading hosts…</Notice></div>
        ) : hosts.length === 0 ? (
          <div className="flex-1"><EmptyState icon={<Server strokeWidth={1.5} className="w-6 h-6" />} title="No hosts configured"
            description="Add another AI Maestro instance to run agents across machines."
            action={<Button variant="accent" onClick={() => setShowWizard(true)}><Plus strokeWidth={1.5} className="w-4 h-4" />Add host</Button>} /></div>
        ) : (
          <>
            <HostList hosts={hosts} selectedId={selectedId} onSelect={setSelectedId}
              health={healthStatus} versions={hostVersions} sessionCounts={hostSessionCounts}
              onToggleEnabled={(host, enabled) => { handleUpdate(host.id, { ...host, enabled }).catch(() => {}) }} />
            {selected && (
              <HostDetail host={selected} health={healthStatus[selected.id]} version={hostVersions[selected.id]} sessions={hostSessionCounts[selected.id]}
                onSave={data => handleUpdate(selected.id, data)} onCheck={() => checkHealth(selected)} onDelete={() => handleDelete(selected.id)} />
            )}
          </>
        )}
      </div>

      <AddHostDialog open={showWizard} onAdd={handleAdd} onClose={() => setShowWizard(false)} />
    </>
  )
}
