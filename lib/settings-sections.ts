/**
 * The Settings sections: one source for the nav, the URL (?section=, legacy
 * ?tab=) and the ⌘K palette. Pure — icons live in SettingsShell.
 */
export type SettingsSectionId =
  | 'hosts' | 'domains' | 'webhooks' | 'memory' | 'terminal'
  | 'marketplace' | 'experiments' | 'onboarding' | 'help' | 'about'

export interface SettingsSection {
  id: SettingsSectionId
  label: string
  keywords: string[]
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: 'hosts', label: 'Hosts', keywords: ['machines', 'mesh', 'network', 'computers'] },
  { id: 'domains', label: 'Domains', keywords: ['dns', 'address'] },
  { id: 'webhooks', label: 'Webhooks', keywords: ['events', 'integrations', 'callbacks'] },
  { id: 'memory', label: 'Memory', keywords: ['consolidation', 'classifier', 'long-term'] },
  { id: 'terminal', label: 'Terminal', keywords: ['copy', 'selection', 'xterm'] },
  { id: 'marketplace', label: 'Marketplace', keywords: ['skills', 'plugins'] },
  { id: 'experiments', label: 'Experiments', keywords: ['flags', 'features', 'beta'] },
  { id: 'onboarding', label: 'Onboarding', keywords: ['setup', 'welcome'] },
  { id: 'help', label: 'Help', keywords: ['guide', 'docs'] },
  { id: 'about', label: 'About', keywords: ['version', 'credits'] },
]

const IDS = new Set<string>(SETTINGS_SECTIONS.map(s => s.id))

export function parseSection(params: { get(name: string): string | null } | null): SettingsSectionId {
  const v = params?.get('section') ?? params?.get('tab') ?? null
  return v && IDS.has(v) ? (v as SettingsSectionId) : 'hosts'
}

export function filterSections(query: string): SettingsSection[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...SETTINGS_SECTIONS]
  return SETTINGS_SECTIONS.filter(s => s.label.toLowerCase().includes(q) || s.keywords.some(k => k.includes(q)))
}

export function sectionLabel(id: SettingsSectionId): string {
  return SETTINGS_SECTIONS.find(s => s.id === id)?.label ?? 'Hosts'
}
