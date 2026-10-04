# AI Maestro — Design System (theme-ink)

## Product context
AI Maestro is a desktop web dashboard (localhost:23000) where one operator orchestrates ~93 AI coding agents across machines. Agents are the core entity — people-shaped, with portrait avatars, presence status, and their own chat + terminal. The operator switches agents constantly: orientation ("who am I talking to, what are they doing") beats density. Two surfaces carry the work: chat (center, fixed) and floating tool windows (terminal, colony world, inbox, files, tasks, skills) that the operator drags, snaps, minimizes over the chat. Power users first; the UI must stay calm during long sessions and legible at a glance.

## Key screens
- **Shell**: left sidebar (search, Home, status-grouped agent list with portrait avatars + status dots, Teams, footer icons), 60px top bar (breadcrumb host/agent, presence, Sleep button, overflow), center chat, floating windows with 40px title bars over the chat region.
- **Home**: "Needs you" alert cards + agent grid of avatar tiles.
- **Colony**: a 3D world (iframe) in a floating window with a right-hand profile card (avatar, status, meta rows, tasks checklist, action buttons).
- **Inbox**: two-pane list + reader. **Skills**: list + markdown editor.

## Visual language (hard constraints)
- **Dark, flat, near-black.** Elevation = surface steps + hairline borders, NOT shadows (only floating windows carry a soft `shadow-lg`). Background `#0a0a0b` (sunken), panels `#0f0f11` (surface), hover/selected/title bars `#1c1c20` (raised), borders `#1f1f23` (hairline, often at /70).
- **Text**: primary `#ececef` (ink), secondary `#85858d` (ink-muted). Weights 400/500 only. Sentence case everywhere, no uppercase tracking.
- **Accent**: indigo — text/focus tint `#9aa6ff`, primary fill `#2f4bff` (brand `#2236ff`). Used sparingly: primary buttons, unread badges, working-status ring, focus outlines.
- **Status vocabulary (load-bearing):** working = accent-fill dot with soft ring; needs-you = amber `#d6a243` (+ dark amber card `#16130d`/`#2a2314`); idle = gray-600; asleep/offline = gray-700; ok = green `#22c55e`; danger = red `#ef4444`.
- **Fonts**: Stack Sans Text (sans, 400/500); JetBrains Mono for code/terminal/ids/numbers.
- **Type scale (px, explicit)**: 16 top-bar titles · 15 body/nav/titles · 14 secondary/buttons/inputs · 13 meta/menus/window titles · 12 timestamps/tabs · 11 badges.
- **Metrics**: controls 34px tall; top bar 60px; window title bar 40px; icon buttons 34×34; radius 10px controls/rows, 12px windows/menus, 14px cards, full pills/dots.
- **Icons**: lucide, strokeWidth 1.5, 16px.
- **Focus**: 2px accent-fill outline (focus-visible only). **Motion**: minimal, transition-colors; respect reduced motion.
- Terminal (xterm) keeps its own color model — never restyle terminal content.

## Do not
- No light surfaces, no gradients, no glassmorphism, no decorative shadows, no serif/display fonts, no new hues beyond the status vocabulary, no uppercase labels.
