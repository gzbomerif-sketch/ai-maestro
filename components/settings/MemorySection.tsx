'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Card, Row, Field, NumberField, Button, IconButton, Notice, GroupLabel } from '@/components/shell/ui'
import MemoryConsolidationCard from './MemoryConsolidationCard'

interface ClassifierView {
  provider: 'jev'
  url: string
  model: string
  minDurable: number
  minImportance: number
  configured: boolean
  apiKeyHint: string | null
}

export default function MemorySection() {
  const [stored, setStored] = useState<ClassifierView | null>(null)
  const [url, setUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [minDurable, setMinDurable] = useState(0.75)
  const [minImportance, setMinImportance] = useState(2.5)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)

  const apply = (c: ClassifierView) => {
    setStored(c)
    setUrl(c.url)
    setModel(c.model)
    setMinDurable(c.minDurable)
    setMinImportance(c.minImportance)
    setApiKey('')
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/memory')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      apply((await res.json()).classifier)
    } catch (err) {
      setStatus({ ok: false, message: `Could not load settings: ${(err as Error).message}` })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const form = () => ({ classifier: { url, model, apiKey, minDurable, minImportance } })

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/settings/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form()),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`)
      apply(data.classifier)
      setStatus({ ok: true, message: 'Saved' })
    } catch (err) {
      setStatus({ ok: false, message: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setStatus(null)
    try {
      const res = await fetch('/api/settings/memory/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form()),
      })
      const data = await res.json()
      setStatus({ ok: Boolean(data.ok), message: data.message || `HTTP ${res.status}` })
    } catch (err) {
      setStatus({ ok: false, message: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const removeKey = async () => {
    setStatus(null)
    const res = await fetch('/api/settings/memory', { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.classifier) {
      apply(data.classifier)
      setStatus({ ok: true, message: 'API key removed' })
    } else {
      setStatus({ ok: false, message: data.message || `HTTP ${res.status}` })
    }
  }

  return (
    <>
      <p className="text-[14px] text-ink-muted max-w-[75ch] mb-2">
        Long-term memory classifies passages of each conversation (your messages, and each paragraph of the agent&apos;s replies)
        with a System One model (Jev by default). It keeps decisions, facts, preferences, patterns, insights and reasoning, word for word.
      </p>

      <MemoryConsolidationCard />

      <GroupLabel action={stored ? (
        <span className={`text-[13px] ${stored.configured ? 'text-ok' : 'text-warn'}`}>
          {stored.configured ? 'Configured' : 'No API key: memory consolidation is off'}
        </span>
      ) : undefined}>Classifier</GroupLabel>
      <Card>
        <Row wrap title="API URL" description={<>Any Jev-compatible endpoint. Requests go to <code className="font-mono text-[13px]">{'{url}'}/v1/systemone</code>.</>}
          control={<Field mono value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.typesafe.ai" aria-label="API URL" />} />
        <Row title="Model" control={<Field mono value={model} onChange={e => setModel(e.target.value)} placeholder="jev-latest" aria-label="Model" />} />
        <Row wrap title="API key" description="Stored only on this host and never sent back to the browser."
          control={
            <span className="flex items-center gap-2">
              <Field type="password" autoComplete="off" mono value={apiKey} onChange={e => setApiKey(e.target.value)} aria-label="API key"
                placeholder={stored?.apiKeyHint ? `Stored ${stored.apiKeyHint} · blank keeps it` : 'Paste your API key'} />
              {stored?.apiKeyHint && <IconButton label="Remove stored key" onClick={removeKey}><Trash2 strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
            </span>
          } />
        <Row wrap title="Minimum “worth remembering” probability" description="0 to 1. Higher keeps fewer, surer passages."
          control={<NumberField step="0.05" min="0" max="1" value={minDurable} onChange={e => setMinDurable(Number(e.target.value))} aria-label="Minimum probability" />} />
        <Row wrap title="Minimum importance" description="0 to 4."
          control={<NumberField step="0.5" min="0" max="4" value={minImportance} onChange={e => setMinImportance(Number(e.target.value))} aria-label="Minimum importance" />} />
        <div className="flex items-center gap-3 px-[22px] py-4 border-t border-hairline/70">
          {status && <Notice tone={status.ok ? 'success' : 'error'}>{status.message}</Notice>}
          <span className="ml-auto flex gap-2">
            <Button onClick={test} disabled={testing}>{testing && <Loader2 className="w-4 h-4 animate-spin" />}Test connection</Button>
            <Button variant="accent" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </span>
        </div>
      </Card>
    </>
  )
}
