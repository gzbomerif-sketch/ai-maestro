'use client'

import { useEffect, useLayoutEffect } from 'react'
import { readPref } from '@/lib/safe-storage'
import {
  DEFAULT_THEME_PREF, THEME_APPLIED_EVENT, THEME_PREFS, THEME_PREF_EVENT, THEME_PREF_KEY,
  themeForShell, type ActiveShell, type ThemePref,
} from '@/lib/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * page.tsx publishes the shell it shows on <body data-shell> (before paint, so the theme can follow
 * without a flash). No shell published (any other route) counts as not the command center.
 */
export function useActiveShell(shell: ActiveShell) {
  useIsoLayoutEffect(() => {
    document.body.dataset.shell = shell
    window.dispatchEvent(new Event(THEME_PREF_EVENT))
    return () => {
      delete document.body.dataset.shell
      window.dispatchEvent(new Event(THEME_PREF_EVENT))
    }
  }, [shell])
}

/**
 * Keeps <body>'s theme class in step with the stored preference. The server
 * renders `theme-ink`; this swaps to paper after mount when the preference (or
 * the OS, for `system`) says so — on the command-center shell only (<body
 * data-shell>, see useActiveShell); every other shell and route stays Ink. Renders nothing.
 */
export default function ThemeApplier() {
  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY)

    const apply = () => {
      const pref = readPref<ThemePref>(THEME_PREF_KEY, DEFAULT_THEME_PREF, THEME_PREFS)
      const body = document.body
      const next = themeForShell(pref, mq.matches, body.dataset.shell)
      if (!body.classList.contains(next)) {
        body.classList.remove('theme-ink', 'theme-paper')
        body.classList.add(next)
        window.dispatchEvent(new Event(THEME_APPLIED_EVENT))
      }
    }

    apply()
    // `system` follows the OS live; harmless for the explicit prefs because apply() re-reads the pref
    mq.addEventListener('change', apply)
    window.addEventListener(THEME_PREF_EVENT, apply)
    // Another tab changed the preference
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_PREF_KEY) apply() }
    window.addEventListener('storage', onStorage)
    return () => {
      mq.removeEventListener('change', apply)
      window.removeEventListener(THEME_PREF_EVENT, apply)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return null
}
