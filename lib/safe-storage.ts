/**
 * localStorage that never throws: private mode, blocked storage and SSR all fall
 * back to defaults. Used by the command-center shell for its UI preferences.
 */
export const SHELL_KEY = 'aimaestro-shell'
export const INBOX_KEY = 'aimaestro-inbox-collapsed'
export const SIDEBAR_MODE_KEY = 'aimaestro-sidebar-mode'

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = storage()?.getItem(key)
    return v !== null && v !== undefined && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

export function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = storage()?.getItem(key)
    if (v === null || v === undefined) return fallback
    return v === 'true'
  } catch {
    return fallback
  }
}

export function readString(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function readNumber(key: string, fallback: number): number {
  const n = Number.parseInt(readString(key) ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

export function writePref(key: string, value: string): void {
  try {
    storage()?.setItem(key, value)
  } catch {
    /* storage unavailable: preference just won't persist */
  }
}

export function removePref(key: string): void {
  try {
    storage()?.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}
