'use client'

import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { Card, Row, Toggle, GroupLabel, EmptyState, Notice } from '@/components/shell/ui'
import { readBool, writePref } from '@/lib/safe-storage'

interface FeatureFlag {
  id: string
  name: string
  description: string
  storageKey: string
  warning?: string
}

const FEATURE_FLAGS: FeatureFlag[] = [
  // Agent-Centric Sidebar has been promoted to production (v0.17.0+)
  // Add new experiments here as needed
]

export default function ExperimentsSection() {
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FEATURE_FLAGS.map(f => [f.id, readBool(f.storageKey, false)])))
  const [changed, setChanged] = useState(false)

  const setFlag = (flag: FeatureFlag, value: boolean) => {
    setFlags(prev => ({ ...prev, [flag.id]: value }))
    writePref(flag.storageKey, String(value))
    setChanged(true)
  }

  return (
    <>
      <GroupLabel action={changed ? <Notice>Reload the page to apply changes</Notice> : undefined}>Feature flags</GroupLabel>
      <Card>
        {FEATURE_FLAGS.length === 0 ? (
          <EmptyState
            icon={<FlaskConical strokeWidth={1.5} className="w-6 h-6" />}
            title="No active experiments"
            description="All experimental features have been promoted to production. Check back later for new ones to try."
          />
        ) : (
          FEATURE_FLAGS.map(flag => (
            <Row key={flag.id} wrap title={flag.name}
              description={flag.warning ? <>{flag.description} <span className="text-warn">{flag.warning}</span></> : flag.description}
              control={<Toggle checked={!!flags[flag.id]} onChange={v => setFlag(flag, v)} label={flag.name} />} />
          ))
        )}
      </Card>

      <GroupLabel>About experiments</GroupLabel>
      <Card>
        <Row wrap title="Works in progress"
          description="Experimental features may be unstable, incomplete, or change significantly before release. Report issues or suggestions via GitHub." />
      </Card>
    </>
  )
}
