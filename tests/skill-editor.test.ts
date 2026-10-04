import { describe, it, expect } from 'vitest'
import {
  buildSkillScaffold,
  isSkillDirty,
  isValidSkillName,
  parseSkillDescription,
  setSkillDescription,
} from '@/components/marketplace/SkillContentEditor'

describe('buildSkillScaffold', () => {
  it('produces exactly the template', () => {
    expect(buildSkillScaffold('code-review', 'Reviews diffs')).toBe(
      '---\nname: code-review\ndescription: Reviews diffs\n---\n\nReviews diffs\n\n## Instructions\n\n'
    )
  })

  it('round-trips the description through the frontmatter parser', () => {
    expect(parseSkillDescription(buildSkillScaffold('a', 'Does a thing'))).toBe('Does a thing')
  })
})

describe('isValidSkillName', () => {
  it('accepts letters, digits, dash and underscore', () => {
    expect(isValidSkillName('my_skill-2')).toBe(true)
  })
  it('rejects empty, spaces, dots and slashes', () => {
    for (const bad of ['', 'my skill', 'a.b', '../x', 'a/b']) expect(isValidSkillName(bad)).toBe(false)
  })
})

describe('parseSkillDescription', () => {
  it('returns empty without frontmatter or description', () => {
    expect(parseSkillDescription('# Just a body')).toBe('')
    expect(parseSkillDescription('---\nname: x\n---\nbody')).toBe('')
  })
  it('strips surrounding quotes', () => {
    expect(parseSkillDescription('---\nname: x\ndescription: "Quoted: yes"\n---\n')).toBe('Quoted: yes')
  })
  it('ignores description lines in the body', () => {
    expect(parseSkillDescription('---\nname: x\n---\ndescription: not me')).toBe('')
  })
})

describe('setSkillDescription', () => {
  it('replaces only the frontmatter description line', () => {
    const src = '---\nname: x\ndescription: old\n---\n\ndescription: old\n'
    expect(setSkillDescription(src, 'new')).toBe('---\nname: x\ndescription: new\n---\n\ndescription: old\n')
  })
  it('leaves content without a frontmatter description unchanged', () => {
    expect(setSkillDescription('body only', 'new')).toBe('body only')
    expect(setSkillDescription('---\nname: x\n---\nbody', 'new')).toBe('---\nname: x\n---\nbody')
  })
  it('keeps the value on one line', () => {
    expect(setSkillDescription('---\ndescription: a\n---\n', 'b\nc')).toBe('---\ndescription: b c\n---\n')
  })
})

describe('isSkillDirty', () => {
  const base = { content: 'abc', description: 'd' }
  it('is clean when nothing changed', () => {
    expect(isSkillDirty(base, { ...base })).toBe(false)
  })
  it('is dirty when content or description changed', () => {
    expect(isSkillDirty(base, { ...base, content: 'abcd' })).toBe(true)
    expect(isSkillDirty(base, { ...base, description: 'e' })).toBe(true)
  })
})
