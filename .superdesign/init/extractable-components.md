# Extractable Components

Catalog for Superdesign `DraftComponent` extraction. Source of full code: layouts.md (layout) and components.md (basic). Props listed are ONLY per-page state/navigation props; everything else (icon names, labels, classes, avatar rendering) is hardcoded. Dark ink theme only; all colours are semantic tokens (see theme.md).

# Layout Components

## AppShell
- Source: `components/shell/AppShell.tsx`
- Category: layout
- Description: Root desktop frame: `fixed inset-0 flex bg-sunken` row of sidebar, resize handle and main region (Home / agent work area / team workspace).
- Extractable props: sidebarCollapsed (boolean, default: false), activeView ("home" | "agent" | "team", default: "agent")
- Hardcoded: layout structure, sidebar width, overlays (palette, wizard), all CSS

## StatusSidebar
- Source: `components/shell/StatusSidebar.tsx`
- Category: layout
- Description: Left sidebar (default 268px): brand + collapse, ⌘K search, Home, "Needs you" card, Status/Project toggle, grouped agent rows with unread badges and status dots, Teams list, footer icon links + New agent.
- Extractable props: activeItem ("home" | agent id | team id, default: "home"), groupMode ("status" | "project", default: "status"), unreadCount per agent (number), showNeedsYouCard (boolean, default: false), showError (boolean, default: false), settingsHref ("/settings"), teamsHref ("/teams"), meetingsHref ("/team-meeting"), pluginsHref ("/plugin-builder")
- Hardcoded: brand text "AI Maestro", section labels (Working / Idle / Asleep), icon names, avatar rendering, CSS

## AgentTopBar
- Source: `components/shell/AgentTopBar.tsx`
- Category: layout
- Description: 60px header of an agent workspace: host / avatar / name breadcrumb, status label with age, Wake|Sleep button, pop-out link, "more" menu (Profile, Export transcript), window launcher and minimize-all.
- Extractable props: status ("needs-you" | "working" | "idle" | "asleep" | "offline", default: "idle"), sidebarCollapsed (boolean, default: false), hasWindows (boolean, default: false), popOutHref ("/zoom/agent?id=…")
- Hardcoded: Wake/Sleep labels, icon names, menu items, spacing, CSS

## TeamTopBar
- Source: `components/shell/TeamTopBar.tsx`
- Category: layout
- Description: 60px header of a team workspace: team name, member avatars, meeting start/end action, window launcher.
- Extractable props: meetingLive (boolean, default: false), sidebarCollapsed (boolean, default: false), hasWindows (boolean, default: false)
- Hardcoded: labels, icons, CSS

## WorkArea
- Source: `components/shell/WorkArea.tsx`
- Category: layout
- Description: Region under the sidebar: top-bar slot, chat/centre slot, overlay slot and a WindowLayer of floating tool windows.
- Extractable props: none beyond content slots (top, center, overlay)
- Hardcoded: layout, window-layer behaviour

## WindowLayer
- Source: `components/shell/WindowLayer.tsx`
- Category: layout
- Description: Pointer-transparent overlay hosting floating windows, the snap-preview half panel and the bottom strip of minimized-window pills.
- Extractable props: minimizedCount (number, default: 0)
- Hardcoded: pill styling, snap preview styling, CSS

## FloatingWindow
- Source: `components/shell/FloatingWindow.tsx`
- Category: layout
- Description: Tool window chrome: 40px raised title bar (icon, title, minimize / maximize / close), surface body, 8 resize zones; `rounded-[12px]` border-hairline shadow-lg, square when maximized.
- Extractable props: title (string), maximized (boolean, default: false), minimized (boolean, default: false)
- Hardcoded: button icons, title bar height, resize zones, CSS

## ResizeHandle
- Source: `components/shell/ResizeHandle.tsx`
- Category: layout
- Description: 1px hairline divider with a wide invisible grip and hover tooltip (sidebar width).
- Extractable props: orientation ("vertical" | "horizontal", default: "vertical")
- Hardcoded: grip size, tooltip, CSS

## HomeScreen
- Source: `components/shell/HomeScreen.tsx`
- Category: layout
- Description: Landing view when no agent is selected: optional "Needs you" card list, agent tile grid (name, avatar with dot, state + age) with dashed "New" tile; empty state card for first agent.
- Extractable props: hasAgents (boolean, default: true), showNeedsYou (boolean, default: true)
- Hardcoded: headings "Needs you" / "Agents", tile styling, CSS

## SettingsShell
- Source: `components/settings/SettingsShell.tsx`
- Category: layout
- Description: Settings frame: 268px section nav with search and Back link, breadcrumb header, centred scrollable content.
- Extractable props: section (SettingsSectionId, default: "hosts"), wide (boolean, default: false)
- Hardcoded: section list and icons, search box, Back href "/", CSS

## ProjectTree
- Source: `components/shell/ProjectTree.tsx`
- Category: layout
- Description: Sidebar tag tree (group > subgroup > agents) with collapsible chevrons, status dots and unread badges.
- Extractable props: activeAgentId (string | null)
- Hardcoded: chevron icons, indentation, CSS

## TeamSection
- Source: `components/shell/TeamSection.tsx`
- Category: layout
- Description: Sidebar "Teams" list with live-meeting marker and inline create-team dialog.
- Extractable props: activeTeamId (string | null, default: null)
- Hardcoded: heading, create dialog, CSS

## WindowLauncher / ToolMenu
- Source: `components/shell/PanelMenu.tsx`
- Category: layout
- Description: ＋ button opening a tool menu (rows with icon, label, key hint, section headers) plus minimize/restore-all toggle in the top bars.
- Extractable props: allMinimized (boolean, default: false), hasWindows (boolean, default: false)
- Hardcoded: tool list, icons, key hints, CSS

