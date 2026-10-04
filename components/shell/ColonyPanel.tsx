'use client'

import { useEffect, useState } from 'react'
import { Orbit, RotateCw, ExternalLink } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { colonyFrameUrl, colonyReachableFrom, findAgent, originOf, parseColonyMessage, type ColonyStatus } from '@/lib/colony-message'
import { BROWSER_SANDBOX } from './BrowserPanel'
import { Button, EmptyState, IconButton } from './ui'

/** Status is re-read on this interval so a colony that dies, or finishes starting, shows up. */
const STATUS_POLL_MS = 4000

const UNREACHABLE: ColonyStatus = { enabled: true, running: false, url: null, reason: 'Could not reach AI Maestro for the colony status.', fix: null, log: [] }

/** Bot Crossing, framed: AI Maestro's agents as bots. Clicking one opens that agent. */
export default function ColonyPanel({ agents, onSelectAgent }: { agents: Agent[]; onSelectAgent: (a: Agent) => void }) {
  const [status, setStatus] = useState<ColonyStatus | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      let next = UNREACHABLE
      try {
        const res = await fetch('/api/colony/status', { cache: 'no-store' })
        if (res.ok) next = await res.json() as ColonyStatus
      } catch { /* keep UNREACHABLE */ }
      if (!alive) return
      // Same values keep the same object, so the iframe never remounts on a poll
      setStatus(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next)
      timer = setTimeout(load, STATUS_POLL_MS)
    }
    void load()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [nonce])

  const colonyOrigin = originOf(status?.running ? status.url : null)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const agent = findAgent(agents, parseColonyMessage(event, colonyOrigin))
      if (agent) onSelectAgent(agent)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [agents, colonyOrigin, onSelectAgent])

  if (!status) return <div className="flex-1 min-h-0 bg-sunken" aria-busy="true" />

  if (!status.running || !status.url) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-sunken">
        <EmptyState
          icon={<Orbit strokeWidth={1.5} className="w-6 h-6" />}
          title={status.enabled ? 'Colony isn’t running' : 'Colony is off'}
          description={status.reason ?? 'Bot Crossing has not started yet.'}
          action={
            <div className="flex flex-col items-center gap-3 max-w-full">
              {status.fix && (
                <code className="block max-w-full whitespace-pre-wrap break-all rounded-[8px] border border-hairline/70 bg-surface px-3 py-2 text-left font-mono text-[12px] text-ink">
                  {status.fix}
                </code>
              )}
              {status.log.length > 0 && (
                <pre className="max-w-full max-h-[160px] overflow-auto rounded-[8px] border border-hairline/70 bg-surface px-3 py-2 text-left font-mono text-[11px] text-ink-muted">
                  {status.log.slice(-8).join('\n')}
                </pre>
              )}
              <Button onClick={() => setNonce(n => n + 1)}>Check again</Button>
            </div>
          }
        />
      </div>
    )
  }

  if (!colonyReachableFrom(window.location.hostname)) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-sunken">
        <EmptyState
          icon={<Orbit strokeWidth={1.5} className="w-6 h-6" />}
          title="Colony is only on the host machine"
          description="Bot Crossing runs on the computer that hosts AI Maestro. Open AI Maestro there, at localhost, to see the colony."
        />
      </div>
    )
  }

  const src = colonyFrameUrl(status.url, window.location.origin)
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-sunken">
      <iframe key={`${src}#${nonce}`} src={src} title="Colony" sandbox={BROWSER_SANDBOX} allow="clipboard-write"
        referrerPolicy="no-referrer" className="flex-1 w-full min-h-0 border-0 bg-sunken" />
      <div className="flex-none flex items-center gap-2 pl-3 pr-1 h-[38px] border-t border-hairline/70 text-[12px] text-gray-500">
        <span className="truncate">Based on Bot Crossing. Click a bot, then Open, to go to that agent.</span>
        <span className="ml-auto flex items-center">
          <IconButton label="Reload colony" onClick={() => setNonce(n => n + 1)}>
            <RotateCw strokeWidth={1.5} className="w-4 h-4" />
          </IconButton>
          <IconButton label="Open colony in a new tab" onClick={() => window.open(status.url!, '_blank', 'noopener,noreferrer')}>
            <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
          </IconButton>
        </span>
      </div>
    </div>
  )
}
