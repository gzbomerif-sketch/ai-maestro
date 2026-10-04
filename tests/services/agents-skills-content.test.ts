/**
 * Agents Skills Service — custom skill content read/write
 *
 * Exercises getSkillContent / updateSkillContent against the REAL agent
 * registry on a throwaway HOME (os.homedir() honours $HOME on POSIX), so the
 * round-trip through ~/.aimaestro/agents/<id>/skills/<name>/SKILL.md is proven
 * end to end. The security cases spy on fs and assert that a rejected name
 * never reaches the filesystem at all (not even the registry read).
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { type ServiceError } from '@/services/service-errors'

const { tmpHome, originalHome } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFs = require('fs') as typeof import('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeOs = require('os') as typeof import('os')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodePath = require('path') as typeof import('path')
  const originalHome = process.env.HOME
  const tmpHome = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'skills-content-'))
  process.env.HOME = tmpHome
  return { tmpHome, originalHome }
})

// Heavy collaborators of the service that are irrelevant to content I/O.
vi.mock('@/lib/agent', () => ({ agentRegistry: { getAgent: vi.fn() } }))
vi.mock('@/lib/marketplace-skills', () => ({ getSkillById: vi.fn() }))
vi.mock('@/lib/memory/backlog', () => ({ readBacklog: vi.fn().mockReturnValue([]) }))

import fs from 'fs'
import path from 'path'
import { getSkillContent, updateSkillContent, addSkill } from '@/services/agents-skills-service'

const AGENT_ID = 'agent-skills-1'
const AGENTS_DIR = path.join(tmpHome, '.aimaestro', 'agents')
const REGISTRY_FILE = path.join(AGENTS_DIR, 'registry.json')
const skillFile = (name: string) => path.join(AGENTS_DIR, AGENT_ID, 'skills', name, 'SKILL.md')

function seedRegistry() {
  fs.rmSync(AGENTS_DIR, { recursive: true, force: true })
  fs.mkdirSync(AGENTS_DIR, { recursive: true })
  fs.writeFileSync(
    REGISTRY_FILE,
    JSON.stringify([
      {
        id: AGENT_ID,
        name: 'skills-agent',
        label: 'Skills Agent',
        workingDirectory: tmpHome,
        sessions: [],
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      },
    ]),
    'utf-8'
  )
}

function readRegistryAgent() {
  return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'))[0]
}

function errOf(result: { data?: unknown; status: number }) {
  return result.data as ServiceError
}

beforeAll(() => {
  expect(process.env.HOME).toBe(tmpHome)
})

afterAll(() => {
  process.env.HOME = originalHome
  fs.rmSync(tmpHome, { recursive: true, force: true })
})

beforeEach(() => {
  vi.restoreAllMocks()
  seedRegistry()
})

describe('getSkillContent / updateSkillContent — name validation (security gate)', () => {
  const BAD_NAMES = ['../escape', 'a/b', '', '/etc/passwd', '..', 'a\\b', 'name with space', 'a\0b']

  const fsMethods = [
    'existsSync',
    'readFileSync',
    'writeFileSync',
    'mkdirSync',
    'statSync',
    'readdirSync',
    'rmSync',
    'renameSync',
  ] as const

  function spyOnFs() {
    return fsMethods.map(m => vi.spyOn(fs, m))
  }

  for (const bad of BAD_NAMES) {
    it(`getSkillContent rejects ${JSON.stringify(bad)} with 400 invalid_field and never touches fs`, () => {
      const spies = spyOnFs()
      const result = getSkillContent(AGENT_ID, bad)
      expect(result.status).toBe(400)
      expect(errOf(result).error).toBe('invalid_field')
      for (const spy of spies) expect(spy).not.toHaveBeenCalled()
    })

    it(`updateSkillContent rejects ${JSON.stringify(bad)} with 400 invalid_field and never touches fs`, () => {
      const spies = spyOnFs()
      const result = updateSkillContent(AGENT_ID, bad, { content: 'x' })
      expect(result.status).toBe(400)
      expect(errOf(result).error).toBe('invalid_field')
      for (const spy of spies) expect(spy).not.toHaveBeenCalled()
    })
  }

  it('rejects non-string names without touching fs', () => {
    const spies = spyOnFs()
    // @ts-expect-error — deliberately wrong type, as a malformed route param could be
    expect(getSkillContent(AGENT_ID, undefined).status).toBe(400)
    // @ts-expect-error — deliberately wrong type
    expect(updateSkillContent(AGENT_ID, 42, { content: 'x' }).status).toBe(400)
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('a traversal name writes nothing outside the skills dir', () => {
    const outside = path.join(AGENTS_DIR, AGENT_ID, 'escape', 'SKILL.md')
    updateSkillContent(AGENT_ID, '../escape', { content: 'pwned' })
    expect(fs.existsSync(outside)).toBe(false)
    expect(fs.existsSync(path.join(AGENTS_DIR, AGENT_ID, 'skills', '..', 'escape'))).toBe(false)
  })
})

describe('getSkillContent', () => {
  it('404s for an unknown agent', () => {
    const result = getSkillContent('nope', 'my-skill')
    expect(result.status).toBe(404)
  })

  it('404s for a skill the agent does not have', () => {
    const result = getSkillContent(AGENT_ID, 'missing-skill')
    expect(result.status).toBe(404)
  })

  it('404s when the registry lists the skill but SKILL.md is gone from disk', () => {
    addSkill(AGENT_ID, { name: 'ghost', content: 'boo' })
    fs.rmSync(path.join(AGENTS_DIR, AGENT_ID, 'skills', 'ghost'), { recursive: true })
    expect(getSkillContent(AGENT_ID, 'ghost').status).toBe(404)
  })

  it('does not serve a SKILL.md that exists on disk but is not a registered custom skill', () => {
    fs.mkdirSync(path.dirname(skillFile('unregistered')), { recursive: true })
    fs.writeFileSync(skillFile('unregistered'), 'secret', 'utf-8')
    expect(getSkillContent(AGENT_ID, 'unregistered').status).toBe(404)
  })

  it('returns the content of an added custom skill', () => {
    addSkill(AGENT_ID, { name: 'my-skill', content: '# Hello' })
    const result = getSkillContent(AGENT_ID, 'my-skill')
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ name: 'my-skill', content: '# Hello' })
  })
})

describe('updateSkillContent', () => {
  beforeEach(() => {
    addSkill(AGENT_ID, { name: 'my-skill', content: 'v1', description: 'orig desc' })
  })

  it('404s for an unknown agent', () => {
    expect(updateSkillContent('nope', 'my-skill', { content: 'x' }).status).toBe(404)
  })

  it('404s for an unknown skill and does not create it', () => {
    const result = updateSkillContent(AGENT_ID, 'other', { content: 'x' })
    expect(result.status).toBe(404)
    expect(fs.existsSync(skillFile('other'))).toBe(false)
  })

  it('requires non-empty content', () => {
    for (const content of [undefined, '', 5 as unknown as string]) {
      const result = updateSkillContent(AGENT_ID, 'my-skill', { content })
      expect(result.status).toBe(400)
      expect(errOf(result).error).toBe('missing_field')
    }
    expect(fs.readFileSync(skillFile('my-skill'), 'utf-8')).toBe('v1')
  })

  it('round-trips content: update then get returns the new content', () => {
    const upd = updateSkillContent(AGENT_ID, 'my-skill', { content: '# v2\nbody' })
    expect(upd.status).toBe(200)
    expect(upd.data).toEqual({ success: true })
    expect(fs.readFileSync(skillFile('my-skill'), 'utf-8')).toBe('# v2\nbody')
    expect(getSkillContent(AGENT_ID, 'my-skill').data).toEqual({ name: 'my-skill', content: '# v2\nbody' })
  })

  it('keeps the existing description when none is supplied, and bumps updatedAt', () => {
    const before = readRegistryAgent().skills.custom[0]
    updateSkillContent(AGENT_ID, 'my-skill', { content: 'v2' })
    const after = readRegistryAgent().skills.custom[0]
    expect(after.description).toBe('orig desc')
    expect(after.createdAt).toBe(before.createdAt)
    expect(after.updatedAt >= before.updatedAt).toBe(true)
  })

  it("rewrites the registry entry's description when supplied", () => {
    const upd = updateSkillContent(AGENT_ID, 'my-skill', { content: 'v2', description: 'new desc' })
    expect(upd.status).toBe(200)
    expect(readRegistryAgent().skills.custom[0].description).toBe('new desc')
  })

  it('rejects a non-string description', () => {
    const result = updateSkillContent(AGENT_ID, 'my-skill', { content: 'v2', description: 7 as unknown as string })
    expect(result.status).toBe(400)
    expect(errOf(result).error).toBe('invalid_field')
  })

  it('returns 500 operation_failed when the write fails', () => {
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('disk full')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = updateSkillContent(AGENT_ID, 'my-skill', { content: 'v2' })
    expect(result.status).toBe(500)
  })
})
