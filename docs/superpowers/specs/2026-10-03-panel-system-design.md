# Panel System (Part 1) — Design

**Date:** 2026-10-03
**Branch:** `redesign/command-center`
**Status:** Approved direction (mockups `panels-v1.html` and `panels-v3.html`); this spec is awaiting review.
**References:** the user's T3 Code screenshots (tabbed right panel with a ＋ menu and one-letter shortcuts; resizable sidebar and panel; maximize, dock-bottom and hide controls; a grey divider with a "Drag to resize sidebar" tooltip).

## 1. Goal

Replace the agent workspace's top tab row with the T3 model:

- **Chat is always the centre.**
- **Every other tool opens as a tab in a side panel.** That panel can sit on the right or be docked at the bottom, and can be resized, maximized or hidden.
- **The left sidebar is resizable** as well.

This is Part 1 of 3:
- Part 2 adds Team, Meeting and Kanban panel types and a Teams section to the sidebar, replacing the full-screen pages.
- Part 3 adds a Browser panel (URL bar plus live page) and a floating mini preview.

## 2. Scope

**In scope**
- Desktop command-center layout only: `components/shell/*` and the shell branch of `app/page.tsx`.
- A resizable left sidebar.
- A panel dock: tabs, ＋ menu, shortcuts, resize, maximize, dock to the bottom, hide.
- Moving the existing tools into panel types and removing `TabBar` from the shell.

**Out of scope**
- The classic layout, tablet and mobile.
- Team, Meeting and Kanban (Part 2) and Browser (Part 3). The menu is built to grow, so those parts only add entries.
- Any API change.

## 3. Layout

```
┌──────────┬─┬───────────────────────────┬─┬────────────────────────────┐
│ Sidebar  │┃│ Top bar: host / agent ·…  │┃│ [Terminal ✕][Inbox 3] ＋  ⤢ ▭ ◨│
│ 220–420px│┃│                           │┃│                            │
│ default  │┃│ Chat (ChatView/Streaming) │┃│ active panel content       │
│ 268      │┃│                           │┃│ (right: 320px – 70% width)  │
│          │┃│ composer                  │┃│                            │
└──────────┴─┴───────────────────────────┴─┴────────────────────────────┘
 ┃ = 1px divider
```

**Docked at the bottom:** the panel sits under the chat inside the main column. Its height runs from 200px to 70% of the main height, default 320px.

**Maximized:** the panel fills the whole main area (chat and panel region). The sidebar stays. A second ⤢ press or Esc restores it.

**Hidden:** the panel collapses to nothing. A ◨ button in the top bar shows it again. When no tabs are open, the panel shows an empty state, "Open a tool", with the same menu items listed.

## 4. Dividers

- **Look:** a 1px `border-hairline` line with a 9px invisible hit area, so the pointer catches it without the line looking thick.
- **Hover:** after about 400ms the line turns `bg-gray-600`, a slightly lighter grey, and a small tooltip appears by the pointer: "Drag to resize sidebar" or "Drag to resize panel".
- **No accent colour** at any point. While dragging, the line stays the lighter grey and the cursor is `col-resize` or `row-resize`.
- **Drag** uses pointer capture. Widths are clamped to their limits. During a drag, `user-select` is off and iframes and terminals get `pointer-events: none`, so the drag doesn't stall.
- **Double-click** resets the divider to its default size.
- **Keyboard:** the divider is focusable (`role="separator"`, `aria-orientation`, `aria-valuenow/min/max`). Arrow keys move it by 16px and Shift+Arrow by 64px.

## 5. Panel dock

**Tab strip (52px tall)**
- Each open panel is a chip: icon, label and an optional count (Inbox unread), plus a ✕ on hover or when active.
- The active chip uses `bg-raised`.
- After the chips comes the ＋ button. On the right are icon buttons for ⤢ maximize/restore, ▭/◨ dock bottom or right (the icon shows the *other* position) and hide.

**＋ menu** (opens under ＋, built from `Dialog`-free popover markup)

| Panel | Key | Content (existing components) |
|---|---|---|
| Terminal | T | `TerminalView` (hideHeader). For a streaming agent, the existing "terminal disabled in streaming mode" note |
| Inbox | I | `MessageCenter compact` (from `InboxPanel`) |
| Files | F | `WorkTree` |
| Memory | M | `MemoryViewer` |
| Code graph | G | `AgentGraph` |
| Docs | D | `DocumentationPanel` |
| Canvas | C | `CanvasPanel` |
| Search | S | `AgentSearch` |
| Playback | P | `AgentPlayback` |
| Export | X | `TranscriptExport` |

