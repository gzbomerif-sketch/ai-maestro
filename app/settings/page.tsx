'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SettingsShell from '@/components/settings/SettingsShell'
import HostsSection from '@/components/settings/HostsSection'
import DomainsSection from '@/components/settings/DomainsSection'
import WebhooksSection from '@/components/settings/WebhooksSection'
import HelpSection from '@/components/settings/HelpSection'
import AboutSection from '@/components/settings/AboutSection'
import OnboardingSection from '@/components/settings/OnboardingSection'
import ExperimentsSection from '@/components/settings/ExperimentsSection'
import MarketplaceSection from '@/components/settings/MarketplaceSection'
import MemorySection from '@/components/settings/MemorySection'
import TerminalSection from '@/components/settings/TerminalSection'
import { parseSection, type SettingsSectionId } from '@/lib/settings-sections'

const SECTIONS: Record<SettingsSectionId, () => JSX.Element> = {
  hosts: HostsSection,
  domains: DomainsSection,
  webhooks: WebhooksSection,
  memory: MemorySection,
  terminal: TerminalSection,
  marketplace: MarketplaceSection,
  experiments: ExperimentsSection,
  onboarding: OnboardingSection,
  help: HelpSection,
  about: AboutSection,
}

function SettingsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const section = parseSection(params)
  const Section = SECTIONS[section]

  return (
    <SettingsShell section={section} onSectionChange={id => router.replace(`/settings?section=${id}`)} wide={section === 'marketplace'}>
      <Section />
    </SettingsShell>
  )
}

export default function SettingsPage() {
  // useSearchParams needs a Suspense boundary in the app router
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  )
}
