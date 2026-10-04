'use client'

import { useEffect } from 'react'
import { readPref } from '@/lib/safe-storage'
import {
  DEFAULT_THEME_PREF, THEME_APPLIED_EVENT, THEME_PREFS, THEME_PREF_EVENT, THEME_PREF_KEY,
  resolveTheme, type ThemePref,
} from '@/lib/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Keeps <body>'s theme class in step with the stored preference. The server
 * renders `theme-ink`; this swaps to paper after mount when the preference (or
 * the OS, for `system`) says so. Renders nothing.
 */
export default function ThemeApplier() {
  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY)

    const apply = () => {
      const pref = readPref<ThemePref>(THEME_PREF_KEY, DEFAULT_THEME_PREF, THEME_PREFS)
      const next = resolveTheme(pref, mq.matches)
      const body = document.body
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
