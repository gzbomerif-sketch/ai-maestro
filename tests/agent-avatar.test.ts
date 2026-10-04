import { describe, it, expect } from 'vitest'
import { resolveAvatar } from '@/lib/avatar-resolve'
import { hashColor, COLOR_PALETTE } from '@/lib/agent-colors'

describe('resolveAvatar', () => {
  it('maps a portrait path to an image', () => {
    expect(resolveAvatar({ avatar: '/avatars/men_05.png', name: 'alice' })).toEqual({ kind: 'image', src: '/avatars/men_05.png' })
  })

  it('passes http(s) URLs through as images', () => {
    expect(resolveAvatar({ avatar: 'https://example.com/a.png' })).toEqual({ kind: 'image', src: 'https://example.com/a.png' })
  })

  it('resolves a bare public/avatars file name to its portrait path', () => {
    expect(resolveAvatar({ avatar: 'women_07.png' })).toEqual({ kind: 'image', src: '/avatars/women_07.png' })
    expect(resolveAvatar({ avatar: 'robots_3' })).toEqual({ kind: 'image', src: '/avatars/robots_03.png' })
  })

  it('maps a single emoji to an emoji', () => {
    expect(resolveAvatar({ avatar: '🤖', name: 'bot' })).toEqual({ kind: 'emoji', emoji: '🤖' })
  })

  it('treats a multi-codepoint single grapheme emoji as an emoji', () => {
    expect(resolveAvatar({ avatar: '👩‍💻' })).toEqual({ kind: 'emoji', emoji: '👩‍💻' })
  })

  it('falls back to the first letter of the name when there is no avatar', () => {
    expect(resolveAvatar({ name: 'maestro' })).toEqual({ kind: 'initial', initial: 'M' })
  })

  it('prefers label over name for the initial', () => {
    expect(resolveAvatar({ name: 'maestro', label: 'Zed' })).toEqual({ kind: 'initial', initial: 'Z' })
  })

  it('does not treat plain text as an emoji', () => {
    expect(resolveAvatar({ avatar: 'hello', name: 'bob' })).toEqual({ kind: 'initial', initial: 'B' })
  })

  it('returns "?" for a null or undefined agent', () => {
    expect(resolveAvatar(null)).toEqual({ kind: 'initial', initial: '?' })
    expect(resolveAvatar(undefined)).toEqual({ kind: 'initial', initial: '?' })
  })

  it('returns "?" when there is no label or name', () => {
    expect(resolveAvatar({})).toEqual({ kind: 'initial', initial: '?' })
  })
})

describe('hashColor', () => {
  it('is deterministic and drawn from the palette', () => {
    expect(hashColor('alpha')).toBe(hashColor('alpha'))
    expect(COLOR_PALETTE).toContain(hashColor('alpha'))
  })
})
