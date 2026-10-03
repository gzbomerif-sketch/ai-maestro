'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Link2, Users, RefreshCw, Loader2 } from 'lucide-react'
import type { Host } from '@/types/host'
import { Dialog, Button, Field, Textarea, Checkbox, Notice } from '@/components/shell/ui'
import type { SyncResult } from './hostUtils'

const EMPTY: Partial<Host> = { id: '', name: '', url: '', type: 'remote', enabled: true, tailscale: false }

/** Add a remote host: discover by URL → confirm details → sync summary. */
export default function AddHostDialog({ open, onAdd, onClose }: {
  open: boolean
  onAdd: (host: Partial<Host>) => Promise<SyncResult | void>
  onClose: () => void
}) {
  const [step, setStep] = useState<'url' | 'details' | 'success'>('url')
  const [url, setUrl] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [hostData, setHostData] = useState<Partial<Host>>(EMPTY)

  const close = () => {
    setStep('url'); setUrl(''); setError(null); setSyncResult(null); setHostData(EMPTY)
    onClose()
  }

  const discover = async () => {
    setDiscovering(true)
    setError(null)
    try {
      let testUrl = url.trim()
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) testUrl = 'http://' + testUrl
      testUrl = testUrl.replace(/\/$/, '')  // no double slashes in API calls
      const parsedUrl = new URL(testUrl)
      // Test via the proxy endpoint to avoid CORS issues
      const response = await fetch(`/api/hosts/health?url=${encodeURIComponent(testUrl)}`, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error('Host is not reachable or is not an AI Maestro instance')
      const hostname = parsedUrl.hostname.replace(/\./g, '-')
      setHostData({
        id: hostname === 'localhost' || hostname === '127-0-0-1' ? `remote-${Date.now()}` : hostname,
        name: parsedUrl.hostname,
        url: testUrl,
        type: 'remote',
        enabled: true,
        tailscale: /^100\./.test(parsedUrl.hostname),  // Tailscale CGNAT range
      })
      setStep('details')
    } catch (err) {
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'Connection timeout - host is not reachable'
        : err instanceof Error ? err.message : 'Invalid URL or host not reachable')
    } finally {
      setDiscovering(false)
    }
  }

  const save = async () => {
    try {
      const result = await onAdd(hostData)
      if (result) setSyncResult(result)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add host')
    }
  }

  const footer = step === 'url'
    ? <>
        <Button onClick={close} disabled={discovering}>Cancel</Button>
        <Button variant="accent" onClick={discover} disabled={discovering || !url.trim()}>
          {discovering ? <><Loader2 className="w-4 h-4 animate-spin" />Discovering…</> : 'Discover host'}
        </Button>
      </>
    : step === 'details'
      ? <>
          <Button onClick={() => setStep('url')}>Back</Button>
          <Button variant="accent" onClick={save} disabled={!hostData.id || !hostData.name || !hostData.url}>Add host</Button>
        </>
      : <Button variant="accent" onClick={close}>Done</Button>

  const field = (label: string, input: React.ReactNode, hint?: string) => (
    <label className="block">
      <span className="block text-[14px] text-ink mb-1.5">{label}</span>
      {input}
      {hint && <span className="block mt-1 text-[12px] text-gray-500">{hint}</span>}
    </label>
  )

  return (
    <Dialog open={open} onClose={close} title={step === 'success' ? 'Host added' : 'Add remote host'} footer={footer}>
      {step === 'url' && (
        <div className="space-y-4">
          <p className="text-[14px] text-ink-muted">Enter the URL of another AI Maestro instance. Connection details are discovered automatically.</p>
          {field('Host URL',
            <Field mono className="w-full" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://100.80.12.6:23000"
              onKeyDown={e => { if (e.key === 'Enter' && url.trim()) discover() }} />,
            'Examples: http://100.80.12.6:23000 (Tailscale), http://192.168.1.10:23000 (local network)')}
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          {field('Host ID', <Field mono className="w-full" value={hostData.id} onChange={e => setHostData({ ...hostData, id: e.target.value })} placeholder="e.g., mac-mini" />,
            'Letters, numbers, dashes and underscores')}
          {field('Name', <Field className="w-full" value={hostData.name} onChange={e => setHostData({ ...hostData, name: e.target.value })} placeholder="e.g., Mac Mini" />)}
          {field('URL', <Field mono className="w-full" value={hostData.url} onChange={e => setHostData({ ...hostData, url: e.target.value })} />)}
          {field('Description (optional)', <Textarea rows={2} value={hostData.description || ''} onChange={e => setHostData({ ...hostData, description: e.target.value })} placeholder="Optional description…" />)}
          <Checkbox checked={!!hostData.tailscale} onChange={v => setHostData({ ...hostData, tailscale: v })} label="Connected via Tailscale VPN" />
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-2.5">
          {!syncResult && <Notice tone="success">You can now create sessions on this remote host.</Notice>}
          {syncResult && (
            <>
              <SyncLine ok={syncResult.localAdd} icon={CheckCircle2} text={syncResult.localAdd ? 'Added to local registry' : 'Already in local registry'} />
              <SyncLine ok={syncResult.backRegistered} icon={Link2} text={syncResult.backRegistered ? 'Registered with remote host' : 'Could not register with remote host'} />
              {syncResult.peersExchanged > 0 && <SyncLine ok icon={Users} text={`Discovered ${syncResult.peersExchanged} new peer${syncResult.peersExchanged !== 1 ? 's' : ''}`} />}
              {syncResult.peersShared > 0 && <SyncLine ok icon={RefreshCw} text={`Shared with ${syncResult.peersShared} existing peer${syncResult.peersShared !== 1 ? 's' : ''}`} />}
              {syncResult.errors.length > 0 && (
                <div className="pt-2 mt-1 border-t border-hairline/70">
                  <div className="text-[13px] text-warn mb-1">Warnings</div>
                  {syncResult.errors.map((e, i) => <div key={i} className="text-[13px] text-ink-muted">{e}</div>)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Dialog>
  )
}

function SyncLine({ ok, icon: Icon, text }: { ok: boolean; icon: typeof CheckCircle2; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[14px] text-ink-muted">
      {ok ? <Icon strokeWidth={1.5} className="w-4 h-4 text-ok" /> : <AlertCircle strokeWidth={1.5} className="w-4 h-4 text-warn" />}{text}
    </div>
  )
}