- While the menu is open, pressing a letter opens that panel. Arrow keys plus Enter work too, and Esc closes the menu.
- Opening a type that's already open focuses its tab instead of adding a second one. There is one instance per type.
- **Global shortcuts** (only when focus isn't in an input, textarea or the terminal):
  - ⌘J (Ctrl+J elsewhere) shows or hides the panel.
  - ⌘B (Ctrl+B) collapses or expands the sidebar.
  - ⌘⇧M maximizes or restores the panel.
- A hidden or tab-less ⌘J opens the panel with Terminal, or with the last active tab.
- **Hibernated or offline agents:** panels that need a live session (Terminal) show the existing wake prompt. The others work as they do today.

**Persistence** (localStorage via `lib/safe-storage.ts`, read after mount to avoid SSR mismatch)
- `aimaestro-layout`: `{ sidebarW, sidebarCollapsed, panel: { open, position, rightW, bottomH, maximized, tabs: PanelType[], active } }`.
- The layout is global rather than per agent, so switching agents keeps the same tools open, now showing the new agent.

## 6. Code

**Create**
- `lib/panel-layout.ts`, pure (TDD). It holds:
  - `PanelType`;
  - `PANEL_TYPES` (id, label, key, icon name);
  - `LayoutState` and `DEFAULT_LAYOUT`;
  - `layoutReducer(state, action)` with these actions: `open`, `close`, `activate`, `toggle`, `setPosition`, `toggleMaximize`, `resizeSidebar`, `resizePanel`, `toggleSidebar`, `reset`;
  - `clampWidth` / `clampHeight`, which take the container size;
  - `parseLayout(json)`, which validates every field and falls back on corrupt data;
  - `panelForKey(letter)`.
- `components/shell/ResizeHandle.tsx`: the divider in §4.
- `components/shell/PanelDock.tsx`: tab strip, ＋ menu, controls and body.
- `components/shell/PanelMenu.tsx`: the ＋ popover.
- `components/shell/panels.tsx`: a `renderPanel(type, agent, ctx)` map onto existing components. It reuses `AgentTabContent`'s pieces or calls it with the matching tab.
- `hooks/useLayout.ts`: `useReducer(layoutReducer)` plus persistence and the global shortcuts.

**Modify**
- `components/shell/AppShell.tsx`: new grid layout with sidebar, handle, main (top bar plus chat, or chat plus bottom dock), handle and right dock. Drop `TabBar` and `InboxPanel`.
- `components/shell/AgentTopBar.tsx`: replace the inbox toggle with a panel toggle (◨). Its ⋯ menu stays.
- `components/shell/StatusSidebar.tsx`: take the width from props, and add a collapse button (the PanelLeft icon in the brand row).

**Delete** once unused: `components/shell/TabBar.tsx` and `components/shell/InboxPanel.tsx`. Inbox content moves into `panels.tsx`.

## 7. Behaviour details

- **Chat stays mounted** when panels open or close. Panel bodies mount only while they're the active tab, as tabs do today.
- **Terminals refit when resized:** `hooks/useTerminal.ts` already has a debounced `ResizeObserver` that calls `fitAddon.fit()`.
- **Narrow windows:** below 1100px the right panel opens as an overlay sheet instead of shrinking the chat under 420px. Dragging still works.
- **The old `aimaestro-active-tab` preference migrates once.** If it named a non-chat tab, that tab opens in the panel.

## 8. Testing

**Unit tests (Vitest, written first) for `lib/panel-layout.ts`:**
- `open` with a duplicate type focuses it rather than adding it;
- `close` on the active tab activates its neighbour;
- `close` on the last tab leaves no tabs and keeps the panel open, showing the empty state;
- clamping for each limit, and when the container is smaller than the minimum;
- `toggleMaximize` and `setPosition`, where maximize is kept;
- `parseLayout` with garbage, partial objects, unknown panel types (dropped) and wrong types;
- `panelForKey` is case-insensitive and returns null for unknown letters.

**Unit tests for `ResizeHandle`'s pure helper `nextSize(start, delta, min, max)` and its keyboard steps.**

**Browser check (Playwright):**
- drag the sidebar and the panel dividers, and confirm the size changes and survives a reload;
- double-click resets the size;
- the hover tooltip appears and the colour stays grey;
- ＋ then T opens Terminal, ＋ then I opens Inbox, and a duplicate focuses the existing tab;
- ⌘J hides and shows the panel, ⌘B collapses the sidebar, and maximize/restore work;
- dock to the bottom and back;
- the terminal stays usable after a resize;
- no console errors.

**Gates:** lint, test and tsc, with no new failures. `yarn build` only with the dev server stopped.

## 9. Risks

- **Moving from top tabs to panels touches the user's daily flow.** The classic layout and ⌘K "Switch to classic" stay as the escape hatch.
- **Global shortcuts can conflict.** ⌘J and ⌘B are skipped inside inputs and the terminal. ⌘B could still clash with the browser's bookmarks bar in some browsers; if it does, use only the sidebar button.
