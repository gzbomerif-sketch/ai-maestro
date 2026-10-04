'use client'

import type { Agent } from '@/types/agent'
import { PANEL_TYPES, type PanelType } from '@/lib/panel-layout'
import { PANEL_ICONS } from './PanelMenu'
import DockFrame, { type LayoutAction, type PanelState } from './DockFrame'
import { renderTool } from './PanelBody'

/** Legacy agent tool dock (unused by the command-center shell; see DockFrame). Agent tool panel: Terminal, Inbox, Files, Memory… for the selected agent. */
export default function PanelDock({ layout, dispatch, agent, onlineAgents, unread, wakingAgentId, onWake, onShowProfile }: {
  layout: { panel: PanelState }
  dispatch: React.Dispatch<LayoutAction>
  agent: Agent
  onlineAgents: Agent[]
  unread: number
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
}) {
  const p = layout.panel
  const labelOf = (t: PanelType) => PANEL_TYPES.find(x => x.id === t)?.label ?? t
  return (
    <DockFrame
      panel={p} dispatch={dispatch} scope="agent"
      tabs={p.tabs.map(t => ({ id: t, label: labelOf(t), icon: PANEL_ICONS[t], badge: t === 'inbox' ? unread : undefined }))}
      active={p.active}
      onActivate={id => dispatch({ type: 'activate', panel: id as PanelType })}
      onClose={id => dispatch({ type: 'close', panel: id as PanelType })}
      menuItems={PANEL_TYPES.map(t => ({ id: t.id, label: t.label, key: t.key, icon: PANEL_ICONS[t.id] }))}
      onPick={id => dispatch({ type: 'open', panel: id as PanelType })}
      emptyHint="Use ＋ or ⌘J. Terminal, Inbox, Files, Memory and more open here."
    >
      {p.active && renderTool(p.active, { agent, onlineAgents, wakingAgentId, onWake, onShowProfile, minimized: false, z: 0 })}
    </DockFrame>
  )
}
