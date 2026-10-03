# Team Workspace (Panel System Part 2) — Design

**Date:** 2026-10-03
**Branch:** `redesign/command-center`
**Status:** Model approved (mockup `team-workspace-v1.html`); this spec is awaiting review.
**Builds on:** `2026-10-03-panel-system-design.md` (Part 1).

## 1. Goal

Teams work like agents. A team is a sidebar item. Selecting one turns the centre into that team's **meeting chat**. The right panel's ＋ menu then offers **team tools** (Kanban, Tasks, Documents, Instructions, Members) and **one terminal per member**. The full-screen `/teams`, `/teams/[id]` and `/team-meeting` pages are no longer used in the new layout.

## 2. Scope

**In scope**
- A Teams section in the sidebar, with create, a "live" marker and open-task counts.
- The team workspace: top bar, meeting chat and composer with a recipient picker, Start meeting and End meeting.
- Team panel tabs and their ＋ menu.
- A Team entry for each team in ⌘K.
- Redirects from the old pages when the new layout is active.

**Out of scope**
- Restyling the insides of the Kanban, Task, Documents, Instructions and Overview components. They already follow the ink colours through the themed ramps, and get a visual pass later.
- The classic layout. It keeps the old pages.
- Any API change.

## 3. Behaviour

**Selection**
- `AppShell` holds `teamId: string | null`. Picking a team sets it and calls `onSelectHome()` so no agent stays selected. Picking an agent or Home clears it.
- `/?team=<id>` selects a team on load.

**Sidebar "Teams" section**
- It sits below the agent groups.
- Each row shows the team name and, on the right, "● live" in `text-ok` if an active meeting has that `teamId`. Otherwise it shows the open-task count, or nothing.
- The section label's ＋ opens a `Dialog` with a Name field that calls `POST /api/teams {name, agentIds: []}` and selects the new team.
- Data:
  - `useTeams()`: `GET /api/teams` every 15s;
  - `useActiveMeetings()`: `GET /api/meetings?status=active` every 15s;
  - task counts come from `GET /api/teams/:id/tasks`, but only for the selected team (no N+1 queries).

**Team top bar**
- A breadcrumb, `Teams / <name>`.
- While a meeting is active: "● Meeting · 32m", using `formatAge` on `startedAt`, in `text-ok`.
- Member avatars, up to five, then "+n".
- A **Start meeting** button (accent) or an **End meeting** button (outline).
- The panel toggle (◨), as on agents.

**Start meeting**
- Calls `POST /api/meetings {name: team.name, agentIds: team.agentIds, teamId}`, then `POST /api/teams/notify {agentIds, teamName}` so the agents hear about it. If notify fails, the meeting still starts.
- If the team has no members, the button is disabled with the tooltip "Add members first".

**End meeting**
- Calls `PATCH /api/meetings/:id {status: 'ended', endedAt}`.

**Centre: meeting chat**
- With an active meeting: `useMeetingMessages({ meetingId, participantIds: team.agentIds, teamName, isActive: true })`.
  - Messages appear in the ink chat style. Mine are right-aligned bubbles. Others show "**sender** · age" above plain text.
  - The composer is the large rounded ink composer with a recipient `Select` that defaults to "Everyone", followed by each member. Enter sends. Everyone uses `broadcastToAll` and a member uses `sendToAgent(id)`.
- Without an active meeting: an empty state reading "No meeting running", with "Start a meeting to talk to all members at once," and the Start meeting button.

**Team panel**
- It shares Part 1's dock geometry (open, position, sizes, maximize), but has its **own tab list**.
- ＋ menu:
  - Team tools: Kanban **K**, Tasks **A**, Documents **D**, Instructions **N**, Members **E**.
  - Member terminals: the first nine members, on keys **1–9**, each labelled with the member's name.
- Bodies:
  - Kanban → `TaskKanbanBoard`;
  - Tasks → `TaskPanel`, both fed by `useTasks(teamId)`;
  - Documents → `TeamDocumentsSection`;
  - Instructions → `TeamInstructionsSection`;
  - Members → `TeamOverviewSection` (name, description, add/remove members through `useTeam`).
  - A member terminal → `AgentTabContent activeTab="terminal"` for that agent, with the wake prompt if it's asleep.
