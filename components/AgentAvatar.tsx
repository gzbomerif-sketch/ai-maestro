'use client'

import { useState } from 'react'
import type { Agent } from '@/types/agent'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import type { AgentPresence } from '@/lib/agent-presence'
import { isHibernated, type ShellStatus } from '@/lib/agent-status'
import { hashColor } from '@/lib/agent-colors'
import { resolveAvatar, type AvatarSubject } from '@/lib/avatar-resolve'
import { StatusDot } from '@/components/shell/ui'

export { resolveAvatar } from '@/lib/avatar-resolve'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

const PX: Record<AvatarSize, number> = { xs: 20, sm: 28, md: 40, lg: 64 }

export type AgentAvatarSubject = Agent | (AvatarSubject & { id: string })

export interface AgentAvatarProps {
  agent: AgentAvatarSubject | null
  size?: AvatarSize
  /** Status dot from presenceOf(agent). Only honoured when a full Agent is given. */
  showStatus?: boolean
  className?: string
}

function isFullAgent(agent: AgentAvatarSubject | null): agent is Agent {
  return !!agent && Array.isArray((agent as Agent).sessions)
}

/** presenceOf's vocabulary → the shell's status-dot vocabulary (one mapping, incl. the asleep case). */
export function shellStatusFor(agent: Agent, presence: AgentPresence): ShellStatus {
  if (presence === 'ready') return 'idle'
  if (presence === 'offline') return isHibernated(agent) ? 'asleep' : 'offline'
  return presence
}

/** Subscribes to session activity only when a status dot is actually shown. */
function AvatarStatus({ agent, px }: { agent: Agent; px: number }) {
  const { presenceOf } = useSessionActivity()
  const status = shellStatusFor(agent, presenceOf(agent))
  const offset = Math.max(0, Math.round(px * 0.04))
  return (
    <span
      className="absolute rounded-full bg-surface p-[2px] leading-none"
      style={{ right: -offset, bottom: -offset }}
    >
      <StatusDot status={status} />
    </span>
  )
}

/**
 * One avatar for every surface: portrait image, emoji, or a hash-coloured
 * initial. Resolution is lib/avatar-resolve.ts; this only draws the result.
 */
export function AgentAvatar({ agent, size = 'md', showStatus = false, className = '' }: AgentAvatarProps) {
  const px = PX[size]
  const resolved = resolveAvatar(agent)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  // A portrait that fails to load degrades to the initial rather than a broken icon.
  const view = resolved.kind === 'image' && failedSrc === resolved.src
    ? resolveAvatar({ name: agent?.name, label: agent?.label })
    : resolved

  const color = hashColor(agent?.label || agent?.name || agent?.id || '?')
  const label = agent?.label || agent?.name

  return (
    <span
      className={`relative inline-flex flex-none ${className}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={label ? `${label} avatar` : 'Agent avatar'}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full select-none"
        style={view.kind === 'initial' ? { backgroundColor: color.active, color: color.activeText } : undefined}
      >
        {view.kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.src}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            onError={() => setFailedSrc(view.src)}
          />
        )}
        {view.kind === 'emoji' && (
          <span className="bg-raised flex h-full w-full items-center justify-center" style={{ fontSize: px * 0.55, lineHeight: 1 }}>
            {view.emoji}
          </span>
        )}
        {view.kind === 'initial' && (
          <span className="font-medium" style={{ fontSize: px * 0.45, lineHeight: 1 }}>{view.initial}</span>
        )}
      </span>
      {showStatus && isFullAgent(agent) && <AvatarStatus agent={agent} px={px} />}
    </span>
  )
}

export default AgentAvatar
