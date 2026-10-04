'use client'

/**
 * Appearance: Ink (dark), Paper (light) or System. Writes the preference and
 * pings ThemeApplier, which swaps the body class live; no reload.
 */

import { useEffect, useState } from 'react'
import { Card, Row, GroupLabel } from '@/components/shell/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { readPref, writePref } from '@/lib/safe-storage'
import { DEFAULT_THEME_PREF, THEME_PREFS, THEME_PREF_EVENT, THEME_PREF_KEY, type ThemePref } from '@/lib/theme'

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'ink', label: 'Ink (dark)' },
  { value: 'paper', label: 'Paper (light)' },
  { value: 'system', label: 'System' },
]

export default function AppearanceSection() {
  const [pref, setPref] = useState<ThemePref>(DEFAULT_THEME_PREF)
  // Read after mount: the server render has no localStorage
  useEffect(() => { setPref(readPref<ThemePref>(THEME_PREF_KEY, DEFAULT_THEME_PREF, THEME_PREFS)) }, [])

  const change = (value: string) => {
    if (!(THEME_PREFS as readonly string[]).includes(value)) return
    const next = value as ThemePref
    setPref(next)
    writePref(THEME_PREF_KEY, next)
    window.dispatchEvent(new Event(THEME_PREF_EVENT))
  }

  return (
    <>
      <GroupLabel>Theme</GroupLabel>
      <Card>
        <Row wrap title="Colour theme"
          description="Ink is the dark theme, Paper the light one. System follows your operating system and switches with it. Terminals already open pick the change up immediately."
          control={
            <Select value={pref} onValueChange={change}>
              <SelectTrigger aria-label="Colour theme" className="h-[34px] w-[180px] text-[14px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          } />
      </Card>
    </>
  )
}
