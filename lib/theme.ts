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
