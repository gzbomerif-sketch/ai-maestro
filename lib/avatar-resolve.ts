/**
 * Pure avatar resolution — no React, no DOM — so it runs under the node test
 * environment. The AgentAvatar component renders whatever this returns.
 */

export type ResolvedAvatar =
  | { kind: 'image'; src: string }
  | { kind: 'emoji'; emoji: string }
  | { kind: 'initial'; initial: string }

export interface AvatarSubject {
  avatar?: string
  name?: string
  label?: string
}

/** Entries of public/avatars/: men_NN, women_NN, robots_NN (.png optional). */
const PORTRAIT_FILE = /^(men|women|robots)_(\d{1,3})(?:\.png)?$/

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u

function graphemes(s: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return Array.from(seg.segment(s), part => part.segment)
  }
  return Array.from(s)
}

function isSingleEmoji(s: string): boolean {
  return EMOJI.test(s) && graphemes(s).length === 1
}

export function resolveAvatar(agent: AvatarSubject | null | undefined): ResolvedAvatar {
  const avatar = agent?.avatar?.trim()
  if (avatar) {
    if (avatar.startsWith('/') || /^https?:\/\//i.test(avatar)) return { kind: 'image', src: avatar }
    const portrait = PORTRAIT_FILE.exec(avatar)
    if (portrait) return { kind: 'image', src: `/avatars/${portrait[1]}_${portrait[2].padStart(2, '0')}.png` }
    if (isSingleEmoji(avatar)) return { kind: 'emoji', emoji: avatar }
  }
  const text = (agent?.label || agent?.name || '').trim()
  const first = text ? graphemes(text)[0] : ''
  return { kind: 'initial', initial: first ? first.toLocaleUpperCase() : '?' }
}
