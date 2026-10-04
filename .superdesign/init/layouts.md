# Layouts

Primary app = **command-center shell** (`app/page.tsx` → `components/shell/AppShell.tsx`): a `fixed inset-0 flex bg-sunken` row of [StatusSidebar | ResizeHandle | main], where main is one of HomeScreen / WorkArea (agent) / TeamWorkspace (team). WorkArea = AgentTopBar (60px) over chat base layer, with a WindowLayer of draggable FloatingWindow tool windows on top. Collapsed sidebar shows a PanelLeft IconButton. CommandPalette and AgentCreationWizard are overlays.
`/settings` uses its own SettingsShell (sidebar nav + breadcrumb header + centred content, same ink tokens). `/teams`, `/teams/[id]`, `/team-meeting` redirect into the shell via ShellRedirect unless the legacy "classic" shell is selected. Legacy pages (marketplace, plugin-builder, zoom) use older gray-950 / gray-800 Tailwind styling.
The legacy "classic" layout (Header + AgentList sidebar + tabs) and Mobile/Tablet dashboards live in `app/page.tsx` / `components/` and are intentionally not documented here.

Files: root layout, providers, AppShell, StatusSidebar, ProjectTree, TeamSection, ResizeHandle, WorkArea, AgentTopBar, TeamTopBar, TeamWorkspace, PanelMenu (window launcher), WindowLayer, FloatingWindow, HomeScreen, SettingsShell.

### RootLayout
- Path: `app/layout.tsx`
- Description: html shell: JetBrains Mono via next/font (--font-mono), Stack Sans Text via Google link (--font-sans in .theme-ink), body class `theme-ink font-sans`, wraps Providers.

```tsx
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import Providers from '@/components/Providers'
import ClientDiagnostics from '@/components/ClientDiagnostics'
import './globals.css'

// UI font: Stack Sans Text, loaded by <link> in <head> (next/font in Next 14
// does not include it); .theme-ink sets --font-sans to it.

// Mono is for code, terminal output, ids and quantities — not decoration.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI Maestro',
  description: 'Orchestrate multiple AI coding agents from one beautiful dashboard',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo-constellation.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Stack+Sans+Text:wght@400;500&display=swap"
        />
      </head>
      <body className={`theme-ink ${mono.variable} font-sans`}><ClientDiagnostics /><Providers>{children}</Providers></body>
    </html>
  )
}
```

### Providers
- Path: `components/Providers.tsx`
- Description: Wraps children in ToastProvider.

```tsx
'use client'

import { ToastProvider } from '@/contexts/ToastContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
```

### AppShell
- Path: `components/shell/AppShell.tsx`
- Description: Desktop command-center layout: sidebar · resize handle · (HomeScreen | WorkArea | TeamWorkspace), palette + wizard overlays, colony host/card context.

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { groupByStatus, type StatusEntry } from '@/lib/agent-status'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { resolveAgentTab } from '@/lib/shell-tabs'
import { useLayout } from '@/hooks/useLayout'
import { useTeams, useActiveMeetings } from '@/hooks/useTeams'
import { LIMITS } from '@/lib/panel-layout'
import { AGENT_TOOLS, agentToolForKey, toolLabel } from '@/lib/window-tools'
import type { ManagedWindow, WindowTool } from '@/lib/window-manager'
import AgentCreationWizard from '@/components/AgentCreationWizard'
import StatusSidebar from './StatusSidebar'
import AgentTopBar from './AgentTopBar'
import ResizeHandle from './ResizeHandle'
import ColonyHost from './ColonyHost'
import { ColonyCardEnvContext, type ColonyCardEnv } from './ColonyProfileCard'
import WorkArea, { type WorkAreaApi } from './WorkArea'
import TeamWorkspace from './TeamWorkspace'
import MiniPreview from './MiniPreview'
import { renderTool } from './PanelBody'
import { iconForTool, type MenuItem } from './PanelMenu'
import { IconButton } from './ui'
import HomeScreen from './HomeScreen'
import CommandPalette from './CommandPalette'
import AgentTabContent, { type AgentTab } from './AgentTabContent'

export interface AppShellProps {
  agents: Agent[]
  onlineAgents: Agent[]
  error: string | null
  onRetry: () => void
  activeAgentId: string | null
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  activeTab: AgentTab
  setActiveTab: (t: AgentTab) => void
  wakingAgentId: string | null
  onWake: (agent: Agent) => void
  onSleep: (agent: Agent) => Promise<void>
  onShowProfile: (agent: Agent) => void
  onAgentsChanged: () => void
  onSwitchClassic: () => void
}

const AGENT_MENU: MenuItem[] = AGENT_TOOLS.map(t => ({ id: t.id, label: t.label, key: t.key, icon: iconForTool(t.id) }))
const windowIcon = (w: ManagedWindow) => { const Icon = iconForTool(w.tool); return <Icon strokeWidth={1.5} className="w-3.5 h-3.5" /> }

const LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

