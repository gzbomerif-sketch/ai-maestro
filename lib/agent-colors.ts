/**
 * Hash-assigned identity colours, shared by the category sidebar and avatars.
 *
 * Values live in app/globals.css as CSS variables (--cat-N-*) — one source of
 * truth — so a palette change is a stylesheet edit, not a sweep through
 * component code.
 */
import { computeHash } from '@/lib/hash-utils'

export const CATEGORY_COUNT = 8

export interface HashColor {
  primary: string
  bg: string
  border: string
  icon: string
  hover: string
  active: string
  activeText: string
}

export const COLOR_PALETTE: HashColor[] = Array.from({ length: CATEGORY_COUNT }, (_, i) => ({
  primary: `rgb(var(--cat-${i}-primary))`,
  bg: `rgb(var(--cat-${i}-primary) / 0.05)`,
  border: `rgb(var(--cat-${i}-primary))`,
  icon: `rgb(var(--cat-${i}-icon))`,
  hover: `rgb(var(--cat-${i}-primary) / 0.1)`,
  active: `rgb(var(--cat-${i}-primary) / 0.15)`,
  activeText: `rgb(var(--cat-${i}-text))`,
}))

/** Stable palette entry for any string (category name, agent id, ...). */
export function hashColor(key: string): HashColor {
  return COLOR_PALETTE[Math.abs(computeHash(key)) % COLOR_PALETTE.length]
}
