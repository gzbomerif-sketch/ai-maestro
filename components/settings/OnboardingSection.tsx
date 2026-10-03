'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Loader2 } from 'lucide-react'
import { Card, Row, Button, GroupLabel } from '@/components/shell/ui'
import { readString, removePref } from '@/lib/safe-storage'

export default function OnboardingSection() {
  const router = useRouter()
  const [restarting, setRestarting] = useState(false)
  const [completed] = useState(() => !!readString('aimaestro-onboarding-completed'))
  const [useCase] = useState(() => readString('aimaestro-onboarding-use-case'))

  const restart = () => {
    setRestarting(true)
    removePref('aimaestro-onboarding-completed')
    removePref('aimaestro-onboarding-use-case')
    // Home shows the onboarding wizard when the flag is missing
    setTimeout(() => router.push('/'), 500)
  }

  return (
    <>
      <GroupLabel>Status</GroupLabel>
      <Card>
        <Row title="Onboarding" description="The getting-started guide and setup wizard."
          control={<span className={`text-[14px] ${completed ? 'text-ok' : 'text-warn'}`}>{completed ? 'Completed' : 'Not completed'}</span>} />
        {useCase && (
          <Row title="Use case" description="The setup you picked in the wizard."
            control={<span className="text-[14px] text-ink-muted capitalize">{useCase.replace(/-/g, ' ')}</span>} />
        )}
      </Card>

      <GroupLabel>Restart</GroupLabel>
      <Card>
        <Row wrap title="Restart onboarding"
          description="Opens the wizard again to change your use case, review the guide, create an agent or explore deployment options. Your sessions and settings are not affected."
          control={
            <Button onClick={restart} disabled={restarting}>
              {restarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass strokeWidth={1.5} className="w-4 h-4" />}
              {restarting ? 'Restarting…' : 'Restart'}
            </Button>
          } />
      </Card>
    </>
  )
}
