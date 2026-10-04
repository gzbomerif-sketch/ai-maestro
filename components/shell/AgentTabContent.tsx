'use client'

import dynamic from 'next/dynamic'
import TerminalView from '@/components/TerminalView'
import ChatView from '@/components/ChatView'
import StreamingChatView from '@/components/StreamingChatView'
import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import WorkTree from '@/components/WorkTree'
import AgentSearch from '@/components/AgentSearch'
import TranscriptExport from '@/components/TranscriptExport'
import AgentPlayback from '@/components/AgentPlayback'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import { isHibernated as isAgentHibernated } from '@/lib/agent-status'
import { Terminal, Moon, Power, Loader2, Zap } from 'lucide-react'
import type { Agent } from '@/types/agent'

const MemoryViewer = dynamic(() => import('@/components/MemoryViewer'), { ssr: false })
const AgentGraph = dynamic(() => import('@/components/AgentGraph'), { ssr: false })
const DocumentationPanel = dynamic(() => import('@/components/DocumentationPanel'), { ssr: false })
const CanvasPanel = dynamic(() => import('@/components/CanvasPanel'), { ssr: false })

export type AgentTab = 'terminal' | 'chat' | 'streaming' | 'messages' | 'worktree' | 'graph' | 'memory' | 'docs' | 'canvas' | 'search' | 'export' | 'playback'

export interface AgentTabContentProps {
  agent: Agent
  activeTab: AgentTab
  setActiveTab: (t: AgentTab) => void
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (agent: Agent) => void
  onShowProfile: (agent: Agent) => void
  hideHeaders?: boolean
  chatVariant?: 'classic' | 'ink'
}

