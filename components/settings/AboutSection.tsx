'use client'

import { ExternalLink } from 'lucide-react'
import { Card, Row, GroupLabel } from '@/components/shell/ui'
import { VersionChecker } from '@/components/VersionChecker'
import { useEffect, useState } from 'react'

export default function AboutSection() {
  const [systemInfo, setSystemInfo] = useState<{
    version?: string
    platform?: string
    nodeVersion?: string
    port?: string
  }>({})

  useEffect(() => {
    // Fetch system info from API
    const fetchInfo = async () => {
      try {
        const response = await fetch('/api/config')
        if (response.ok) {
          const data = await response.json()
          setSystemInfo(data)
        }
      } catch (error) {
        console.error('Failed to fetch system info:', error)
      }
    }
    fetchInfo()
  }, [])

  const team = [
    {
      name: 'Juan Peláez',
      role: 'Creator & Concept',
      twitter: 'jkpelaez',
      company: '23blocks',
      companyUrl: 'https://23blocks.com',
    },
  ]

  const technologies = [
    { name: 'Next.js 14', description: 'React framework with App Router' },
    { name: 'React 18', description: 'UI component library' },
    { name: 'TypeScript', description: 'Type-safe development' },
    { name: 'xterm.js', description: 'Terminal emulation in browser' },
    { name: 'node-pty', description: 'Pseudo-terminal bindings' },
    { name: 'WebSocket', description: 'Real-time bidirectional comms' },
    { name: 'tmux', description: 'Terminal session multiplexer' },
    { name: 'CozoDB', description: 'Embedded graph database for agent memory' },
    { name: 'Tailwind CSS', description: 'Utility-first styling' },
    { name: 'Lucide React', description: 'Icon system' },
    { name: 'PM2', description: 'Process manager for production' },
    { name: 'Stack Sans Text', description: 'Primary typeface' },
  ]

  const linkRow = (href: string, title: string, description: string) => (
    <a key={href} href={href} target="_blank" rel="noopener noreferrer"
      className="block hover:bg-raised/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
      <Row title={title} description={description} control={<ExternalLink strokeWidth={1.5} className="w-4 h-4 text-ink-muted" />} />
    </a>
  )
  const mono = (v: string) => <span className="font-mono text-[13px] text-ink-muted">{v}</span>

  return (
    <>
      <GroupLabel>AI Maestro</GroupLabel>
      <Card>
        <Row title="Version" description="A browser-based dashboard for managing AI coding agents."
          control={<span className="flex items-center gap-3 text-[13px] text-ink-muted"><VersionChecker />{mono(systemInfo.version || '…')}</span>} />
        <Row title="License" description="Open source software." control={<span className="text-[14px] text-ink-muted">MIT · © 2025 23blocks</span>} />
      </Card>

      <GroupLabel>System</GroupLabel>
      <Card>
        <Row title="Platform" control={mono(systemInfo.platform || 'unknown')} />
        <Row title="Node.js" control={mono(systemInfo.nodeVersion || 'unknown')} />
        <Row title="Port" control={mono(systemInfo.port || '23000')} />
      </Card>

      <GroupLabel>Made by</GroupLabel>
      <Card>
        {team.map(member => (
          <Row key={member.name} title={member.name} description={`${member.role} · Made with love in Boulder, Colorado`}
            control={
              <span className="flex items-center gap-4 text-[14px]">
                <a href={`https://x.com/${member.twitter}`} target="_blank" rel="noopener noreferrer" className="text-ink-muted hover:text-ink">@{member.twitter}</a>
                <a href={member.companyUrl} target="_blank" rel="noopener noreferrer" className="text-ink-muted hover:text-ink">{member.company}</a>
              </span>
            } />
        ))}
        <Row title="Coded by Claude" description="Built collaboratively with Claude Code (Anthropic)." />
      </Card>

      <GroupLabel>Built with</GroupLabel>
      <Card>
        {technologies.map(t => <Row key={t.name} title={t.name} description={t.description} />)}
      </Card>

      <GroupLabel>Links</GroupLabel>
      <Card>
        {linkRow('https://github.com/23blocks-OS/ai-maestro', 'GitHub', 'Source code, issues and releases')}
        {linkRow('https://x.com/jkpelaez', 'X / Twitter', '@jkpelaez')}
        {linkRow('https://23blocks.com', '23blocks', 'The company behind AI Maestro')}
      </Card>
    </>
  )
}
