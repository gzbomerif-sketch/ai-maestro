'use client'

import { useCallback, useRef, useState } from 'react'
import { Plus, X, Maximize2, Minimize2, PanelBottom, PanelRight, PanelRightClose } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { PANEL_TYPES, type LayoutAction, type LayoutState } from '@/lib/panel-layout'
import { Badge, IconButton, EmptyState } from './ui'
import PanelMenu, { PANEL_ICONS } from './PanelMenu'
import PanelBody from './PanelBody'

/** Tabbed tool panel: chips, ＋ menu, maximize / dock / hide, active body. */
export default function PanelDock({ layout, dispatch, agent, onlineAgents, unread, wakingAgentId, onWake, onShowProfile }: {
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  agent: Agent
  onlineAgents: Agent[]
  unread: number
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const plusRef = useRef<HTMLDivElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const p = layout.panel
  const labelOf = (t: string) => PANEL_TYPES.find(x => x.id === t)?.label ?? t

  return (
    <div className={`h-full w-full min-w-0 min-h-0 flex flex-col bg-sunken ${p.position === 'bottom' ? '' : ''}`}>
      <div className="h-[60px] flex-none flex items-center gap-1.5 px-2.5 border-b border-hairline/70">
        <div role="tablist" aria-label="Open tools" className="flex items-center gap-1 min-w-0 overflow-x-auto">
          {p.tabs.map(t => {
            const Icon = PANEL_ICONS[t]
            const on = t === p.active
            return (
              <div key={t} className={`group flex items-center rounded-[9px] ${on ? 'bg-raised' : 'hover:bg-raised/50'}`}>
                <button type="button" role="tab" aria-selected={on} onClick={() => dispatch({ type: 'activate', panel: t })}
                  className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 text-[13px] whitespace-nowrap ${on ? 'text-ink' : 'text-ink-muted'}`}>
                  <Icon strokeWidth={1.5} className="w-3.5 h-3.5" />{labelOf(t)}
                  {t === 'inbox' && unread > 0 && <Badge>{unread}</Badge>}
                </button>
                <button type="button" aria-label={`Close ${labelOf(t)}`} onClick={() => dispatch({ type: 'close', panel: t })}
                  className={`mr-1 grid place-items-center w-5 h-5 rounded-[6px] text-gray-500 hover:text-ink ${on ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                  <X strokeWidth={1.5} className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
        <div ref={plusRef} className="relative flex-none">
          <IconButton label="Open a tool" active={menuOpen} onClick={() => setMenuOpen(o => !o)}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton>
          <PanelMenu open={menuOpen} onClose={closeMenu} anchorRef={plusRef} openTypes={p.tabs} onPick={t => dispatch({ type: 'open', panel: t })} />
        </div>
        <div className="ml-auto flex items-center gap-0.5 flex-none">
          <IconButton label={p.maximized ? 'Restore panel' : 'Maximize panel'} onClick={() => dispatch({ type: 'toggleMaximize' })}>
            {p.maximized ? <Minimize2 strokeWidth={1.5} className="w-4 h-4" /> : <Maximize2 strokeWidth={1.5} className="w-4 h-4" />}
          </IconButton>
          <IconButton label={p.position === 'right' ? 'Dock panel to bottom' : 'Dock panel to right'}
            onClick={() => dispatch({ type: 'setPosition', position: p.position === 'right' ? 'bottom' : 'right' })}>
            {p.position === 'right' ? <PanelBottom strokeWidth={1.5} className="w-4 h-4" /> : <PanelRight strokeWidth={1.5} className="w-4 h-4" />}
          </IconButton>
          <IconButton label="Hide panel" onClick={() => dispatch({ type: 'toggle' })}><PanelRightClose strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex relative">
        {p.active ? (
          <PanelBody key={p.active} type={p.active} agent={agent} onlineAgents={onlineAgents}
            wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} />
        ) : (
          <div className="flex-1 grid place-items-center">
            <EmptyState title="Open a tool" description="Use ＋ or press ⌘J. Terminal, Inbox, Files, Memory and more open here."
              action={<span className="text-[13px] text-ink-muted">＋ then a letter: T I F M G D C S P X</span>} />
          </div>
        )}
      </div>
    </div>
  )
}