/** Command-center desktop layout: sidebar · agent workspace · inbox, or Home when no agent is open. */
export default function AppShell(p: AppShellProps) {
  const { getSessionActivity, connected } = useSessionActivity()
  const unread = useUnreadCounts(p.agents)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const groups = useMemo(() => groupByStatus(p.agents, a => getSessionActivity(a.name, a.id)), [p.agents, getSessionActivity])
  const entryById = useMemo(() => {
    const m: Record<string, StatusEntry> = {}
    for (const e of [...groups.needsYou, ...groups.working, ...groups.idle, ...groups.asleep]) m[e.agent.id] = e
    return m
  }, [groups])

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [sleepingId, setSleepingId] = useState<string | null>(null)

  const agent = p.activeAgentId ? p.agents.find(a => a.id === p.activeAgentId) : undefined
  const sleep = async (a: Agent) => { setSleepingId(a.id); try { await p.onSleep(a) } finally { setSleepingId(null) } }

  const [teamId, setTeamId] = useState<string | null>(null)
  const { teams, createTeam } = useTeams()
  const { meetings, startMeeting, endMeeting } = useActiveMeetings()
  const { layout, dispatch } = useLayout()
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('team')
    if (id) { setTeamId(id); p.onSelectHome(); window.history.replaceState(null, '', '/') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // A tool queued for an agent that is about to open (colony card) is dropped by any selection of someone else
  const [pendingTool, setPendingTool] = useState<{ tool: WindowTool; agentId: string } | null>(null)
  const selectAgent = (a: Agent) => { setPendingTool(cur => (cur && cur.agentId === a.id ? cur : null)); setTeamId(null); p.onSelectAgent(a) }
  const selectHome = () => { setPendingTool(null); setTeamId(null); p.onSelectHome() }
  const selectTeam = (id: string) => { setPendingTool(null); setTeamId(id); p.onSelectHome() }

  // Colony profile card actions. A tool opens in the workspace of the agent it is for, so for any
  // other agent we select it first and open the tool once its workspace (and its window API) is up.
  const workApi = useRef<WorkAreaApi | null>(null)
  const openToolFor = (tool: WindowTool, a: Agent) => {
    if (!teamId && agent?.id === a.id && workApi.current) { workApi.current.openTool(tool); return }
    selectAgent(a)
    setPendingTool({ tool, agentId: a.id })
  }
  // Backstop: a select the page rejects never activates the agent, so a stale request expires
  useEffect(() => {
    if (!pendingTool) return
    const t = setTimeout(() => setPendingTool(null), 3000)
    return () => clearTimeout(t)
  }, [pendingTool])
  useEffect(() => {
    if (!pendingTool || teamId || agent?.id !== pendingTool.agentId || !workApi.current) return
    workApi.current.openTool(pendingTool.tool)
    setPendingTool(null)
  }, [pendingTool, teamId, agent?.id])
  const colonyCard: ColonyCardEnv = {
    agents: p.agents, unread, wakingAgentId: p.wakingAgentId,
    onOpenWorkspace: selectAgent,
    onOpenTerminal: a => openToolFor('terminal', a),
    onOpenSkills: a => openToolFor('skills', a),
    // Same rule as the top bar's Wake button: not online (asleep or offline) means wake it
    onNewConversation: a => {
      selectAgent(a)
      const st = entryById[a.id]?.status ?? 'offline'
      if (st === 'asleep' || st === 'offline') p.onWake(a)
    },
    onAgentsChanged: p.onAgentsChanged,
  }

  return (
    <ColonyHost agents={p.agents} onSelectAgent={selectAgent}>
    <ColonyCardEnvContext.Provider value={colonyCard}>
    <div className="fixed inset-0 flex bg-sunken text-ink overflow-hidden">
      {!layout.sidebarCollapsed && (
        <>
          <StatusSidebar
            width={layout.sidebarW} onCollapse={() => dispatch({ type: 'toggleSidebar' })}
            teams={teams} meetings={meetings} activeTeamId={teamId} onSelectTeam={selectTeam} onCreateTeam={createTeam}
            agents={p.agents} groups={groups} activeAgentId={teamId ? null : agent ? agent.id : null} unread={unread} now={now}
            statusConnected={connected} error={p.error} onRetry={p.onRetry}
            onSelectAgent={selectAgent} onSelectHome={selectHome}
            onOpenPalette={() => setPaletteOpen(true)} onNewAgent={() => setWizardOpen(true)}
          />
          <ResizeHandle orientation="vertical" label="Drag to resize sidebar" value={layout.sidebarW}
            min={LIMITS.sidebar.min} max={LIMITS.sidebar.max}
            onResize={w => dispatch({ type: 'resizeSidebar', width: w })}
            onReset={() => dispatch({ type: 'resizeSidebar', width: LIMITS.sidebar.def })} />
        </>
      )}

      {teamId ? (
        <TeamWorkspace key={teamId} teamId={teamId} sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })} allAgents={p.agents} onlineAgents={p.onlineAgents}
          meetings={meetings} startMeeting={startMeeting} endMeeting={endMeeting}
          wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} now={now} />
      ) : agent ? (
        <WorkArea
          scopeId={agent.id} keyToTool={agentToolForKey} iconFor={windowIcon}
          titleFor={w => {
            const label = toolLabel(w.tool)
            const n = w.tool === 'inbox' ? unread[agent.id] ?? 0 : 0
            return n > 0 ? `${label} (${n})` : label
          }}
          renderContent={w => renderTool(w.tool, {
            agent, onlineAgents: p.onlineAgents, wakingAgentId: p.wakingAgentId, onWake: p.onWake, onShowProfile: p.onShowProfile, minimized: w.minimized, z: w.z,
          })}
          overlay={api => <MiniPreview hidden={api.isShowing('browser')} onOpen={() => api.openTool('browser')} />}
          top={api => {
            workApi.current = api
            return <AgentTopBar
              agent={agent} entry={entryById[agent.id]} now={now}
              busy={p.wakingAgentId === agent.id || sleepingId === agent.id}
              onSleep={() => sleep(agent)} onWake={() => p.onWake(agent)}
              onProfile={() => p.onShowProfile(agent)} onExport={() => api.openTool('export')}
              tools={AGENT_MENU} openToolIds={api.windows.map(w => w.tool)} onOpenTool={id => api.openTool(id as WindowTool)}
              hasWindows={api.windows.length > 0} allMinimized={api.allMinimized} onToggleAll={api.toggleAll}
              sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })}
            />
          }}
          center={
            <AgentTabContent agent={agent} activeTab={resolveAgentTab('chat', getRuntimeMode(agent.id))} setActiveTab={p.setActiveTab}
              onlineAgents={p.onlineAgents} wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile}
              hideHeaders chatVariant="ink" />
          }
        />
      ) : (
        <HomeScreen groups={groups} agents={p.agents} unread={unread} now={now} onSelectAgent={selectAgent} onNewAgent={() => setWizardOpen(true)} />
      )}

      {layout.sidebarCollapsed && !agent && (
        <div className="absolute top-3 left-3 z-10">
          <IconButton label="Expand sidebar (⌘B)" onClick={() => dispatch({ type: 'toggleSidebar' })}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      )}

      <CommandPalette
        open={paletteOpen} onOpenChange={setPaletteOpen} agents={p.agents}
        statusOf={a => LABEL[entryById[a.id]?.status ?? 'offline']}
        onSelectAgent={selectAgent} onSelectHome={selectHome} onSwitchClassic={p.onSwitchClassic}
        onCreateAgent={() => setWizardOpen(true)}
        teams={teams} onSelectTeam={selectTeam}
      />
      {wizardOpen && <AgentCreationWizard onClose={() => setWizardOpen(false)} onComplete={() => {
        setWizardOpen(false); p.onAgentsChanged()
        // The colony hears this and rescans at once — the new bot walks out right away
        window.dispatchEvent(new CustomEvent('aimaestro:colony-refresh'))
      }} />}
    </div>
    </ColonyCardEnvContext.Provider>
    </ColonyHost>
  )
}
```

### StatusSidebar
- Path: `components/shell/StatusSidebar.tsx`
- Description: Left sidebar (surface bg, hairline right border): brand + collapse, Search (⌘K), Home, needs-you card, Status/Project segmented toggle, agent rows, TeamSection, footer icon links (Settings, Teams, Meetings, Plugins) + New agent.

```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, PanelLeft, Home, Settings, Users, Presentation, Boxes, Plus, AlertCircle } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry, type StatusGroups } from '@/lib/agent-status'
import { readPref, writePref, SIDEBAR_MODE_KEY } from '@/lib/safe-storage'
import { StatusDot, SectionLabel, Badge, IconButton } from './ui'
import AgentAvatar from '@/components/AgentAvatar'
import ProjectTree from './ProjectTree'
import TeamSection from './TeamSection'
import type { Team, Meeting } from '@/types/team'

export interface StatusSidebarProps {
  agents: Agent[]
  groups: StatusGroups
  activeAgentId: string | null
  unread: Record<string, number>
  now: number
  statusConnected: boolean
  error: string | null
  onRetry: () => void
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  onOpenPalette: () => void
  onNewAgent: () => void
  width: number
  onCollapse: () => void
  teams: Team[]
  meetings: Meeting[]
  activeTeamId: string | null
  onSelectTeam: (id: string) => void
  onCreateTeam: (name: string) => Promise<string | null>
}

