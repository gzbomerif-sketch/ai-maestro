/** Shared types and helpers for Settings → Hosts. */

export interface OrganizationInfo {
  organization: string | null
  setAt: string | null
  setBy: string | null
  isSet: boolean
}

export interface SyncResult {
  localAdd: boolean
  backRegistered: boolean
  peersExchanged: number
  peersShared: number
  errors: string[]
}

export type HealthStatus = 'checking' | 'online' | 'offline'

/** Compare two semver-like version strings: -1 if a < b, 0 if equal, 1 if a > b */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA < numB) return -1
    if (numA > numB) return 1
  }
  return 0
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Unknown'
  const d = new Date(isoString)
  return Number.isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function syncSourceLabel(source: string | undefined): string | null {
  if (!source) return null
  if (source === 'manual') return 'Added manually'
  if (source === 'peer-registration') return 'Auto-registered'
  if (source.startsWith('peer-exchange')) return 'Peer discovery'
  return 'Synced'
}
