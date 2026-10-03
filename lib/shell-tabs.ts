/**
 * The shell's "Chat" tab shows ChatView or StreamingChatView depending on the
 * selected agent's runtime mode, so a tab chosen for one agent never leaks the
 * other view (and a /stream-chat session) onto the next agent. Spec §5 TabBar.
 */
import type { AgentTab } from '@/components/shell/AgentTabContent'

export function resolveAgentTab(tab: AgentTab, mode: 'terminal' | 'streaming'): AgentTab {
  if (tab === 'chat' || tab === 'streaming' || tab === 'messages') return mode === 'streaming' ? 'streaming' : 'chat'
  return tab
}
