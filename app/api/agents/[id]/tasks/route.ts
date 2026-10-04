/**
 * Agent Tasks API
 *
 * GET  /api/agents/:id/tasks — List personal tasks + team tasks assigned to the agent
 * POST /api/agents/:id/tasks — Create a personal task
 *
 * Thin wrapper — business logic in services/agents-tasks-service.ts
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { listAgentTasks, createTask } from '@/services/agents-tasks-service'
import { toResponse } from '@/app/api/_helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    return toResponse(listAgentTasks(id))
  } catch (error) {
    console.error('Error listing agent tasks:', error)
    return NextResponse.json(
      { error: 'Failed to list agent tasks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    return toResponse(createTask(id, body))
  } catch (error) {
    console.error('Error creating agent task:', error)
    return NextResponse.json(
      { error: 'Failed to create agent task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
