/**
 * Agent Custom Skill Content API
 *
 * GET   /api/agents/:id/skills/custom/:name — Read the skill's SKILL.md content
 * PATCH /api/agents/:id/skills/custom/:name — Update content (and optionally description)
 *
 * Thin wrapper — business logic in services/agents-skills-service.ts
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSkillContent, updateSkillContent } from '@/services/agents-skills-service'
import { toResponse } from '@/app/api/_helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  try {
    const { id, name } = await params
    const result = getSkillContent(id, name)
    return toResponse(result)
  } catch (error) {
    console.error('Error reading custom skill content:', error)
    return NextResponse.json(
      { error: 'Failed to read custom skill', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  try {
    const { id, name } = await params
    const body = await request.json()
    const result = updateSkillContent(id, name, body)
    return toResponse(result)
  } catch (error) {
    console.error('Error updating custom skill content:', error)
    return NextResponse.json(
      { error: 'Failed to update custom skill', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
