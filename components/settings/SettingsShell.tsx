'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  PanelLeft, Search, Server, Globe, Webhook, Brain, SquareTerminal, ShoppingBag,
  FlaskConical, Rocket, HelpCircle, Info, ArrowLeft, type LucideIcon,
} from 'lucide-react'
import { filterSections, sectionLabel, type SettingsSectionId } from '@/lib/settings-sections'

const ICONS: Record<SettingsSectionId, LucideIcon> = {
  hosts: Server, domains: Globe, webhooks: Webhook, memory: Brain, terminal: SquareTerminal,
  marketplace: ShoppingBag, experiments: FlaskConical, onboarding: Rocket, help: HelpCircle, about: Info,
}

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'

/** T3-style settings frame: section nav with Back, breadcrumb, centred content. */
export default function SettingsShell({ section, onSectionChange, wide = false, children }: {
  section: SettingsSectionId
  onSectionChange: (id: SettingsSectionId) => void
  /** Marketplace embeds a wide browser */
  wide?: boolean
  children: ReactNode
}) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const sections = filterSections(query)

  // "/" focuses the section search (unless typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.key !== '/' || t?.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 flex bg-sunken text-ink overflow-hidden">
      <aside className="w-[268px] flex-none flex flex-col bg-surface border-r border-hairline px-3 pt-4 pb-3 min-h-0">
        <div className="flex items-center gap-3 px-2.5 pb-4 text-[15px] font-medium">
          <PanelLeft strokeWidth={1.5} className="w-4 h-4" />AI Maestro
        </div>

        <label className="flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] text-ink-muted focus-within:bg-raised/60">
          <Search strokeWidth={1.5} className="w-4 h-4 flex-none" />
          <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" aria-label="Search settings"
            onKeyDown={e => {
              if (e.key === 'Enter' && sections[0]) { onSectionChange(sections[0].id); setQuery(''); e.currentTarget.blur() }
              if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur() }
            }}
            className="flex-1 min-w-0 bg-transparent placeholder:text-ink-muted text-ink focus:outline-none" />
          <span className="text-[12px] text-gray-500">/</span>
        </label>

        <nav aria-label="Settings sections" className="flex-1 overflow-y-auto min-h-0 mt-1">
          {sections.map(s => {
            const Icon = ICONS[s.id]
            const on = s.id === section
            return (
              <button key={s.id} type="button" onClick={() => onSectionChange(s.id)} aria-current={on ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] transition-colors ${focus} ${on ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
                <Icon strokeWidth={1.5} className="w-4 h-4 flex-none" />{s.label}
              </button>
            )
          })}
          {sections.length === 0 && <div className="px-2.5 py-2 text-[13px] text-gray-500">No matching settings</div>}
        </nav>

        <Link href="/" className={`flex items-center gap-3 px-2.5 py-2 mt-2 pt-3 border-t border-hairline text-[15px] text-ink-muted hover:text-ink rounded-[10px] ${focus}`}>
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />Back
        </Link>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-[60px] flex-none flex items-center gap-2.5 px-8 text-[16px] text-ink-muted">
          <span>Settings</span><span>/</span><span className="text-ink font-medium">{sectionLabel(section)}</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className={`mx-auto px-10 pt-2 pb-12 ${wide ? 'max-w-[1400px]' : 'max-w-[1100px]'}`}>{children}</div>
        </div>
      </main>
    </div>
  )
}