function AgentRow({ entry, active, unread, now, onSelect }: {
  entry: StatusEntry; active: boolean; unread: number; now: number; onSelect: () => void
}) {
  const name = displayName(entry.agent)
  const right = entry.status === 'working'
    ? <StatusDot status="working" />
    : <span className="text-[12px] text-gray-500">{entry.status === 'offline' ? 'Offline' : formatAge(entry.since, now)}</span>
  return (
    <button type="button" onClick={onSelect} aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${active ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
      <AgentAvatar agent={entry.agent} size="xs" />
      <span className="truncate">{name}</span>
      <span className="ml-auto flex items-center gap-1.5">{unread > 0 && <Badge>{unread}</Badge>}{right}</span>
    </button>
  )
}

const navLink = 'grid place-items-center w-[34px] h-[34px] rounded-[10px] text-ink-muted hover:text-ink hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'

export default function StatusSidebar(p: StatusSidebarProps) {
  const [mode, setMode] = useState<'status' | 'project'>(() => readPref(SIDEBAR_MODE_KEY, 'status', ['status', 'project'] as const))
  const switchMode = (m: 'status' | 'project') => { setMode(m); writePref(SIDEBAR_MODE_KEY, m) }
  const byId = useMemo(() => {
    const map: Record<string, StatusEntry> = {}
    for (const e of [...p.groups.needsYou, ...p.groups.working, ...p.groups.idle, ...p.groups.asleep]) map[e.agent.id] = e
    return map
  }, [p.groups])

  const section = (label: string, list: StatusEntry[]) => list.length === 0 ? null : (
    <div key={label}>
      <SectionLabel count={list.length}>{label}</SectionLabel>
      {list.map(e => (
        <AgentRow key={e.agent.id} entry={e} active={e.agent.id === p.activeAgentId} unread={p.unread[e.agent.id] ?? 0} now={p.now} onSelect={() => p.onSelectAgent(e.agent)} />
      ))}
    </div>
  )

  return (
    <aside style={{ width: p.width }} className="flex-none flex flex-col bg-surface border-r border-hairline px-3 pt-4 pb-3 min-h-0">
      <div className="flex items-center gap-3 px-2.5 pb-4 text-[15px] font-medium text-ink">
        <button type="button" aria-label="Collapse sidebar" title="Collapse sidebar (⌘B)" onClick={p.onCollapse}
          className="grid place-items-center w-6 h-6 -ml-1 rounded-[6px] text-ink-muted hover:text-ink hover:bg-raised">
          <PanelLeft strokeWidth={1.5} className="w-4 h-4" />
        </button>AI Maestro
      </div>

      <div className="flex items-center gap-2 px-2.5 py-2">
        <button type="button" onClick={p.onOpenPalette} className="flex flex-1 items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] text-ink-muted hover:bg-raised/60">
          <Search strokeWidth={1.5} className="w-4 h-4" />Search<span className="ml-auto text-[12px] text-gray-500">⌘K</span>
        </button>
        <IconButton label="New agent" title="New agent" onClick={p.onNewAgent}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton>
      </div>

      {p.error && (
        <div className="mx-1 mt-2 flex items-center gap-2 rounded-[10px] border border-hairline px-3 py-2 text-[13px] text-ink-muted">
          <AlertCircle strokeWidth={1.5} className="w-4 h-4 text-warn" />Can&apos;t reach host
          <button type="button" onClick={p.onRetry} className="ml-auto text-ink hover:underline">Retry</button>
        </div>
      )}
      {!p.statusConnected && !p.error && <div className="px-2.5 pt-1 text-[12px] text-gray-500">Status may be stale</div>}

      <button type="button" onClick={p.onSelectHome} aria-current={p.activeAgentId === null && p.activeTeamId === null ? 'page' : undefined}
        className={`mt-1 flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] ${p.activeAgentId === null && p.activeTeamId === null ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
        <Home strokeWidth={1.5} className="w-4 h-4" />Home
      </button>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
        {p.groups.needsYou.map(e => (
          <button type="button" key={e.agent.id} onClick={() => p.onSelectAgent(e.agent)}
            className="w-full text-left mt-2.5 rounded-xl border border-warn-border bg-warn-surface px-3.5 py-3 hover:border-warn/60">
            <div className="flex items-center gap-2 text-[12px] text-warn"><StatusDot status="needs-you" />Needs you</div>
            <div className="mt-1 text-[15px] text-ink">Waiting for your input</div>
            <div className="text-[13px] text-ink-muted">{displayName(e.agent)} · {formatAge(e.since, p.now)}</div>
          </button>
        ))}

        <div className="flex items-center justify-end mt-3 mx-1">
          <div role="tablist" aria-label="Group agents by" className="flex rounded-full bg-raised/70 p-0.5 text-[12px]">
            {(['status', 'project'] as const).map(m => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
                className={`px-2.5 py-0.5 rounded-full capitalize ${mode === m ? 'bg-ink text-sunken' : 'text-ink-muted'}`}>{m}</button>
            ))}
          </div>
        </div>

        {mode === 'status'
          ? <>{section('Working', p.groups.working)}{section('Idle', p.groups.idle)}{section('Asleep', p.groups.asleep)}</>
          : <ProjectTree agents={p.agents} groupsById={byId} activeAgentId={p.activeAgentId} unread={p.unread} onSelectAgent={p.onSelectAgent} />}
        <TeamSection teams={p.teams} meetings={p.meetings} activeTeamId={p.activeTeamId}
          onSelectTeam={p.onSelectTeam} onCreateTeam={p.onCreateTeam} />
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-hairline">
        <Link href="/settings" aria-label="Settings" title="Settings" className={navLink}><Settings strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/teams" aria-label="Teams" title="Teams" className={navLink}><Users strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/team-meeting" aria-label="Meetings" title="Meetings" className={navLink}><Presentation strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/plugin-builder" aria-label="Plugins" title="Plugins" className={navLink}><Boxes strokeWidth={1.5} className="w-4 h-4" /></Link>
      </div>
    </aside>
  )
}
```

### ProjectTree
- Path: `components/shell/ProjectTree.tsx`
- Description: Sidebar "project" grouping: collapsible tag tree of agents.

```tsx
'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, type StatusEntry } from '@/lib/agent-status'
import { StatusDot, Badge } from './ui'
import AgentAvatar from '@/components/AgentAvatar'

export function buildTagTree(agents: Agent[]): [string, [string, Agent[]][]][] {
  const tree = new Map<string, Map<string, Agent[]>>()
  for (const a of agents) {
    const l1 = a.tags?.[0] || 'ungrouped'
    const l2 = a.tags?.[1] || 'default'
    if (!tree.has(l1)) tree.set(l1, new Map())
    const sub = tree.get(l1)!
    if (!sub.has(l2)) sub.set(l2, [])
    sub.get(l2)!.push(a)
  }
  return [...tree.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, sub]) => [k, [...sub.entries()].sort(([a], [b]) => a.localeCompare(b))])
}

export default function ProjectTree({ agents, groupsById, activeAgentId, unread, onSelectAgent }: {
  agents: Agent[]; groupsById: Record<string, StatusEntry>; activeAgentId: string | null
  unread: Record<string, number>; onSelectAgent: (a: Agent) => void
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setClosed(c => ({ ...c, [k]: !c[k] }))
  return (
    <div className="mt-2">
      {buildTagTree(agents).map(([l1, subs]) => (
        <div key={l1}>
          <button type="button" onClick={() => toggle(l1)} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-ink-muted hover:text-ink">
            <ChevronRight strokeWidth={1.5} className={`w-3.5 h-3.5 transition-transform ${closed[l1] ? '' : 'rotate-90'}`} />{l1}
          </button>
          {!closed[l1] && subs.map(([l2, list]) => (
            <div key={l2} className="ml-4">
              {l2 !== 'default' && <div className="px-2.5 pt-1 text-[12px] text-gray-500">{l2}</div>}
              {list.map(a => (
                <button type="button" key={a.id} onClick={() => onSelectAgent(a)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] ${a.id === activeAgentId ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
                  <AgentAvatar agent={a} size="xs" />
                  <span className="truncate">{displayName(a)}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {unread[a.id] > 0 && <Badge>{unread[a.id]}</Badge>}
                    <StatusDot status={groupsById[a.id]?.status ?? 'offline'} />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

### TeamSection
- Path: `components/shell/TeamSection.tsx`
- Description: Sidebar Teams list with live marker and inline create dialog.

```tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Team, Meeting } from '@/types/team'
import { activeMeetingFor } from '@/lib/team-panels'
import { SectionLabel, Dialog, Field, Button, Notice } from './ui'

/** Sidebar "Teams" list with a live marker and a create dialog. */
export default function TeamSection({ teams, meetings, activeTeamId, onSelectTeam, onCreateTeam }: {
  teams: Team[]
  meetings: Meeting[]
  activeTeamId: string | null
  onSelectTeam: (id: string) => void
  onCreateTeam: (name: string) => Promise<string | null>
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const close = () => { setCreating(false); setName(''); setError(null) }
  const create = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    const id = await onCreateTeam(name.trim()).catch(() => null)
    setBusy(false)
    if (!id) { setError('Could not create the team.'); return }
    close()
    onSelectTeam(id)
  }

  return (
    <div>
      <SectionLabel count={teams.length || undefined}
        action={<button type="button" aria-label="New team" title="New team" onClick={() => setCreating(true)}
          className="grid place-items-center w-5 h-5 rounded-[6px] text-ink-muted hover:text-ink hover:bg-raised"><Plus strokeWidth={1.5} className="w-3.5 h-3.5" /></button>}>
        Teams
      </SectionLabel>
      {teams.map(t => {
        const live = !!activeMeetingFor(t.id, meetings)
        const on = t.id === activeTeamId
        return (
          <button key={t.id} type="button" onClick={() => onSelectTeam(t.id)} aria-current={on ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${on ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
            <span className="truncate">{t.name}</span>
            <span className="ml-auto text-[12px]">
              {live ? <span className="text-ok">● live</span> : <span className="text-gray-500">{t.agentIds.length || ''}</span>}
            </span>
          </button>
        )
      })}
      <Dialog open={creating} onClose={close} title="New team"
        footer={<><Button onClick={close}>Cancel</Button><Button variant="accent" onClick={create} disabled={!name.trim() || busy}>{busy ? 'Creating…' : 'Create team'}</Button></>}>
        <div className="space-y-3">
          <label className="block">
            <span className="block text-[14px] text-ink mb-1.5">Name</span>
            <Field className="w-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Web launch"
              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) create() }} />
          </label>
          <p className="text-[13px] text-ink-muted">Add members afterwards from the team&apos;s Members panel.</p>
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      </Dialog>
    </div>
  )
}
```

### ResizeHandle
- Path: `components/shell/ResizeHandle.tsx`
- Description: 1px divider with wide invisible grip and hover tooltip; used for sidebar width.

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { keyboardStep } from '@/lib/panel-layout'

/** 1px divider with a wide invisible grip. Grey only; a tooltip appears on hover. */
export default function ResizeHandle({ orientation, value, min, max, invert = false, label, onResize, onReset }: {
  orientation: 'vertical' | 'horizontal'
  value: number
  min: number
  max: number
  invert?: boolean
  label: string
  onResize: (size: number) => void
  onReset: () => void
}) {
  const vertical = orientation === 'vertical'
  const drag = useRef<{ start: number; value: number } | null>(null)
  const [hover, setHover] = useState(false)
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // If the handle disappears mid-drag (⌘J, ⌘B, agent switch), never leave the app in drag mode
  const stopDragging = () => {
    drag.current = null
    document.body.classList.remove('is-resizing')
    document.body.style.cursor = ''
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    if (drag.current) stopDragging()
  }, [])

  const sign = invert ? -1 : 1
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { start: vertical ? e.clientX : e.clientY, value }
    document.body.classList.add('is-resizing')
    document.body.style.cursor = vertical ? 'col-resize' : 'row-resize'
    setTip(null)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) {
      if (hover && !tip) setTip({ x: e.clientX, y: e.clientY })
      return
    }
    const delta = ((vertical ? e.clientX : e.clientY) - drag.current.start) * sign
    onResize(drag.current.value + delta)
  }
  const end = (e: React.PointerEvent) => {
    if (!drag.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    stopDragging()
  }

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={() => { if (drag.current) stopDragging() }}
      onDoubleClick={onReset}
      onKeyDown={e => {
        const step = keyboardStep(e.key, e.shiftKey)
        if (step) { e.preventDefault(); onResize(value + step * sign) }
      }}
      onPointerEnter={() => { timer.current = setTimeout(() => setHover(true), 400) }}
      onPointerLeave={() => { if (timer.current) clearTimeout(timer.current); setHover(false); setTip(null) }}
      className={`group relative flex-none z-10 focus-visible:outline-none ${vertical ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'}`}
    >
      {/* the visible 1px line */}
      <span aria-hidden className={`absolute inset-0 transition-colors ${hover || drag.current ? 'bg-gray-600' : 'bg-hairline'} group-focus-visible:bg-gray-600`} />
      {/* wide invisible grip */}
      <span aria-hidden className={`absolute ${vertical ? 'inset-y-0 -left-1 -right-1' : 'inset-x-0 -top-1 -bottom-1'}`} />
      {hover && tip && !drag.current && (
        <span role="tooltip" style={{ left: tip.x + 14, top: tip.y - 10 }}
          className="fixed z-50 pointer-events-none whitespace-nowrap rounded-[8px] border border-hairline bg-surface px-2.5 py-1 text-[12.5px] text-ink">
          {label}
        </span>
      )}
    </div>
  )
}
```

### WorkArea
- Path: `components/shell/WorkArea.tsx`
- Description: Agent/team work region: top bar slot, centre chat slot, overlay slot, WindowLayer over the chat region; owns window shortcuts and area measurement.

```tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { isEditableTarget, layoutShortcut, shouldRestoreOnEscape } from '@/lib/panel-layout'
import { visibleWindows, type ManagedWindow, type WindowAction, type WindowTool } from '@/lib/window-manager'
import { isUsableArea, type Area } from '@/lib/window-chrome'
import { toggleAllActions, topMaximized, topWindow, windowScopeFor } from '@/lib/window-tools'
import { useWindows } from '@/hooks/useWindows'
import { WindowLayer } from './WindowLayer'

/** What the top bar and overlays need to drive this work area's windows. */
export interface WorkAreaApi {
  /** Open (or focus / un-minimize) a tool window in this workspace */
  openTool: (tool: WindowTool) => void
  /** This workspace's windows plus the global ones (minimized included) */
  windows: ManagedWindow[]
  dispatch: Dispatch<WindowAction>
  /** Windows exist and every one is minimized */
  allMinimized: boolean
  /** ⌘J: minimize everything showing, or restore everything */
  toggleAll: () => void
  /** A window of this tool is open and not minimized */
  isShowing: (tool: WindowTool) => boolean
}

/** Single-key shortcuts and chords must not fire while a dialog or menu has the keyboard. */
const MODAL = '[role="dialog"],[aria-modal="true"],[role="menu"]'

/**
 * Chat (the base layer) under a layer of floating tool windows that covers only the chat region (the top bar stays clear). Shared by the agent and team views.
 * Owns the area measurement (one observer feeds both useWindows and the layer) and the window shortcuts.
 */
export default function WorkArea({ scopeId, keyToTool, renderContent, titleFor, iconFor, isStale, top, center, overlay }: {
  /** Windows opened here carry this id: the agent id, or teamScope(teamId) */
  scopeId: string
  /** Single-key shortcut to tool for this workspace */
  keyToTool: (key: string) => WindowTool | null
  renderContent: (w: ManagedWindow) => ReactNode
  titleFor: (w: ManagedWindow) => string
  iconFor: (w: ManagedWindow) => ReactNode
  /** Windows of this workspace that should be closed (a team member left) */
  isStale?: (w: ManagedWindow) => boolean
  top: (api: WorkAreaApi) => ReactNode
  center: ReactNode
  /** Floating extras over the chat column (the browser mini preview) */
  overlay?: (api: WorkAreaApi) => ReactNode
}) {
  // The element is always rendered, so the ref is attached before useWindows' effects run
  const workRef = useRef<HTMLDivElement>(null)
  const { state, dispatch, openTool: openIn } = useWindows(workRef)

  // WindowLayer mounts after the first client render: useWindows reads localStorage lazily
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [area, setArea] = useState<Area | null>(null)
  useEffect(() => {
    const el = workRef.current
    if (!el) return
    const read = () => {
      const next = { w: el.clientWidth, h: el.clientHeight }
      if (!isUsableArea(next)) return
      setArea(prev => (prev && prev.w === next.w && prev.h === next.h ? prev : next))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const windows = useMemo(() => (mounted ? visibleWindows(state, scopeId) : []), [mounted, state, scopeId])
  const allMinimized = windows.length > 0 && windows.every(w => w.minimized)

  const openTool = useCallback((tool: WindowTool) => openIn(tool, windowScopeFor(tool, scopeId)), [openIn, scopeId])
  const toggleAll = useCallback(() => {
    for (const a of toggleAllActions(windows)) dispatch(a)
  }, [windows, dispatch])
  const isShowing = useCallback((tool: WindowTool) => windows.some(w => w.tool === tool && !w.minimized), [windows])
  const api: WorkAreaApi = { openTool, windows, dispatch, allMinimized, toggleAll, isShowing }

  // Close windows whose subject is gone
  useEffect(() => {
    if (!isStale) return
    for (const w of windows) if (isStale(w)) dispatch({ type: 'close', id: w.id })
  }, [windows, isStale, dispatch])

  // Keyboard: tool keys open/focus a window, ⌘J minimizes/restores all, ⇧⌘M maximizes the top window,
  // Esc restores a maximized one. (⌘B belongs to useLayout.)
  const live = useRef({ windows, openTool, keyToTool, dispatch })
  live.current = { windows, openTool, keyToTool, dispatch }
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    const onKey = (e: KeyboardEvent) => {
      const { windows: ws, openTool: open, keyToTool: toTool, dispatch: send } = live.current
      const target = e.target as Element | null
      const chord = layoutShortcut(e, isMac)
      if (chord === 'togglePanel' || chord === 'toggleMaximize') {
        if (isEditableTarget(target)) return
        e.preventDefault()
        if (chord === 'togglePanel') {
          for (const a of toggleAllActions(ws)) send(a)
        } else {
          const w = topWindow(ws)
          if (w) send({ type: 'toggleMaximize', id: w.id })
        }
        return
      }
      if (chord) return
      if (shouldRestoreOnEscape({ key: e.key, defaultPrevented: e.defaultPrevented, target })) {
        const w = topMaximized(ws)
        if (w) send({ type: 'toggleMaximize', id: w.id })
        return
      }
      if (e.defaultPrevented || e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(target) || target?.closest?.(MODAL)) return
      const tool = toTool(e.key)
      if (!tool) return
      e.preventDefault()
      open(tool)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <section className="flex-1 min-w-0 flex flex-col relative">
      {top(api)}
      {/* The windows' area: everything below the top bar, so the launcher and agent controls stay reachable */}
      <div ref={workRef} className="flex-1 min-h-0 flex relative border-t border-hairline/70">
        {center}
        {overlay?.(api)}
        {mounted && area && (
          // Own stacking context: window z-order never competes with menus, dialogs or the colony frame
          <div className="pointer-events-none absolute inset-0 z-20">
            <WindowLayer
              windows={windows} dispatch={dispatch} area={area}
              titleFor={titleFor} iconFor={iconFor}
              renderContent={w => <div className="absolute inset-0 flex min-h-0 min-w-0">{renderContent(w)}</div>}
            />
          </div>
        )}
      </div>
    </section>
  )
}
```

### AgentTopBar
- Path: `components/shell/AgentTopBar.tsx`
- Description: 60px header: host / avatar / name, status label, Wake|Sleep button, pop-out, more menu, window launcher (＋) and minimize-all.

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Moon, Power, ExternalLink, MoreHorizontal, PanelLeft, Loader2 } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry } from '@/lib/agent-status'
import { Button, IconButton } from './ui'
import AgentAvatar from '@/components/AgentAvatar'
import { WindowLauncher, type MenuItem } from './PanelMenu'

export interface AgentTopBarProps {
  agent: Agent
  entry: StatusEntry | undefined
  now: number
  busy: boolean
  onSleep: () => void
  onWake: () => void
  onProfile: () => void
  onExport: () => void
  /** Window launcher (＋) entries, the ids already open, and the minimize/restore-all toggle */
  tools: MenuItem[]
  openToolIds: string[]
  onOpenTool: (id: string) => void
  hasWindows: boolean
  allMinimized: boolean
  onToggleAll: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

const LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

export default function AgentTopBar(p: AgentTopBarProps) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [menu])

  const status = p.entry?.status ?? 'offline'
  const asleep = status === 'asleep' || status === 'offline'
  const age = formatAge(p.entry?.since, p.now)
  const host = p.agent.session?.hostName || p.agent.hostId || 'this Mac'
  const tone = status === 'working' ? 'text-accent' : status === 'needs-you' ? 'text-warn' : 'text-ink-muted'
  const dot = status === 'working' ? 'bg-accent-fill ring-[3px] ring-accent-fill/20' : status === 'needs-you' ? 'bg-warn' : 'bg-gray-600'

  return (
    <header className="h-[60px] flex-none flex items-center gap-3 px-6">
      {p.sidebarCollapsed && <IconButton label="Expand sidebar (⌘B)" onClick={p.onToggleSidebar}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
      <div className="flex items-center gap-2.5 text-[16px] text-ink-muted min-w-0">
        <span className="truncate">{host === 'local' ? 'this Mac' : host}</span>
        <span>/</span>
        <AgentAvatar agent={p.agent} size="sm" />
        <span className="text-ink font-medium truncate">{displayName(p.agent)}</span>
      </div>
      <span className={`flex items-center gap-2 text-[13px] ml-2 whitespace-nowrap flex-none ${tone}`}>
        <span className={`w-[7px] h-[7px] rounded-full ${dot}`} />{LABEL[status]}{age && status !== 'offline' ? ` · ${age}` : ''}
      </span>
      <div className="ml-auto flex items-center gap-2 flex-none">
        {asleep
          ? <Button onClick={p.onWake} disabled={p.busy}>{p.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power strokeWidth={1.5} className="w-4 h-4" />}Wake</Button>
          : <Button onClick={p.onSleep} disabled={p.busy}>{p.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon strokeWidth={1.5} className="w-4 h-4" />}Sleep</Button>}
        <a href={`/zoom/agent?id=${encodeURIComponent(p.agent.id)}`} target="_blank" rel="noopener noreferrer" aria-label="Pop out" title="Pop out"
          className="grid place-items-center w-[34px] h-[34px] rounded-[10px] border border-control-border text-ink hover:bg-raised"><ExternalLink strokeWidth={1.5} className="w-4 h-4" /></a>
        <div ref={ref} className="relative">
          <IconButton label="More actions" onClick={() => setMenu(m => !m)} active={menu}><MoreHorizontal strokeWidth={1.5} className="w-4 h-4" /></IconButton>
          {menu && (
            <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[180px] rounded-[12px] border border-hairline bg-surface p-1">
              <button type="button" role="menuitem" onClick={() => { setMenu(false); p.onProfile() }} className="w-full text-left px-3 py-2 rounded-[8px] text-[14px] text-gray-300 hover:bg-raised/60">Profile</button>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); p.onExport() }} className="w-full text-left px-3 py-2 rounded-[8px] text-[14px] text-gray-300 hover:bg-raised/60">Export transcript</button>
            </div>
          )}
        </div>
        <WindowLauncher items={p.tools} openIds={p.openToolIds} onPick={p.onOpenTool}
          hasWindows={p.hasWindows} allMinimized={p.allMinimized} onToggleAll={p.onToggleAll} />
      </div>
    </header>
  )
}
```

### TeamTopBar
- Path: `components/shell/TeamTopBar.tsx`
- Description: 60px header for a team workspace: team name, member avatars, meeting start/end, window launcher.

```tsx
'use client'

import { PanelLeft, Loader2 } from 'lucide-react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import { displayName, formatAge } from '@/lib/agent-status'
import { Button, IconButton } from './ui'
import AgentAvatar from '@/components/AgentAvatar'
import { WindowLauncher, type MenuItem } from './PanelMenu'

export default function TeamTopBar({ team, meeting, members, now, starting, onStart, onEnd, tools, openToolIds, onOpenTool, hasWindows, allMinimized, onToggleAll, sidebarCollapsed, onToggleSidebar }: {
  team: Team
  meeting: Meeting | null
  members: Agent[]
  now: number
  starting: boolean
  onStart: () => void
  onEnd: () => void
  /** Window launcher (＋) entries, the ids already open, and the minimize/restore-all toggle */
  tools: MenuItem[]
  openToolIds: string[]
  onOpenTool: (id: string) => void
  hasWindows: boolean
  allMinimized: boolean
  onToggleAll: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}) {
  const shown = members.slice(0, 5)
  return (
    <header className="h-[60px] flex-none flex items-center gap-3 px-6">
      {sidebarCollapsed && <IconButton label="Expand sidebar (⌘B)" onClick={onToggleSidebar}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
      <div className="flex items-center gap-2.5 text-[16px] text-ink-muted min-w-0">
        <span>Teams</span><span>/</span><span className="text-ink font-medium truncate">{team.name}</span>
      </div>
      {meeting && <span className="text-[13px] text-ok whitespace-nowrap flex-none">● Meeting · {formatAge(meeting.startedAt, now) || 'now'}</span>}
      <div className="ml-auto flex items-center gap-2 flex-none">
        <div className="flex" aria-label={`${members.length} members`}>
          {shown.map((m, i) => (
            <span key={m.id} title={displayName(m)}
              className={`inline-flex rounded-full bg-sunken border-2 border-sunken ${i ? '-ml-1.5' : ''}`}><AgentAvatar agent={m} size="xs" /></span>
          ))}
          {members.length > shown.length && <span className="-ml-1.5 grid place-items-center w-6 h-6 rounded-full bg-raised border-2 border-sunken text-[9px] text-gray-400">+{members.length - shown.length}</span>}
        </div>
        {meeting
          ? <Button onClick={onEnd}>End meeting</Button>
          : <Button variant="accent" onClick={onStart} disabled={starting || members.length === 0} title={members.length === 0 ? 'Add members first' : undefined}>
              {starting && <Loader2 className="w-4 h-4 animate-spin" />}Start meeting
            </Button>}
        <WindowLauncher items={tools} openIds={openToolIds} onPick={onOpenTool}
          hasWindows={hasWindows} allMinimized={allMinimized} onToggleAll={onToggleAll} />
      </div>
    </header>
  )
}
```

### TeamWorkspace
- Path: `components/shell/TeamWorkspace.tsx`
- Description: Team view: WorkArea with TeamTopBar, TeamChat as base layer and team tool windows.

```tsx
'use client'

import { useCallback, useState } from 'react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import { TEAM_TOOLS, activeMeetingFor, teamScope, teamTabForKey, termAgentId, termTab } from '@/lib/team-panels'
import type { ManagedWindow, WindowTool } from '@/lib/window-manager'
import { toolLabel } from '@/lib/window-tools'
import { displayName } from '@/lib/agent-status'
import { useTeam } from '@/hooks/useTeam'
import { Notice } from './ui'
import WorkArea from './WorkArea'
import TeamTopBar from './TeamTopBar'
import TeamChat from './TeamChat'
import MiniPreview from './MiniPreview'
import { renderTool } from './PanelBody'
import { iconForTool, type MenuItem } from './PanelMenu'
import { SquareTerminal } from 'lucide-react'

export default function TeamWorkspace({ teamId, sidebarCollapsed, onToggleSidebar, allAgents, onlineAgents, meetings, startMeeting, endMeeting, wakingAgentId, onWake, onShowProfile, now }: {
  teamId: string
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  allAgents: Agent[]
  onlineAgents: Agent[]
  meetings: Meeting[]
  startMeeting: (t: Team) => Promise<boolean>
  endMeeting: (id: string) => Promise<boolean>
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
  now: number
}) {
  const { team, updateTeam, error } = useTeam(teamId)
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const memberKey = team?.agentIds.join(',') ?? ''
  // A member who left the team takes their terminal window with them (the team record is the source of truth, not the loaded agents)
  const isStale = useCallback((w: ManagedWindow) => {
    const member = termAgentId(w.tool)
    return !!member && w.agentId === teamScope(teamId) && !memberKey.split(',').includes(member)
  }, [teamId, memberKey])
  if (!team) {
    return <div className="flex-1 grid place-items-center">{error ? <Notice tone="error">Team not found.</Notice> : <Notice>Loading team…</Notice>}</div>
  }
  const members = team.agentIds.map(id => allAgents.find(a => a.id === id)).filter((a): a is Agent => !!a)
  const meeting = activeMeetingFor(team.id, meetings)
  const start = async () => {
    setStarting(true); setFailure(null)
    try { if (!(await startMeeting(team))) setFailure('Could not start the meeting. Try again.') } finally { setStarting(false) }
  }
  const end = async () => {
    if (!meeting) return
    setFailure(null)
    if (!(await endMeeting(meeting.id))) setFailure('Could not end the meeting. Try again.')
  }

  const scope = teamScope(team.id)
  const nameOf = (id: string) => { const a = allAgents.find(x => x.id === id); return a ? displayName(a) : undefined }
  const menu: MenuItem[] = [
    ...TEAM_TOOLS.map(t => ({ id: t.id, label: t.label, key: t.key, icon: iconForTool(t.id), section: 'Team' })),
    ...members.map((m, i) => ({ id: termTab(m.id), label: displayName(m), key: i < 9 ? String(i + 1) : undefined, icon: SquareTerminal, section: 'Member terminals' })),
  ]

  return (
    <WorkArea
      scopeId={scope} isStale={isStale}
      keyToTool={key => teamTabForKey(key, members.map(m => m.id))}
      titleFor={w => toolLabel(w.tool, nameOf)}
      iconFor={w => { const Icon = iconForTool(w.tool); return <Icon strokeWidth={1.5} className="w-3.5 h-3.5" /> }}
      renderContent={w => renderTool(w.tool, {
        agent: null, onlineAgents, wakingAgentId, onWake, onShowProfile, minimized: w.minimized, z: w.z,
        team: { team, members, allAgents, updateTeam },
      })}
      overlay={api => <MiniPreview hidden={api.isShowing('browser')} onOpen={() => api.openTool('browser')} />}
      top={api => <TeamTopBar team={team} meeting={meeting} members={members} now={now} starting={starting} onStart={start}
        onEnd={end}
        tools={menu} openToolIds={api.windows.map(w => w.tool)} onOpenTool={id => api.openTool(id as WindowTool)}
        hasWindows={api.windows.length > 0} allMinimized={api.allMinimized} onToggleAll={api.toggleAll}
        sidebarCollapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />}
      center={
        <div className="flex-1 min-w-0 flex flex-col">
          {failure && <div className="px-8 pt-3"><Notice tone="error">{failure}</Notice></div>}
          <TeamChat key={team.id} team={team} meeting={meeting} members={members} onStart={start} starting={starting} />
        </div>
      }
    />
  )
}
```

### PanelMenu (ToolMenu, WindowLauncher, iconForTool)
- Path: `components/shell/PanelMenu.tsx`
- Description: ＋ launcher dropdown with single-key shortcuts and the tool→lucide icon map.

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SquareTerminal, Inbox, FolderTree, Brain, GitBranch, FileText, LayoutPanelTop, Search, PlayCircle, Download, Globe, Orbit,
  ListChecks, Sparkles, Columns3, ScrollText, Users, Plus, PanelBottomClose, PanelBottomOpen, type LucideIcon,
} from 'lucide-react'
import type { PanelType } from '@/lib/panel-layout'
import { termAgentId } from '@/lib/team-panels'
import { IconButton } from './ui'

export const PANEL_ICONS: Record<PanelType, LucideIcon> = {
  terminal: SquareTerminal, inbox: Inbox, files: FolderTree, memory: Brain, graph: GitBranch,
  docs: FileText, canvas: LayoutPanelTop, search: Search, playback: PlayCircle, export: Download, browser: Globe,
  colony: Orbit,
}

/** Icons for every window tool: dock tools, the Tasks/Skills launcher entries, team tools and member terminals. */
const TOOL_ICONS: Record<string, LucideIcon> = {
  ...PANEL_ICONS, tasks: ListChecks, skills: Sparkles,
  kanban: Columns3, documents: FileText, instructions: ScrollText, members: Users,
}
export function iconForTool(tool: string): LucideIcon {
  return termAgentId(tool) ? SquareTerminal : TOOL_ICONS[tool] ?? LayoutPanelTop
}

export interface MenuItem { id: string; label: string; key?: string; icon: LucideIcon; section?: string }

/** ＋ menu: rows with optional section headers; single-key shortcuts while open. */
export default function ToolMenu({ open, onClose, anchorRef, items, openIds, onPick, align = 'left' }: {
  open: boolean
  onClose: () => void
  /** The toggle button: clicks on it must not count as "outside" (it toggles the menu itself) */
  anchorRef?: React.RefObject<HTMLElement>
  items: MenuItem[]
  openIds: string[]
  onPick: (id: string) => void
  /** Which edge of the anchor the menu lines up with (the launcher sits at the right of the top bar) */
  align?: 'left' | 'right'
}) {
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Reset the highlight and take focus only when the menu opens, not on every parent re-render
  useEffect(() => {
    if (!open) return
    setIndex(0)
    ref.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchorRef?.current?.contains(t)) return
      onCloseRef.current()
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open, anchorRef])

  if (!open || items.length === 0) return null
  const pick = (id: string) => { onPick(id); onClose() }

  return (
    <div ref={ref} role="menu" aria-label="Open a tool" tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
        if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => (i + 1) % items.length); return }
        if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => (i - 1 + items.length) % items.length); return }
        if (e.key === 'Enter') { e.preventDefault(); pick(items[index].id); return }
        if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
          const hit = items.find(it => it.key && it.key.toUpperCase() === e.key.toUpperCase())
          if (hit) { e.preventDefault(); pick(hit.id) }
        }
      }}
      className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-40 w-[250px] max-h-[70vh] overflow-y-auto rounded-[12px] border border-hairline bg-surface p-1.5 focus:outline-none`}>
      {items.map((it, i) => {
        const Icon = it.icon
        const header = it.section && it.section !== items[i - 1]?.section
        return (
          <div key={it.id}>
            {header && <div className="px-2.5 pt-2 pb-1 text-[11px] text-gray-500">{it.section}</div>}
            <button type="button" role="menuitem" onMouseEnter={() => setIndex(i)} onClick={() => pick(it.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-[14px] text-left ${i === index ? 'bg-raised text-ink' : 'text-gray-300'}`}>
              <Icon strokeWidth={1.5} className="w-4 h-4 text-ink-muted flex-none" />
              <span className="truncate">{it.label}</span>
              {openIds.includes(it.id) && <span className="text-[11px] text-gray-500">open</span>}
              {it.key && <span className="ml-auto text-[12px] text-gray-500">{it.key}</span>}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** The ＋ window launcher in the top bars (opens or focuses a window) plus the minimize/restore-all toggle (⌘J). */
