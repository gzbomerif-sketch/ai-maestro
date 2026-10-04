'use client'

import type { ReactNode } from 'react'
import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import type { Agent } from '@/types/agent'
import type { PanelType } from '@/lib/panel-layout'
import type { WindowTool } from '@/lib/window-manager'
import { toolLabel } from '@/lib/window-tools'
import AgentTabContent, { type AgentTab } from './AgentTabContent'
import BrowserPanel from './BrowserPanel'
import ColonyPanel from './ColonyPanel'
import { renderTeamTool, type TeamToolData } from './TeamTools'
import { EmptyState } from './ui'

const TAB_FOR: Record<Exclude<PanelType, 'inbox' | 'browser' | 'colony'>, AgentTab> = {
  terminal: 'terminal', files: 'worktree', memory: 'memory', graph: 'graph', docs: 'docs',
  canvas: 'canvas', search: 'search', playback: 'playback', export: 'export',
}

/** Same recipient shape the classic Messages tab passes to MessageCenter. */
function toRecipients(onlineAgents: Agent[]) {
  return onlineAgents.map(a => ({
    id: a.id,
    name: a.name || a.alias || a.id,
    alias: a.label || a.name || a.alias || a.id,
    tmuxSessionName: a.session?.tmuxSessionName,
    hostId: a.hostId,
  }))
}

/** What every tool needs from the shell, whatever the workspace. */
export interface ToolEnv {
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
  /** The window is minimized: still mounted (terminals keep their size and scrollback), just hidden */
  minimized: boolean
  /** The window's stack position (ManagedWindow.z); the colony frame mirrors it */
  z: number
}

export interface ToolContext extends ToolEnv {
  /** The selected agent (agent workspace) */
  agent: Agent | null
  /** Present in a team workspace; its tools come from lib/team-panels */
  team?: TeamToolData
}

function ComingSoon({ tool }: { tool: WindowTool }) {
  return (
    <div className="flex-1 min-h-0 grid place-items-center overflow-auto bg-sunken">
      <EmptyState title={toolLabel(tool)} description="Coming soon. This tool will open here in a later update." />
    </div>
  )
}

/** One tool's content inside its floating window. Every window's content comes through here. */
export function renderTool(tool: WindowTool, ctx: ToolContext): ReactNode {
  if (ctx.team) return renderTeamTool(tool, ctx.team, ctx)
  const { agent } = ctx
  if (!agent) return null
  if (tool === 'browser') return <BrowserPanel />
  if (tool === 'colony') return <ColonyPanel hidden={ctx.minimized} z={ctx.z} />
  if (tool === 'tasks' || tool === 'skills') return <ComingSoon tool={tool} />
  if (tool === 'inbox') {
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ErrorBoundary fallbackLabel="Inbox">
          <MessageCenter sessionName={agentToSession(agent).id} agentId={agent.id} allAgents={toRecipients(ctx.onlineAgents)}
            hostUrl={getAgentBaseUrl(agent)} isActive={true} compact />
        </ErrorBoundary>
      </div>
    )
  }
  const tab = TAB_FOR[tool as keyof typeof TAB_FOR]
  if (!tab) return null
  return (
    <AgentTabContent agent={agent} activeTab={tab} setActiveTab={() => {}} onlineAgents={ctx.onlineAgents}
      wakingAgentId={ctx.wakingAgentId} onWake={ctx.onWake} onShowProfile={ctx.onShowProfile} hideHeaders chatVariant="ink" />
  )
}
