'use client'

/**
 * Terminal preferences that used to sit in the terminal header as buttons
 * (v0.45.4): Auto-copy is set once, not used every time; the scroll keys are
 * reference, not live data.
 */

import { useEffect, useState } from 'react'
import { Card, Row, Toggle, GroupLabel } from '@/components/shell/ui'
import { readBool, writePref } from '@/lib/safe-storage'

const COPY_ON_SELECT_KEY = 'terminal-copy-on-select'

const SCROLL_KEYS: [string, string][] = [
  ['Mouse wheel', 'Scroll'],
  ['Shift + PgUp / PgDn', 'One page'],
  ['Shift + ↑ / ↓', 'Five lines'],
  ['Shift + Home / End', 'Top / bottom'],
]

export default function TerminalSection() {
  const [copyOnSelect, setCopyOnSelect] = useState(false)
  // Read after mount: the server render has no localStorage
  useEffect(() => { setCopyOnSelect(readBool(COPY_ON_SELECT_KEY, false)) }, [])
  const toggle = (next: boolean) => {
    setCopyOnSelect(next)
    writePref(COPY_ON_SELECT_KEY, String(next))
  }

  return (
    <>
      <GroupLabel>Selection</GroupLabel>
      <Card>
        <Row wrap title="Copy on select"
          description="Selecting text in a terminal copies it right away. Off: select, then use Copy in the terminal header."
          control={<Toggle checked={copyOnSelect} onChange={toggle} label="Copy on select" />} />
      </Card>

      <GroupLabel>Scrolling</GroupLabel>
      <Card>
        {SCROLL_KEYS.map(([keys, action]) => (
          <Row key={keys} title={action} control={<span className="font-mono text-[13px] text-ink-muted">{keys}</span>} />
        ))}
      </Card>
    </>
  )
}
