/**
 * Agent Task API
 *
 * PATCH  /api/agents/:id/tasks/:taskId — Update a personal task
 * DELETE /api/agents/:id/tasks/:taskId — Delete a personal task
 *
 * Thin wrapper — business logic in services/agents-tasks-service.ts
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { patchTask, removeTask } from '@/services/agents-tasks-service'
import { toResponse } from '@/app/api/_helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params
    const body = await request.json()
    return toResponse(patchTask(id, taskId, body))
  } catch (error) {
    console.error('Error updating agent task:', error)
    return NextResponse.json(
      { error: 'Failed to update agent task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params
    return toResponse(removeTask(id, taskId))
  } catch (error) {
    console.error('Error deleting agent task:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
