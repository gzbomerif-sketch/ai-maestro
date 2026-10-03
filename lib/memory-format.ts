/** Display helpers for the Memory tab. Pure. */

/** 0..1 → "73%"; missing/NaN (no memories yet) → "—" instead of "NaN%". */
export function formatConfidence(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—'
}
