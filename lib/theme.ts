/**
 * Theme preference: the user's choice (Ink, Paper, or follow the OS) resolved to
 * the class that goes on <body>. Pure; the DOM wiring is components/ThemeApplier.
 */
export type ThemePref = 'ink' | 'paper' | 'system'
export type ThemeClass = 'theme-ink' | 'theme-paper'

export const THEME_PREFS: readonly ThemePref[] = ['ink', 'paper', 'system']
export const THEME_PREF_KEY = 'aimaestro-theme'
/** Window event Settings dispatches after writing the pref, so the applier reacts without a reload. */
export const THEME_PREF_EVENT = 'aimaestro:theme-pref'
/** Fired on window by ThemeApplier after the body class changed, so live consumers (xterm) can re-read tokens. */
export const THEME_APPLIED_EVENT = 'aimaestro:theme-applied'
export const DEFAULT_THEME_PREF: ThemePref = 'ink'

export function resolveTheme(pref: ThemePref, systemDark: boolean): ThemeClass {
  if (pref === 'system') return systemDark ? 'theme-ink' : 'theme-paper'
  return pref === 'paper' ? 'theme-paper' : 'theme-ink'
}

/**
 * The dashboard shell page.tsx is showing, published on <body data-shell> (see useActiveShell in
 * components/ThemeApplier). Paper belongs to the command-center shell only: the classic, tablet and
 * phone shells and every other route keep Ink, whatever the preference.
 */
export type ActiveShell = 'command-center' | 'classic' | 'tablet' | 'phone'
export const COMMAND_CENTER_SHELL: ActiveShell = 'command-center'

export function themeForShell(pref: ThemePref, systemDark: boolean, shell: string | undefined): ThemeClass {
  return shell === COMMAND_CENTER_SHELL ? resolveTheme(pref, systemDark) : 'theme-ink'
}

/**
 * Before React runs, guess whether the command-center shell is what will mount, mirroring page.tsx
 * (shell pref, layout override, useDeviceType's phone/tablet split). The boot script in app/layout.tsx
 * inlines this same rule so a Paper user's command center never flashes Ink.
 */
export function expectCommandCenter(o: {
  pathname: string
  shellPref: string | null
  layoutMode: string | null
  width: number
  touch: boolean
}): boolean {
  if (o.pathname !== '/' || o.shellPref === 'classic') return false
  if (o.layoutMode === 'desktop') return true
  if (o.layoutMode === 'tablet') return false
  return o.width >= 1024 && !o.touch
}

