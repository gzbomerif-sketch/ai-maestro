'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Plus, X, Maximize2, Minimize2, PanelBottom, PanelRight, PanelRightClose, type LucideIcon } from 'lucide-react'
import type { PanelType } from '@/lib/panel-layout'
import { Badge, IconButton, EmptyState } from './ui'
import ToolMenu, { type MenuItem } from './PanelMenu'

/**
 * Legacy dock state. The command-center shell no longer uses the dock (it opens floating windows);
 * these local types only keep this file compiling until the classic-shell audit removes it.
 */
export interface PanelState {
  open: boolean; position: 'right' | 'bottom'; rightW: number; bottomH: number; maximized: boolean
  tabs: PanelType[]; active: PanelType | null; teamTabs: string[]; teamActive: string | null
}
export type LayoutAction =
  | { type: 'open'; panel: PanelType } | { type: 'close'; panel: PanelType } | { type: 'activate'; panel: PanelType }
  | { type: 'toggle'; scope?: 'agent' | 'team' } | { type: 'setPosition'; position: 'right' | 'bottom' } | { type: 'toggleMaximize' }

export interface DockTab { id: string; label: string; icon: LucideIcon; badge?: number }

/** Panel chrome shared by the agent and team docks: tab chips, ＋ menu, maximize / dock / hide, body. */
export default function DockFrame({ panel, dispatch, scope, tabs, active, onActivate, onClose, menuItems, onPick, children, emptyHint }: {
  panel: PanelState
  dispatch: React.Dispatch<LayoutAction>
  scope: 'agent' | 'team'
  tabs: DockTab[]
  active: string | null
  onActivate: (id: string) => void
  onClose: (id: string) => void
  menuItems: MenuItem[]
  onPick: (id: string) => void
  children: ReactNode
  emptyHint: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const plusRef = useRef<HTMLDivElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const p = panel

  return (
    <div className="h-full w-full min-w-0 min-h-0 flex flex-col bg-sunken">
      <div className="h-[60px] flex-none flex items-center gap-1.5 px-2.5 border-b border-hairline/70">
        <div role="tablist" aria-label="Open tools" className="flex items-center gap-1 min-w-0 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon
            const on = t.id === active
            return (
              <div key={t.id} className={`group flex items-center rounded-[9px] ${on ? 'bg-raised' : 'hover:bg-raised/50'}`}>
                <button type="button" role="tab" aria-selected={on} onClick={() => onActivate(t.id)}
                  className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 text-[13px] whitespace-nowrap ${on ? 'text-ink' : 'text-ink-muted'}`}>
                  <Icon strokeWidth={1.5} className="w-3.5 h-3.5" />{t.label}
                  {!!t.badge && t.badge > 0 && <Badge>{t.badge}</Badge>}
                </button>
                <button type="button" aria-label={`Close ${t.label}`} onClick={() => onClose(t.id)}
                  className={`mr-1 grid place-items-center w-5 h-5 rounded-[6px] text-gray-500 hover:text-ink focus-visible:opacity-100 ${on ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                  <X strokeWidth={1.5} className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
        <div ref={plusRef} className="relative flex-none">
          <IconButton label="Open a tool" active={menuOpen} onClick={() => setMenuOpen(o => !o)}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton>
          <ToolMenu open={menuOpen} onClose={closeMenu} anchorRef={plusRef} items={menuItems} openIds={tabs.map(t => t.id)} onPick={onPick} />
        </div>
        <div className="ml-auto flex items-center gap-0.5 flex-none">
          <IconButton label={p.maximized ? 'Restore panel' : 'Maximize panel'} onClick={() => dispatch({ type: 'toggleMaximize' })}>
            {p.maximized ? <Minimize2 strokeWidth={1.5} className="w-4 h-4" /> : <Maximize2 strokeWidth={1.5} className="w-4 h-4" />}
          </IconButton>
          <IconButton label={p.position === 'right' ? 'Dock panel to bottom' : 'Dock panel to right'}
            onClick={() => dispatch({ type: 'setPosition', position: p.position === 'right' ? 'bottom' : 'right' })}>
            {p.position === 'right' ? <PanelBottom strokeWidth={1.5} className="w-4 h-4" /> : <PanelRight strokeWidth={1.5} className="w-4 h-4" />}
          </IconButton>
          <IconButton label="Hide panel" onClick={() => dispatch({ type: 'toggle', scope })}><PanelRightClose strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex relative">
        {active ? children : (
          <div className="flex-1 grid place-items-center">
            <EmptyState title="Open a tool" description={emptyHint} />
          </div>
        )}
      </div>
    </div>
  )
}
