/**
 * Marketplace Section
 *
 * Settings section for browsing the skill marketplace.
 */

'use client'

import { SkillBrowser } from '@/components/marketplace'
import type { MarketplaceSkill } from '@/types/marketplace'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { GroupLabel, Notice } from '@/components/shell/ui'
import Link from 'next/link'

export default function MarketplaceSection() {
  const [notification, setNotification] = useState<string | null>(null)

  // Show notification when trying to install from settings
  const handleInstall = async (skill: MarketplaceSkill) => {
    setNotification(`To add "${skill.name}" to an agent, open the agent's profile and use the Skills section.`)
    setTimeout(() => setNotification(null), 5000)
  }

  return (
    <>
      <GroupLabel action={
        <Link href="/marketplace" className="inline-flex items-center gap-2 h-[34px] px-3 rounded-[10px] border border-control-border text-[14px] text-ink hover:bg-raised">
          <ExternalLink strokeWidth={1.5} className="w-4 h-4" />Open full page
        </Link>
      }>Skills from your Claude Code marketplaces</GroupLabel>
      <div className="mb-5"><Notice>To add a skill to an agent, open the agent&apos;s profile and use the Skills section.</Notice></div>
      {notification && <div className="mb-4"><Notice tone="info">{notification}</Notice></div>}
      <SkillBrowser onSkillInstall={handleInstall} mode="browse" />
    </>
  )
}