# Basic Components

## Button
- Source: `components/shell/ui.tsx` (export `Button`)
- Category: basic
- Description: 34px, 10px-radius button with outline / accent / danger variants.
- Extractable props: variant ("outline" | "accent" | "danger", default: "outline"), disabled (boolean, default: false)
- Hardcoded: height, radius, text size, focus outline

## IconButton
- Source: `components/shell/ui.tsx` (export `IconButton`)
- Category: basic
- Description: 34x34 square ghost icon button with active state.
- Extractable props: active (boolean, default: false)
- Hardcoded: icon (child), size, hover styling

## Badge
- Source: `components/shell/ui.tsx` (export `Badge`)
- Category: basic
- Description: Accent-filled pill counter (unread).
- Extractable props: count (number)
- Hardcoded: colours, 11px text

## StatusDot
- Source: `components/shell/ui.tsx` (export `StatusDot`)
- Category: basic
- Description: 7px status dot; working has a soft accent ring.
- Extractable props: status ("needs-you" | "working" | "idle" | "asleep" | "offline", default: "idle")
- Hardcoded: size, colour map

## SectionLabel
- Source: `components/shell/ui.tsx` (export `SectionLabel`)
- Category: basic
- Description: Muted label with hairline rule and optional count.
- Extractable props: count (number)
- Hardcoded: text size, rule

## Card
- Source: `components/shell/ui.tsx` (export `Card`)
- Category: basic
- Description: `bg-surface border-hairline rounded-[14px]` container; rows inside divide with hairlines.
- Extractable props: none
- Hardcoded: radius, border, background

## Row
- Source: `components/shell/ui.tsx` (export `Row`)
- Category: basic
- Description: Settings/list row: title + description on the left, control on the right, hairline top border.
- Extractable props: clickable (boolean, default: false)
- Hardcoded: paddings (22px/16px), text sizes

## Toggle
- Source: `components/shell/ui.tsx` (export `Toggle`)
- Category: basic
- Description: 40x22 switch, accent-fill when on.
- Extractable props: checked (boolean, default: false)
- Hardcoded: size, colours

## Field / NumberField / Textarea / Select / Checkbox
- Source: `components/shell/ui.tsx`
- Category: basic
- Description: Ink-style form controls (sunken bg, control-border, 34px high, 10px radius; `mono` variant for URLs/keys).
- Extractable props: mono (boolean, default: false), disabled (boolean, default: false)
- Hardcoded: sizes, placeholder colour, focus outline

## Notice
- Source: `components/shell/ui.tsx` (export `Notice`)
- Category: basic
- Description: One-line inline result with icon (success/error/info).
- Extractable props: tone ("success" | "error" | "info", default: "info")
- Hardcoded: icons, text size

## EmptyState
- Source: `components/shell/ui.tsx` (export `EmptyState`)
- Category: basic
- Description: Centred icon / title / description / action block.
- Extractable props: none
- Hardcoded: spacing, text sizes

## Dialog
- Source: `components/shell/ui.tsx` (export `Dialog`)
- Category: basic
- Description: Modal card (surface, hairline, 14px radius) with 56px header + close, scrollable body, footer actions; black/60 scrim.
- Extractable props: open (boolean, default: false), width (number, default: 520)
- Hardcoded: header, scrim, focus trap

## GroupLabel
- Source: `components/shell/ui.tsx` (export `GroupLabel`)
- Category: basic
- Description: 15px gray-400 sentence-case heading above a Card.
- Extractable props: none
- Hardcoded: text style

## AgentAvatar
- Source: `components/AgentAvatar.tsx`
- Category: basic
- Description: Round avatar (portrait image, emoji or hash-coloured initial) with optional status dot.
- Extractable props: size ("xs" | "sm" | "md" | "lg", default: "md"), showStatus (boolean, default: false)
- Hardcoded: pixel sizes (20/28/40/64), colour hashing, fallback rules

## AgentTaskList
- Source: `components/tasks/AgentTaskList.tsx`
- Category: basic
- Description: Task list with quick-add input, checkbox rows, priority/status selects; `compact` is the card variant.
- Extractable props: compact (boolean, default: false)
- Hardcoded: priority/status options, empty text, CSS

## ColonyProfileCard
- Source: `components/shell/ColonyProfileCard.tsx`
- Category: basic
- Description: Bot profile card inside the Colony window: avatar, name, status, detail rows, tasks, edit form, action buttons (Open workspace, Terminal, Skills, New conversation).
- Extractable props: editing (boolean, default: false), hidden (boolean, default: false)
- Hardcoded: action labels, field set, icons, CSS

## CommandPalette
- Source: `components/shell/CommandPalette.tsx`
- Category: basic
- Description: ⌘K palette dialog: search input, ranked results of agents (avatar + status), teams, screens and settings sections.
- Extractable props: open (boolean, default: false)
- Hardcoded: placeholder, result groups, key hints

## shadcn/ui set
- Source: `components/ui/{button,checkbox,command,dialog,dropdown-menu,popover,scroll-area,select,switch,tabs,tooltip}.tsx`
- Category: basic
- Description: Vendored shadcn/Radix primitives bound to the ink tokens (secondary to shell/ui.tsx; used inside ColonyProfileCard, AgentTaskList, marketplace editors).
- Extractable props: per-component variant/size (button: default|destructive|outline|secondary|ghost|link; default|sm|lg|icon)
- Hardcoded: cva classes, Radix structure
