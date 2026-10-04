import { describe, it, expect } from 'vitest'
import {
  buildSkillScaffold,
  isSkillDirty,
  isValidSkillName,
  parseSkillDescription,
  setSkillDescription,
  yamlScalar,
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

describe('buildSkillScaffold quoting', () => {
  it('quotes the frontmatter value but not the body line', () => {
    const out = buildSkillScaffold('review', 'Reviews code: fast')
    expect(out).toBe(
      "---\nname: review\ndescription: 'Reviews code: fast'\n---\n\nReviews code: fast\n\n## Instructions\n\n"
    )
    expect(parseSkillDescription(out)).toBe('Reviews code: fast')
  })
})

describe('yamlScalar', () => {
  it('leaves safe values plain', () => {
    expect(yamlScalar('Reviews diffs, quickly')).toBe('Reviews diffs, quickly')
  })
  it('quotes leading indicators and reserved words', () => {
    for (const v of ['"hi"', '[a]', '{a}', '#x', '*x', 'true', 'null', '123', '']) {
      expect(yamlScalar(v).startsWith("'")).toBe(true)
    }
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
  it('leaves content without frontmatter unchanged', () => {
    expect(setSkillDescription('body only', 'new')).toBe('body only')
  })
  it('inserts a missing description after name:', () => {
    expect(setSkillDescription('---\nname: x\nallowed-tools: Read\n---\nbody', 'new')).toBe(
      '---\nname: x\ndescription: new\nallowed-tools: Read\n---\nbody'
    )
  })
  it('inserts a missing description at the end when there is no name:', () => {
    expect(setSkillDescription('---\nfoo: 1\n---\nbody', 'new')).toBe('---\nfoo: 1\ndescription: new\n---\nbody')
  })
  it('replaces a folded block scalar including its continuation lines', () => {
    const src = '---\nname: x\ndescription: >\n  line one\n  line two\nallowed-tools: Read\n---\nbody'
    expect(parseSkillDescription(src)).toBe('line one line two')
    expect(setSkillDescription(src, 'new')).toBe('---\nname: x\ndescription: new\nallowed-tools: Read\n---\nbody')
  })
  it('replaces a multi-line plain scalar', () => {
    const src = '---\ndescription: first\n  second\nname: x\n---\n'
    expect(parseSkillDescription(src)).toBe('first second')
    expect(setSkillDescription(src, 'new')).toBe('---\ndescription: new\nname: x\n---\n')
  })
  it('quotes a value containing colon-space and round-trips it', () => {
    const out = setSkillDescription('---\ndescription: old\n---\n', 'Reviews code: fast')
    expect(out).toBe("---\ndescription: 'Reviews code: fast'\n---\n")
    expect(parseSkillDescription(out)).toBe('Reviews code: fast')
  })
  it('quotes a value containing " #" and round-trips it', () => {
    const out = setSkillDescription('---\ndescription: old\n---\n', 'Use # sparingly')
    expect(out).toBe("---\ndescription: 'Use # sparingly'\n---\n")
    expect(parseSkillDescription(out)).toBe('Use # sparingly')
  })
  it('doubles single quotes inside a quoted value', () => {
    const out = setSkillDescription('---\ndescription: old\n---\n', "[it's] fine")
    expect(out).toBe("---\ndescription: '[it''s] fine'\n---\n")
    expect(parseSkillDescription(out)).toBe("[it's] fine")
  })
  it('is stable for an already quoted value (parse then set is a no-op)', () => {
    const src = "---\nname: x\ndescription: 'Reviews code: fast'\n---\nbody"
    expect(setSkillDescription(src, parseSkillDescription(src))).toBe(src)
    const dq = '---\ndescription: "Quoted: yes"\n---\n'
    expect(parseSkillDescription(dq)).toBe('Quoted: yes')
  })
  it('preserves CRLF line endings', () => {
    expect(setSkillDescription('---\r\nname: x\r\n---\r\nbody', 'new')).toBe('---\r\nname: x\r\ndescription: new\r\n---\r\nbody')
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
