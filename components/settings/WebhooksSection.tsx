'use client'

import { useState, useEffect } from 'react'
import { Webhook, Plus, Trash2, RefreshCw, Check, Copy, PlayCircle } from 'lucide-react'
import { Card, Row, Button, IconButton, StatusDot, Field, Checkbox, Dialog, Notice, EmptyState, GroupLabel } from '@/components/shell/ui'
import type { WebhookSubscription, CreateWebhookRequest, WebhookEventType } from '@/types/agent'
import SecretRevealDialog from './SecretRevealDialog'

const VALID_EVENTS: { id: WebhookEventType; label: string; description: string }[] = [
  { id: 'agent.email.changed', label: 'Email Changed', description: 'When an agent adds or removes email addresses' },
  { id: 'agent.created', label: 'Agent Created', description: 'When a new agent is registered' },
  { id: 'agent.deleted', label: 'Agent Deleted', description: 'When an agent is removed' },
  { id: 'agent.updated', label: 'Agent Updated', description: 'When agent metadata is modified' },
]

export default function WebhooksSection() {
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null)
  const [showSecretDialog, setShowSecretDialog] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState('')

  // Create form state
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState<WebhookEventType[]>(['agent.email.changed'])
  const [newDescription, setNewDescription] = useState('')

  // Fetch webhooks
  const fetchWebhooks = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/webhooks')
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data.webhooks || [])
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to load webhooks')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhooks()
  }, [])

  // Create webhook
  const handleCreate = async () => {
    if (!newUrl.trim() || newEvents.length === 0) return

    setSaving(true)
    setError(null)
    try {
      const payload: CreateWebhookRequest = {
        url: newUrl.trim(),
        events: newEvents,
        description: newDescription.trim() || undefined,
      }

      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        // Show the secret to the user (only time it's visible)
        setRevealedSecret(data.webhook.secret)
        setShowSecretDialog(true)
        setShowCreateDialog(false)
        setNewUrl('')
        setNewEvents(['agent.email.changed'])
        setNewDescription('')
        fetchWebhooks()
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to create webhook')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setSaving(false)
    }
  }

  // Delete webhook
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchWebhooks()
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to delete webhook')
      }
    } catch (err) {
      setError('Failed to connect to server')
    }
  }

  // Test webhook
  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResult(null)
    try {
      const response = await fetch(`/api/webhooks/${id}/test`, {
        method: 'POST',
      })

      const data = await response.json()
      setTestResult({
        id,
        success: data.success,
        message: data.success ? 'Webhook delivered successfully' : (data.message || data.error || 'Delivery failed'),
      })
    } catch (err) {
      setTestResult({
        id,
        success: false,
        message: 'Failed to send test',
      })
    } finally {
      setTestingId(null)
    }
  }

  // Copy secret placeholder
  const copySecret = (id: string) => {
    // Since we don't show secrets, copy the webhook ID instead
    navigator.clipboard.writeText(id)
    setCopiedSecret(id)
    setTimeout(() => setCopiedSecret(null), 2000)
  }

  // Toggle event selection
  const toggleEvent = (eventId: WebhookEventType) => {
    setNewEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const closeCreate = () => {
    setShowCreateDialog(false)
    setNewUrl('')
    setNewEvents(['agent.email.changed'])
    setNewDescription('')
    setError(null)
  }

  return (
    <>
      <GroupLabel action={
        <span className="flex items-center gap-2">
          <IconButton label="Refresh" onClick={fetchWebhooks}><RefreshCw strokeWidth={1.5} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></IconButton>
          <Button onClick={() => setShowCreateDialog(true)}><Plus strokeWidth={1.5} className="w-4 h-4" />Add webhook</Button>
        </span>
      }>Webhooks</GroupLabel>
      <p className="text-[14px] text-ink-muted max-w-[75ch] mb-4">Subscribe external systems, such as email gateways, to agent identity changes.</p>

      {error && !showCreateDialog && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}

      <Card>
        {loading ? (
          <div className="px-[22px] py-6"><Notice><span className="inline-flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Loading webhooks…</span></Notice></div>
        ) : webhooks.length === 0 ? (
          <EmptyState icon={<Webhook strokeWidth={1.5} className="w-6 h-6" />} title="No webhooks yet"
            description="Webhooks let external systems receive real-time notifications when agent identity changes, such as email addresses added or removed."
            action={<Button variant="accent" onClick={() => setShowCreateDialog(true)}><Plus strokeWidth={1.5} className="w-4 h-4" />Create your first webhook</Button>} />
        ) : (
          webhooks.map(webhook => (
            <div key={webhook.id} className="border-t border-hairline/70 first:border-t-0">
              <Row wrap
                title={
                  <span className="flex items-center gap-2 min-w-0">
                    <StatusDot status={webhook.status === 'active' ? 'idle' : 'needs-you'} />
                    <span className="font-mono text-[14px] truncate">{webhook.url}</span>
                    <span className={`text-[12px] ${webhook.status === 'active' ? 'text-ok' : 'text-warn'}`}>{webhook.status}</span>
                    {!!webhook.failureCount && webhook.failureCount > 0 && <span className="text-[12px] text-danger">{webhook.failureCount} failures</span>}
                  </span>
                }
                description={
                  <>
                    {webhook.description && <span className="block">{webhook.description}</span>}
                    <span className="block font-mono text-[12px] text-gray-500 mt-1">{webhook.events.join(' · ')}</span>
                    <span className="block text-[12px] text-gray-500">Created {formatDate(webhook.createdAt)}{webhook.lastDeliveryAt ? ` · Last delivery ${formatDate(webhook.lastDeliveryAt)}` : ''}</span>
                  </>
                }
                control={
                  <span className="flex items-center gap-1">
                    <IconButton label="Send test webhook" onClick={() => handleTest(webhook.id)}>
                      {testingId === webhook.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle strokeWidth={1.5} className="w-4 h-4" />}
                    </IconButton>
                    <IconButton label="Copy webhook ID" onClick={() => copySecret(webhook.id)}>
                      {copiedSecret === webhook.id ? <Check strokeWidth={1.5} className="w-4 h-4 text-ok" /> : <Copy strokeWidth={1.5} className="w-4 h-4" />}
                    </IconButton>
                    <IconButton label="Delete webhook" onClick={() => handleDelete(webhook.id)}><Trash2 strokeWidth={1.5} className="w-4 h-4" /></IconButton>
                  </span>
                } />
              {testResult && testResult.id === webhook.id && (
                <div className="px-[22px] pb-4 -mt-2"><Notice tone={testResult.success ? 'success' : 'error'}>{testResult.message}</Notice></div>
              )}
            </div>
          ))
        )}
      </Card>

      <GroupLabel>How webhooks work</GroupLabel>
      <Card>
        <Row wrap title="Delivery" description="When an event occurs, AI Maestro sends an HTTP POST to your URL. Failed deliveries are retried with exponential backoff." />
        <Row wrap title="Verification" description={<>Payloads include an <code className="font-mono">X-Webhook-Signature</code> header (HMAC SHA-256). Use your webhook secret to verify it.</>} />
      </Card>

      <Dialog open={showCreateDialog} onClose={closeCreate} title="Add webhook" width={560}
        footer={<>
          <Button onClick={closeCreate}>Cancel</Button>
          <Button variant="accent" onClick={handleCreate} disabled={!newUrl.trim() || newEvents.length === 0 || saving}>{saving ? 'Creating…' : 'Create webhook'}</Button>
        </>}>
        <div className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          <label className="block">
            <span className="block text-[14px] text-ink mb-1.5">Endpoint URL</span>
            <Field mono className="w-full" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://your-service.com/webhooks/aimaestro" />
          </label>
          <div>
            <span className="block text-[14px] text-ink mb-2">Events</span>
            <div className="space-y-2.5">
              {VALID_EVENTS.map(ev => (
                <Checkbox key={ev.id} checked={newEvents.includes(ev.id)} onChange={() => toggleEvent(ev.id)}
                  label={ev.label} description={ev.description} />
              ))}
            </div>
          </div>
          <label className="block">
            <span className="block text-[14px] text-ink mb-1.5">Description <span className="text-ink-muted">(optional)</span></span>
            <Field className="w-full" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="e.g., Email gateway routing table updates" />
          </label>
        </div>
      </Dialog>

      <SecretRevealDialog isOpen={showSecretDialog} secret={revealedSecret} onClose={() => { setShowSecretDialog(false); setRevealedSecret('') }} />
    </>
  )
}
