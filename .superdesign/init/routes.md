# Routes

File-based routing (Next.js 14 App Router, `app/`). No router config file exists. Single shared layout: `app/layout.tsx` (see layouts.md) for every route — there are no nested `layout.tsx` files. Server entry is a custom `server.mjs` (WebSocket terminals); UI routes below. `app/api/**` are JSON/WebSocket endpoints (agents, sessions, teams, meetings, messages, memory, hosts, marketplace, settings, webhooks, v1, …) and have no UI.

| URL | File | Layout / frame | What it renders |
|---|---|---|---|
| `/` | `app/page.tsx` | root layout; `AppShell` (command-center) or legacy classic | The whole product: sidebar of agents by status/project, Home, per-agent work area (chat + floating tool windows), team workspace via `/?team=<id>`, ⌘K palette. `shell` pref `command-center` (default) \| `classic`; mobile/tablet render `MobileDashboard`/`TabletDashboard`. |
| `/settings` | `app/settings/page.tsx` | `SettingsShell` (full-screen, ink theme) | Sections via `?section=`: hosts, domains, webhooks, memory, terminal, marketplace, experiments, onboarding, help, about. |
| `/teams` | `app/teams/page.tsx` | `ShellRedirect` → classic fallback: gray-900 page, back link, `TeamListCard` grid, create-team modal | Team list. In command-center it redirects to `/` (teams live in the sidebar). |
| `/teams/[id]` | `app/teams/[id]/page.tsx` | `ShellRedirect` → classic fallback: `TeamDashboardSidebar` + section content | Team dashboard (overview, tasks, kanban, documents, instructions). Redirects to `/?team=<id>` in command-center. |
| `/team-meeting` | `app/team-meeting/page.tsx` | `ShellRedirect` → classic fallback: fixed gray-950 | `MeetingLobby` / `MeetingRoom` (`?meeting=`, `?team=`). Redirects into the shell team chat in command-center. |
| `/marketplace` | `app/marketplace/page.tsx` | standalone, gray-950, sticky blurred header, max-w-7xl | Browse Claude Code marketplace skills (`SkillBrowser mode="browse"`). |
| `/plugin-builder` | `app/plugin-builder/page.tsx` | standalone, fixed gray-950, header + 2-pane | Compose a plugin from skills: `SkillPicker` + `PluginComposer` + `BuildAction`. |
| `/zoom` | `app/zoom/page.tsx` | standalone, gray-900, header + grid (`zoom.css`) | "Zoom View": grid of live `AgentCard`s with an expanded `AgentCardView` modal. |
| `/zoom/agent` | `app/zoom/agent/page.tsx` | standalone, fixed gray-900 | Single agent's live card view (`?id=`), target of the top bar's "Pop out". |
| `/immersive` | `app/immersive/page.tsx` | standalone, fixed gray-900 | Full-screen single-agent terminal view with an agent picker dialog. |
| `/companion` | `app/companion/page.tsx` | standalone, fixed black | Voice/face companion (AgentFace, TTS, speech input) for an agent. |
| `/logos` | `app/logos/page.tsx` | standalone | Logo preview sheet. |

## Key page summaries
- `/` — see pages.md for the full tree. Sidebar (default 268px, range 220–420, resizable via `ResizeHandle`, collapsible ⌘B) groups agents "Needs you / Working / Idle / Asleep" (or by project tag), lists teams, links to Settings/Teams/Meetings/Plugins. Main area: `HomeScreen` when nothing selected; `WorkArea` when an agent is selected (60px `AgentTopBar`, chat base layer, `WindowLayer` of floating tool windows: terminal, inbox, tasks, skills, files, memory, graph, docs, canvas, search, playback, export, browser, colony); `TeamWorkspace` for a team.
- `/settings` — `SettingsShell` left nav (268px) + breadcrumb "Settings / <Section>" + stack of `GroupLabel` + `Card` + `Row` controls (shell/ui.tsx primitives).
