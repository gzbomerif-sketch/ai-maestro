'use client'

import { Inbox, PanelRightClose } from 'lucide-react'
import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import type { Agent } from '@/types/agent'
import { Badge, IconButton } from './ui'

/** Same recipient shape the classic Messages tab passes to MessageCenter. */
function toRecipients(onlineAgents: Agent[]) {
  return onlineAgents.map(a => ({
    id: a.id,
    name: a.name || a.alias || a.id,              // technical name for lookups
    alias: a.label || a.name || a.alias || a.id,  // display name
    tmuxSessionName: a.session?.tmuxSessionName,
    hostId: a.hostId,
  }))
}

export default function InboxPanel({ agent, onlineAgents, unread, onCollapse }: {
  agent: Agent; onlineAgents: Agent[]; unread: number; onCollapse: () => void
}) {
  return (
    <aside className="w-[300px] flex-none flex flex-col border-l border-hairline min-h-0">
      <div className="h-[60px] flex-none flex items-center gap-2 px-4">
        <span className="flex items-center gap-2 rounded-[10px] bg-raised px-3 py-1.5 text-[14px] text-ink">
          <Inbox strokeWidth={1.5} className="w-4 h-4" />Inbox{unread > 0 && <Badge>{unread}</Badge>}
        </span>
        <span className="ml-auto"><IconButton label="Hide inbox" onClick={onCollapse}><PanelRightClose strokeWidth={1.5} className="w-4 h-4" /></IconButton></span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex">
        <ErrorBoundary fallbackLabel="Inbox">
          <MessageCenter
            sessionName={agentToSession(agent).id}
            agentId={agent.id}
            allAgents={toRecipients(onlineAgents)}
            hostUrl={getAgentBaseUrl(agent)}
            isActive={true}
          />
        </ErrorBoundary>
      </div>
    </aside>
  )
}
