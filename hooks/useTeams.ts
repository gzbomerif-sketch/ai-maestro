'use client'

/** Teams list + active meetings for the shell sidebar and team workspace (polled every 15s). */
import { useCallback, useEffect, useState } from 'react'
import type { Team, Meeting } from '@/types/team'

function usePolled<T>(url: string, pick: (d: any) => T[], intervalMs: number) {
  const [items, setItems] = useState<T[]>([])
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url)
      if (res.ok) setItems(pick(await res.json()))
    } catch { /* keep last known list */ }
  }, [url, pick])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, intervalMs)
    return () => clearInterval(t)
  }, [refresh, intervalMs])
  return { items, refresh }
}

const pickTeams = (d: any): Team[] => d.teams || []
const pickMeetings = (d: any): Meeting[] => d.meetings || []

export function useTeams(intervalMs = 15_000) {
  const { items: teams, refresh } = usePolled<Team>('/api/teams', pickTeams, intervalMs)
  const createTeam = useCallback(async (name: string): Promise<string | null> => {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, agentIds: [] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    await refresh()
    return data.team?.id ?? null
  }, [refresh])
  return { teams, refresh, createTeam }
}

export function useActiveMeetings(intervalMs = 15_000) {
  const { items: meetings, refresh } = usePolled<Meeting>('/api/meetings?status=active', pickMeetings, intervalMs)

  const startMeeting = useCallback(async (team: Team): Promise<boolean> => {
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: team.name, agentIds: team.agentIds, teamId: team.id }),
    })
    if (!res.ok) return false
    // Tell the members; the meeting still starts if this fails
    fetch('/api/teams/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentIds: team.agentIds, teamName: team.name }),
    }).catch(() => {})
    await refresh()
    return true
  }, [refresh])

  const endMeeting = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/meetings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ended', endedAt: new Date().toISOString() }),
    })
    await refresh()
    return res.ok
  }, [refresh])

  return { meetings, refresh, startMeeting, endMeeting }
}