- A member terminal tab whose agent was removed from the team or deleted closes itself.
- The default team tabs are `['kanban']`.

**⌘K**
- One "Team · <name>" item per team selects it.

**Redirects**
- `/teams`, `/teams/[id]` and `/team-meeting`: when the stored shell preference is `command-center` (the default), the page redirects client-side:
  - `/teams/[id]` → `/?team=id`;
  - `/team-meeting?team=x` → `/?team=x`;
  - `/team-meeting?meeting=m` → that meeting's `teamId`, or `/` if it has none;
  - everything else → `/`.
- With the classic preference, the old page renders unchanged.

## 4. Code

**Create**
- `lib/team-panels.ts`, pure (TDD):
  - `TEAM_TOOLS` (id, label, key);
  - `TeamTab = 'kanban' | 'tasks' | 'documents' | 'instructions' | 'members' | \`term:${string}\``;
  - `isTeamTab`;
  - `teamTabForKey(key, memberIds)`;
  - `teamTabLabel(tab, nameOf)`;
  - `pruneMemberTabs(tabs, memberIds)`;
  - `activeMeetingFor(teamId, meetings)`;
  - `redirectTarget(pathname, params, meetingTeamId)`.
- `hooks/useTeams.ts`: `useTeams()` and `useActiveMeetings()`.
- `components/shell/TeamSection.tsx`: the sidebar section and the create dialog.
- `components/shell/TeamTopBar.tsx`.
- `components/shell/TeamChat.tsx`: feed plus composer.
- `components/shell/DockFrame.tsx`, extracted from `PanelDock`: tab strip, ＋ slot, controls and body slot.
- `components/shell/TeamPanelDock.tsx`: team tabs, menu and bodies.
- `components/shell/TeamWorkspace.tsx`: composes the top bar, chat and dock with Part 1's handles.

**Modify**
- `lib/panel-layout.ts`:
  - `PanelState` gains `teamTabs: string[]` and `teamActive: string | null`;
  - new actions `openTeam`, `closeTeam`, `activateTeam` and `pruneTeam`;
  - `parseLayout` validates them with `isTeamTab`;
  - the `toggle` action, used with no team tabs, opens `kanban`.
- `components/shell/PanelDock.tsx`: rebuilt on top of `DockFrame`, with no behaviour change.
- `components/shell/StatusSidebar.tsx`: renders `TeamSection`.
- `components/shell/AppShell.tsx`: holds `teamId` and renders `TeamWorkspace`.
- `components/shell/CommandPalette.tsx`: adds team items.
- `app/teams/page.tsx`, `app/teams/[id]/page.tsx`, `app/team-meeting/page.tsx`: add the redirect guard.

## 5. Testing

**Unit tests (written first):**
- `lib/team-panels`:
  - key mapping, case-insensitive, digits mapping to members, and out-of-range keys giving null;
  - `isTeamTab`, including `term:` ids;
  - labels, including an unknown member falling back to the id;
  - pruning;
  - `activeMeetingFor`, which prefers the most recent active meeting;
  - every `redirectTarget` path.
- Panel layout: the team actions (open, dedupe, close neighbour, prune), and `parseLayout` dropping invalid team tabs.

**Browser check:**
- create a team from the sidebar;
- add the agent through the Members panel;
- start a meeting, see "● live" and the timer, broadcast a message and see it in the feed;
- ＋ then K opens Kanban, and ＋ then 1 opens the member terminal;
- end the meeting;
- `/teams` redirects into the shell, and `/team-meeting?team=x` selects that team;
- ⌘K "Team · …" works;
- there are no console errors.

**Gates:** lint, test and tsc, with no new failures.

## 6. Risks

- **Notify on Start sends AMP messages** to every member. That's intended, and it matches the old "Notify" option, which was often turned on.
- **Meeting chat polls every 7s** (the existing hook), so it isn't instant.
- **The old components' insides still look a little different.** A visual pass is planned.