/** The per-agent tab panels, shared by the classic layout and the command-center shell. */
export default function AgentTabContent({
  agent, activeTab, setActiveTab, onlineAgents, wakingAgentId, onWake, onShowProfile,
  hideHeaders = false, chatVariant = 'classic',
}: AgentTabContentProps) {
  const isActive = true
  const isHibernated = isAgentHibernated(agent)
  const session = agentToSession(agent)
  const agentMode = getRuntimeMode(agent.id)
  const handleWakeAgent = onWake
  const handleShowAgentProfile = onShowProfile

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {activeTab === 'terminal' ? (
        agentMode === 'streaming' ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-900/30 flex items-center justify-center">
                <Zap className="w-10 h-10 text-amber-400" />
              </div>
              <p className="text-xl mb-2 text-gray-300">{agent.label || agent.name || agent.alias}</p>
              <p className="text-sm mb-2 text-gray-500">Terminal is disabled while this agent runs in streaming mode</p>
              <p className="text-xs text-gray-600 mb-4">Use the Streaming tab. To get the terminal back, hibernate and wake the agent in Terminal mode.</p>
              <button
                onClick={() => setActiveTab('streaming')}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-all flex items-center gap-2 mx-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-2"
              >
                <Zap className="w-4 h-4" /> Go to Streaming
              </button>
            </div>
          </div>
        ) : isHibernated ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-900/30 flex items-center justify-center">
                <Moon className="w-10 h-10 text-yellow-500" />
              </div>
              <p className="text-xl mb-2 text-gray-300">{agent.label || agent.name || agent.alias}</p>
              <p className="text-sm mb-4 text-gray-500">This agent is hibernating</p>
              <button
                onClick={() => handleWakeAgent(agent)}
                disabled={wakingAgentId === agent.id}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-2"
              >
                {wakingAgentId === agent.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waking...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Wake Agent
                  </>
                )}
              </button>
            </div>
          </div>
        ) : session.standalone ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-violet-900/30 flex items-center justify-center">
                <Terminal className="w-10 h-10 text-violet-400" />
              </div>
              <p className="text-xl mb-2 text-gray-300">{agent.label || agent.name || agent.alias}</p>
              <p className="text-sm mb-2 text-gray-500">Standalone Agent</p>
              <p className="text-xs text-gray-600 mb-4">This agent is running outside tmux (plain terminal, API-only, or remote host). No terminal view available.</p>
              <button
                onClick={() => handleShowAgentProfile(agent)}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-2"
              >
                View Profile
              </button>
            </div>
          </div>
        ) : (
          <ErrorBoundary fallbackLabel="Terminal">
            <TerminalView hideHeader={hideHeaders} session={session} isVisible={isActive && activeTab === 'terminal'} avatar={{ src: agent.avatar, hostUrl: getAgentBaseUrl(agent) }} />
          </ErrorBoundary>
        )
      ) : !isActive ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : activeTab === 'chat' ? (
        isHibernated ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-900/30 flex items-center justify-center">
                <Moon className="w-10 h-10 text-yellow-500" />
              </div>
              <p className="text-xl mb-2 text-gray-300">{agent.label || agent.name || agent.alias}</p>
              <p className="text-sm mb-4 text-gray-500">Wake this agent to use the chat interface</p>
              <button
                onClick={() => handleWakeAgent(agent)}
                disabled={wakingAgentId === agent.id}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-2"
              >
                {wakingAgentId === agent.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waking...
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Wake Agent
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <ErrorBoundary fallbackLabel="Chat">
            <ChatView agent={agent} isActive={true} hideHeader={hideHeaders} variant={chatVariant} />
          </ErrorBoundary>
        )
      ) : activeTab === 'streaming' ? (
        // Streaming is self-sufficient: the SDK session spawns on
        // connect and resumes the agent's latest conversation —
        // no tmux/wake needed, works even when tmux-hibernated.
        <ErrorBoundary fallbackLabel="Streaming">
          <StreamingChatView agent={agent} isActive={true} hideHeader={hideHeaders} />
        </ErrorBoundary>
      ) : activeTab === 'messages' ? (
        <ErrorBoundary fallbackLabel="Messages">
          <MessageCenter
            sessionName={session.id}
            agentId={agent.id}
            allAgents={onlineAgents.map(a => ({
              id: a.id,
              name: a.name || a.alias || a.id,  // Technical name for lookups
              alias: a.label || a.name || a.alias || a.id,  // Display name for UI
              tmuxSessionName: a.session?.tmuxSessionName,
              hostId: a.hostId,
              avatar: a.avatar
            }))}
            hostUrl={getAgentBaseUrl(agent)}
            isActive={true}
          />
        </ErrorBoundary>
      ) : activeTab === 'worktree' ? (
        <WorkTree
          sessionName={session.id}
          agentId={agent.id}
          agentAlias={agent.alias}
          hostId={agent.hostId}
          isActive={true}
        />
      ) : activeTab === 'graph' ? (
        <AgentGraph
          sessionName={session.id}
          agentId={agent.id}
          workingDirectory={session.workingDirectory}
          hostUrl={getAgentBaseUrl(agent)}
          isActive={true}
        />
      ) : activeTab === 'memory' ? (
        <MemoryViewer
          agentId={agent.id}
          hostUrl={getAgentBaseUrl(agent)}
          isActive={true}
        />
      ) : activeTab === 'docs' ? (
        <DocumentationPanel
          sessionName={session.id}
          agentId={agent.id}
          workingDirectory={session.workingDirectory}
          hostUrl={getAgentBaseUrl(agent)}
          isActive={true}
        />
      ) : activeTab === 'canvas' ? (
        <CanvasPanel
          agentId={agent.id}
          hostUrl={getAgentBaseUrl(agent)}
          isActive={true}
        />
      ) : activeTab === 'search' ? (
        <div className="flex-1 overflow-auto p-4">
          <AgentSearch
            agentId={agent.id}
            agentName={agent.label || agent.name || agent.alias}
            className="max-w-4xl mx-auto"
          />
        </div>
      ) : activeTab === 'playback' ? (
        <div className="flex-1 overflow-auto p-4">
          <AgentPlayback
            agentId={agent.id}
            sessionId={session.id}
            agentName={agent.label || agent.name || agent.alias}
            className="max-w-4xl mx-auto"
          />
        </div>
      ) : activeTab === 'export' ? (
        <div className="flex-1 overflow-auto p-4">
          <TranscriptExport
            agentId={agent.id}
            agentName={agent.label || agent.name || agent.alias}
            className="max-w-4xl mx-auto"
          />
        </div>
      ) : null}
    </div>
  )
}
