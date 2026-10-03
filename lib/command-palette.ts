/** ⌘K palette: search ranking and the shortcut guard. Pure. */
export interface CommandItem {
  id: string
  kind: 'agent' | 'screen' | 'action'
  label: string
  keywords: string[]
  hint?: string
}

const KIND_ORDER: Record<CommandItem['kind'], number> = { agent: 0, screen: 1, action: 2 }

function score(q: string, item: CommandItem): number {
  const label = item.label.toLowerCase()
  const words = [...label.split(/[\s\-_/.]+/), ...item.keywords.map(k => k.toLowerCase())]
  if (label.startsWith(q)) return 3
  if (words.some(w => w.startsWith(q))) return 2
  if (label.includes(q) || item.keywords.some(k => k.toLowerCase().includes(q))) return 1
  return 0
}

export function rankCommandResults(query: string, items: CommandItem[]): CommandItem[] {
  const q = query.trim().toLowerCase()
  const indexed = items.map((item, i) => ({ item, i, s: q ? score(q, item) : 1 }))
  return indexed
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] || a.i - b.i)
    .map(x => x.item)
}

/**
 * Cmd+K on Mac; Ctrl+K elsewhere. Ctrl+K is readline's kill-line, so on Mac it is
 * never ours, and elsewhere it stays with the terminal (.xterm).
 */
export function shouldOpenPalette(
  e: { key: string; metaKey: boolean; ctrlKey: boolean },
  target: { closest?: (sel: string) => unknown } | null,
  isMac = false,
): boolean {
  if (e.key.toLowerCase() !== 'k') return false
  if (isMac ? !e.metaKey : !e.ctrlKey) return false
  if (target?.closest?.('[data-agent-search]')) return false
  if (!isMac && target?.closest?.('.xterm')) return false
  return true
}