export function WindowLauncher({ items, openIds, onPick, hasWindows, allMinimized, onToggleAll }: {
  items: MenuItem[]
  /** Ids (tool names) of the windows already open in this workspace */
  openIds: string[]
  onPick: (id: string) => void
  hasWindows: boolean
  allMinimized: boolean
  onToggleAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <div ref={anchorRef} className="relative flex-none">
        <IconButton label="Open a tool window" active={open} onClick={() => setOpen(o => !o)}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        <ToolMenu open={open} onClose={close} anchorRef={anchorRef} items={items} openIds={openIds} onPick={onPick} align="right" />
      </div>
      {hasWindows && (
        <IconButton label={allMinimized ? 'Show all windows (⌘J)' : 'Minimize all windows (⌘J)'} onClick={onToggleAll} active={allMinimized}>
          {allMinimized ? <PanelBottomOpen strokeWidth={1.5} className="w-4 h-4" /> : <PanelBottomClose strokeWidth={1.5} className="w-4 h-4" />}
        </IconButton>
      )}
    </>
  )
}
```

### WindowLayer
- Path: `components/shell/WindowLayer.tsx`
- Description: Pointer-transparent overlay hosting FloatingWindows, snap preview and the minimized-window pill strip.

```tsx
'use client'

import { useState, type Dispatch, type ReactNode } from 'react'
import { FloatingWindow } from '@/components/shell/FloatingWindow'
import type { ManagedWindow, WindowAction } from '@/lib/window-manager'

