'use client'

import { useState, useEffect } from 'react'
import { Globe, Plus, Trash2, RefreshCw, Star } from 'lucide-react'
import { Card, Row, Button, IconButton, Badge, Field, Checkbox, Dialog, Notice, EmptyState, GroupLabel } from '@/components/shell/ui'
import type { EmailDomain, CreateDomainRequest } from '@/types/agent'

export default function DomainsSection() {
  const [domains, setDomains] = useState<EmailDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create form state
  const [newDomain, setNewDomain] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newIsDefault, setNewIsDefault] = useState(false)

  // Fetch domains
  const fetchDomains = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/domains')
      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains || [])
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to load domains')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDomains()
  }, [])

  // Create domain
  const handleCreate = async () => {
    if (!newDomain.trim()) return

    setSaving(true)
    setError(null)
    try {
      const payload: CreateDomainRequest = {
        domain: newDomain.trim(),
        description: newDescription.trim() || undefined,
        isDefault: newIsDefault,
      }

      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setNewDomain('')
        setNewDescription('')
        setNewIsDefault(false)
        fetchDomains()
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to create domain')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setSaving(false)
    }
  }

  // Delete domain
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this domain? Existing email addresses using this domain will NOT be affected.')) return

    try {
      const response = await fetch(`/api/domains/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDomains()
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to delete domain')
      }
    } catch (err) {
      setError('Failed to connect to server')
    }
  }

  // Set as default
  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/domains/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })

      if (response.ok) {
        fetchDomains()
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to set default domain')
      }
    } catch (err) {
      setError('Failed to connect to server')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const closeCreate = () => {
    setShowCreateDialog(false)
    setNewDomain('')
    setNewDescription('')
    setNewIsDefault(false)
    setError(null)
  }

  return (
    <>
      <GroupLabel action={
        <span className="flex items-center gap-2">
          <IconButton label="Refresh" onClick={fetchDomains}><RefreshCw strokeWidth={1.5} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></IconButton>
          <Button onClick={() => setShowCreateDialog(true)}><Plus strokeWidth={1.5} className="w-4 h-4" />Add domain</Button>
        </span>
      }>Email domains</GroupLabel>

      <p className="text-[14px] text-ink-muted max-w-[75ch] mb-4">
        AI Maestro manages email <span className="text-ink">identity</span> only. To send and receive mail you also need an email
        gateway or mail processor that routes these domains to your agents.
      </p>

      {error && !showCreateDialog && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}

      <Card>
        {loading ? (
          <div className="px-[22px] py-6"><Notice><span className="inline-flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Loading domains…</span></Notice></div>
        ) : domains.length === 0 ? (
          <EmptyState icon={<Globe strokeWidth={1.5} className="w-6 h-6" />} title="No domains configured"
            description={<>Add domains you control to create agent email addresses, for example <code className="font-mono">23smartagents.com</code>.</>}
            action={<Button variant="accent" onClick={() => setShowCreateDialog(true)}><Plus strokeWidth={1.5} className="w-4 h-4" />Add your first domain</Button>} />
        ) : (
          domains.map(domain => (
            <Row key={domain.id}
              title={<span className="flex items-center gap-2"><span className="font-mono text-[14px]">{domain.domain}</span>{domain.isDefault && <Badge>Default</Badge>}</span>}
              description={`${domain.description ? `${domain.description} · ` : ''}Added ${formatDate(domain.createdAt)}`}
              control={
                <span className="flex items-center gap-1">
                  {!domain.isDefault && <IconButton label="Set as default" onClick={() => handleSetDefault(domain.id)}><Star strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
                  <IconButton label="Delete domain" onClick={() => handleDelete(domain.id)}><Trash2 strokeWidth={1.5} className="w-4 h-4" /></IconButton>
                </span>
              } />
          ))
        )}
      </Card>

      <Dialog open={showCreateDialog} onClose={closeCreate} title="Add domain"
        footer={<>
          <Button onClick={closeCreate}>Cancel</Button>
          <Button variant="accent" onClick={handleCreate} disabled={!newDomain.trim() || saving}>{saving ? 'Adding…' : 'Add domain'}</Button>
        </>}>
        <div className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          <label className="block">
            <span className="block text-[14px] text-ink mb-1.5">Domain</span>
            <Field mono className="w-full" value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="example.com"
              onKeyDown={e => { if (e.key === 'Enter' && newDomain.trim()) handleCreate() }} />
          </label>
          <label className="block">
            <span className="block text-[14px] text-ink mb-1.5">Description <span className="text-ink-muted">(optional)</span></span>
            <Field className="w-full" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="e.g., Primary domain for customer-facing agents" />
          </label>
          <Checkbox checked={newIsDefault} onChange={setNewIsDefault} label="Set as default domain" description="New agent email addresses use this domain." />
        </div>
      </Dialog>
    </>
  )
}
