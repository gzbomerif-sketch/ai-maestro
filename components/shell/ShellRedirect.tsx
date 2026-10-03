'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { readPref, SHELL_KEY } from '@/lib/safe-storage'
import { redirectTarget } from '@/lib/team-panels'

/** In the command-center layout, old full-screen Teams/Meeting pages forward into the shell. Classic keeps them. */
export default function ShellRedirect({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [legacy, setLegacy] = useState(false)
  useEffect(() => {
    if (readPref(SHELL_KEY, 'command-center', ['command-center', 'classic'] as const) !== 'command-center') { setLegacy(true); return }
    const url = new URL(window.location.href)
    const go = (teamId: string | null) => router.replace(redirectTarget(url.pathname, url.searchParams, teamId))
    const meetingId = url.pathname.startsWith('/team-meeting') ? url.searchParams.get('meeting') : null
    if (meetingId && meetingId !== 'new' && !url.searchParams.get('team')) {
      fetch(`/api/meetings/${encodeURIComponent(meetingId)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => go(d?.meeting?.teamId ?? null))
        .catch(() => go(null))
    } else {
      go(null)
    }
  }, [router])
  return legacy ? <>{children}</> : null
}