/**
 * Overlay that hosts every floating window of the work area. The container itself never intercepts
 * pointer events; only the windows, the minimized pills and nothing else do.
 */
export function WindowLayer({ windows, dispatch, renderContent, area, titleFor, iconFor }: {
  windows: ManagedWindow[]
  dispatch: Dispatch<WindowAction>
  renderContent: (w: ManagedWindow) => ReactNode
  area: { w: number; h: number }
  titleFor: (w: ManagedWindow) => string
  iconFor: (w: ManagedWindow) => ReactNode
}) {
  const [snapPreview, setSnapPreview] = useState<'left' | 'right' | null>(null)
  const minimized = windows.filter(w => w.minimized)
  // Overlays sit above every window (a maximized one included), the strip above the preview
  const top = 10 + windows.reduce((m, w) => Math.max(m, w.z), 0) + 1

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {windows.map(w => (
        <FloatingWindow key={w.id} win={w} dispatch={dispatch} area={area} title={titleFor(w)} icon={iconFor(w)} onSnapPreview={setSnapPreview}>
          {renderContent(w)}
        </FloatingWindow>
      ))}
      {snapPreview && (
        <div
          aria-hidden
          style={{ zIndex: top }}
          className={`pointer-events-none absolute inset-y-0 w-1/2 border border-accent-fill/50 bg-accent-fill/10 ${snapPreview === 'left' ? 'left-0' : 'right-0'}`}
        />
      )}
      {minimized.length > 0 && (
        <div style={{ zIndex: top + 1 }} className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 p-2">
          {minimized.map(w => (
            <button
              key={w.id}
              type="button"
              title={`Restore ${titleFor(w)}`}
              onClick={() => dispatch({ type: 'restore', id: w.id })}
              className="pointer-events-auto flex h-8 max-w-[200px] items-center gap-2 rounded-full border border-hairline bg-raised px-3 text-[13px] text-ink shadow transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill"
            >
              <span aria-hidden className="flex flex-none items-center text-ink-muted">{iconFor(w)}</span>
              <span className="truncate">{titleFor(w)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### FloatingWindow
- Path: `components/shell/FloatingWindow.tsx`
- Description: Draggable/resizable/snappable window: 40px raised title bar (minimize, maximize, close), surface body, 8 resize zones.

```tsx
'use client'

import { useEffect, useRef, type Dispatch, type ReactNode } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/shell/ui'
import type { ManagedWindow, WindowAction } from '@/lib/window-manager'
import { isUsableArea, resizeRect, snapZone, type Area, type Rect, type ResizeZone } from '@/lib/window-chrome'

type Half = 'left' | 'right'
type Kind = 'move' | ResizeZone
type Drag = { kind: Kind; px: number; py: number; rect: Rect; snap: Half | null }

/** Hit areas straddle the border (3px outside) so they stay grabbable without eating content. */
const ZONE_LOOK: Record<ResizeZone, { cls: string; cursor: string }> = {
  n: { cls: '-top-[3px] inset-x-3 h-[6px]', cursor: 'ns-resize' },
  s: { cls: '-bottom-[3px] inset-x-3 h-[6px]', cursor: 'ns-resize' },
  e: { cls: '-right-[3px] inset-y-3 w-[6px]', cursor: 'ew-resize' },
  w: { cls: '-left-[3px] inset-y-3 w-[6px]', cursor: 'ew-resize' },
  ne: { cls: '-top-[3px] -right-[3px] w-4 h-4', cursor: 'nesw-resize' },
  nw: { cls: '-top-[3px] -left-[3px] w-4 h-4', cursor: 'nwse-resize' },
  se: { cls: '-bottom-[3px] -right-[3px] w-4 h-4', cursor: 'nwse-resize' },
  sw: { cls: '-bottom-[3px] -left-[3px] w-4 h-4', cursor: 'nesw-resize' },
}

export function FloatingWindow({ win, dispatch, area, title, icon, children, onSnapPreview }: {
  win: ManagedWindow
  dispatch: Dispatch<WindowAction>
  area: Area
  title: string
  icon?: ReactNode
  children: ReactNode
  /** Reports the half the pointer is arming while dragging the title bar (null when none). */
  onSnapPreview?: (half: Half | null) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  // Handlers read the latest props through refs so a drag survives re-renders
  const live = useRef({ win, area, onSnapPreview })
  live.current = { win, area, onSnapPreview }

  const stopDragging = () => {
    if (!drag.current) return
    drag.current = null
    document.body.classList.remove('is-resizing')
    document.body.style.cursor = ''
    live.current.onSnapPreview?.(null)
  }
  // If the window disappears mid-drag (close shortcut, agent switch), never leave the app in drag mode
  useEffect(() => stopDragging, [])

  const begin = (kind: Kind) => (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || live.current.win.maximized || live.current.win.minimized) return
    if (kind === 'move' && (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y, w, h } = live.current.win
    drag.current = { kind, px: e.clientX, py: e.clientY, rect: { x, y, w, h }, snap: null }
    document.body.classList.add('is-resizing')
    document.body.style.cursor = kind === 'move' ? 'grabbing' : ZONE_LOOK[kind].cursor
  }

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current
    const { area: a, win: cur } = live.current
    if (!d || !isUsableArea(a)) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (d.kind === 'move') {
      dispatch({ type: 'move', id: cur.id, x: d.rect.x + dx, y: d.rect.y + dy, area: a })
      const left = rootRef.current?.parentElement?.getBoundingClientRect().left ?? 0
      const snap = snapZone(e.clientX - left, a)
      if (snap !== d.snap) { d.snap = snap; live.current.onSnapPreview?.(snap) }
    } else {
      dispatch({ type: 'resize', id: cur.id, ...resizeRect(d.kind, d.rect, dx, dy, a), area: a })
    }
  }

  const end = (commit: boolean) => (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    const { area: a, win: cur } = live.current
    if (commit && d.kind === 'move' && d.snap && isUsableArea(a)) dispatch({ type: 'snap', id: cur.id, half: d.snap, area: a })
    stopDragging()
  }

  const handlers = (kind: Kind) => ({
    onPointerDown: begin(kind),
    onPointerMove: onMove,
    onPointerUp: end(true),
    onPointerCancel: end(false),
    onLostPointerCapture: stopDragging,
  })

  const { maximized, minimized } = win
  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={title}
      // Capture phase: a click on any child (even a button) raises the window first
      onPointerDownCapture={() => dispatch({ type: 'focus', id: win.id })}
      className={cn('absolute', maximized && 'inset-0')}
      style={{
        zIndex: 10 + win.z,
        // Minimized windows stay mounted (terminals must keep their size and scrollback): hide, never unmount or display:none
        visibility: minimized ? 'hidden' : 'visible',
        pointerEvents: minimized ? 'none' : 'auto',
        ...(maximized ? {} : { left: win.x, top: win.y, width: win.w, height: win.h }),
      }}
    >
      <div className={cn('flex h-full w-full flex-col overflow-hidden border border-hairline bg-surface shadow-lg', maximized ? 'rounded-none' : 'rounded-[12px]')}>
        <div
          {...handlers('move')}
          onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) dispatch({ type: 'toggleMaximize', id: win.id }) }}
          className={cn('flex h-10 flex-none touch-none select-none items-center gap-1 border-b border-hairline bg-raised pl-3 pr-1', !maximized && 'cursor-grab')}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink">
            {icon && <span aria-hidden className="flex flex-none items-center text-ink-muted">{icon}</span>}
            <span className="truncate">{title}</span>
          </span>
          <IconButton label="Minimize" onClick={() => dispatch({ type: 'minimize', id: win.id })}><Minus size={15} /></IconButton>
          <IconButton label={maximized ? 'Restore' : 'Maximize'} active={maximized} onClick={() => dispatch({ type: 'toggleMaximize', id: win.id })}><Square size={13} /></IconButton>
          <IconButton label="Close" onClick={() => dispatch({ type: 'close', id: win.id })}><X size={16} /></IconButton>
        </div>
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
      {!maximized && !minimized && (Object.keys(ZONE_LOOK) as ResizeZone[]).map(zone => (
        <div
          key={zone}
          aria-hidden
          {...handlers(zone)}
          style={{ cursor: ZONE_LOOK[zone].cursor }}
          className={cn('absolute z-10 touch-none', ZONE_LOOK[zone].cls)}
        />
      ))}
    </div>
  )
}
```

### HomeScreen
- Path: `components/shell/HomeScreen.tsx`
- Description: Home (no agent selected): empty-state card, "Needs you" card list, agent tile grid (auto-fill minmax 150px) with dashed New tile.

```tsx
'use client'

import { Plus } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry, type StatusGroups } from '@/lib/agent-status'
import { Card, Row, Button } from './ui'
import AgentAvatar from '@/components/AgentAvatar'

const STATE_LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

export default function HomeScreen({ groups, agents, unread, now, onSelectAgent, onNewAgent }: {
  groups: StatusGroups; agents: Agent[]; unread: Record<string, number>; now: number
  onSelectAgent: (a: Agent) => void; onNewAgent: () => void
}) {
  const all: StatusEntry[] = [...groups.needsYou, ...groups.working, ...groups.idle, ...groups.asleep]
  const attention = [
    ...groups.needsYou.map(e => ({ e, text: `Waiting for your input · ${formatAge(e.since, now)}` })),
    ...all.filter(e => e.status !== 'needs-you' && (unread[e.agent.id] ?? 0) > 0)
      .map(e => ({ e, text: `${unread[e.agent.id]} unread message${unread[e.agent.id] === 1 ? '' : 's'}` })),
  ]

  if (agents.length === 0) {
    return (
      <div className="flex-1 grid place-items-center p-10">
        <Card className="w-full max-w-[520px]">
          <Row title="Create your first agent" description="An agent is a Claude Code (or other CLI) session with its own folder, memory and inbox."
            control={<Button variant="accent" onClick={onNewAgent}><Plus strokeWidth={1.5} className="w-4 h-4" />New agent</Button>} />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-10 py-14">
      <div className="mx-auto w-full max-w-[760px]">
        {attention.length > 0 && (
          <>
            <h3 className="text-[15px] font-normal text-gray-400 mb-3">Needs you</h3>
            <Card className="mb-7">
              {attention.map(({ e, text }) => (
                <Row key={e.agent.id}
                  title={<span className="flex items-center gap-3"><AgentAvatar agent={e.agent} size="sm" showStatus />{displayName(e.agent)}</span>}
                  description={text}
                  control={<Button onClick={() => onSelectAgent(e.agent)}>Open</Button>} />
              ))}
            </Card>
          </>
        )}
        <h3 className="text-[15px] font-normal text-gray-400 mb-3">Agents</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
          {all.map(e => (
            <button type="button" key={e.agent.id} onClick={() => onSelectAgent(e.agent)}
              className="text-left flex flex-col gap-2.5 rounded-[14px] border border-hairline bg-surface p-3.5 hover:bg-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
              <span className="flex items-center gap-2"><AgentAvatar agent={e.agent} size="sm" showStatus /><span className="text-[14px] font-medium text-ink truncate">{displayName(e.agent)}</span></span>
              <span className="text-[12px] text-ink-muted">{STATE_LABEL[e.status]}{e.since && e.status !== 'offline' ? ` ${formatAge(e.since, now)}` : ''}</span>
            </button>
          ))}
          <button type="button" onClick={onNewAgent}
            className="grid place-items-center rounded-[14px] border border-dashed border-hairline text-ink-muted hover:text-ink min-h-[78px]">
            <span className="flex items-center gap-2 text-[14px]"><Plus strokeWidth={1.5} className="w-4 h-4" />New</span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

### SettingsShell
- Path: `components/settings/SettingsShell.tsx`
- Description: /settings frame: 268px section nav with search ("/" focuses), Back link, breadcrumb header, centred max-w-[1100px] content (1400 for marketplace).

```tsx
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  PanelLeft, Search, Server, Globe, Webhook, Brain, SquareTerminal, ShoppingBag,
  FlaskConical, Rocket, HelpCircle, Info, ArrowLeft, type LucideIcon,
} from 'lucide-react'
import { filterSections, sectionLabel, type SettingsSectionId } from '@/lib/settings-sections'

const ICONS: Record<SettingsSectionId, LucideIcon> = {
  hosts: Server, domains: Globe, webhooks: Webhook, memory: Brain, terminal: SquareTerminal,
  marketplace: ShoppingBag, experiments: FlaskConical, onboarding: Rocket, help: HelpCircle, about: Info,
}

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'

/** T3-style settings frame: section nav with Back, breadcrumb, centred content. */
export default function SettingsShell({ section, onSectionChange, wide = false, children }: {
  section: SettingsSectionId
  onSectionChange: (id: SettingsSectionId) => void
  /** Marketplace embeds a wide browser */
  wide?: boolean
  children: ReactNode
}) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const sections = filterSections(query)

  // "/" focuses the section search (unless typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.key !== '/' || t?.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 flex bg-sunken text-ink overflow-hidden">
      <aside className="w-[268px] flex-none flex flex-col bg-surface border-r border-hairline px-3 pt-4 pb-3 min-h-0">
        <div className="flex items-center gap-3 px-2.5 pb-4 text-[15px] font-medium">
          <PanelLeft strokeWidth={1.5} className="w-4 h-4" />AI Maestro
        </div>

        <label className="flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] text-ink-muted focus-within:bg-raised/60">
          <Search strokeWidth={1.5} className="w-4 h-4 flex-none" />
          <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" aria-label="Search settings"
            onKeyDown={e => {
              if (e.key === 'Enter' && sections[0]) { onSectionChange(sections[0].id); setQuery(''); e.currentTarget.blur() }
              if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur() }
            }}
            className="flex-1 min-w-0 bg-transparent placeholder:text-ink-muted text-ink focus:outline-none" />
          <span className="text-[12px] text-gray-500">/</span>
        </label>

        <nav aria-label="Settings sections" className="flex-1 overflow-y-auto min-h-0 mt-1">
          {sections.map(s => {
            const Icon = ICONS[s.id]
            const on = s.id === section
            return (
              <button key={s.id} type="button" onClick={() => onSectionChange(s.id)} aria-current={on ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] transition-colors ${focus} ${on ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
                <Icon strokeWidth={1.5} className="w-4 h-4 flex-none" />{s.label}
              </button>
            )
          })}
          {sections.length === 0 && <div className="px-2.5 py-2 text-[13px] text-gray-500">No matching settings</div>}
        </nav>

        <Link href="/" className={`flex items-center gap-3 px-2.5 py-2 mt-2 pt-3 border-t border-hairline text-[15px] text-ink-muted hover:text-ink rounded-[10px] ${focus}`}>
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />Back
        </Link>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-[60px] flex-none flex items-center gap-2.5 px-8 text-[16px] text-ink-muted">
          <span>Settings</span><span>/</span><span className="text-ink font-medium">{sectionLabel(section)}</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className={`mx-auto px-10 pt-2 pb-12 ${wide ? 'max-w-[1400px]' : 'max-w-[1100px]'}`}>{children}</div>
        </div>
      </main>
    </div>
  )
}
```
