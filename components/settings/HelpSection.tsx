'use client'

import { ExternalLink, Terminal, Server, MessageSquare, FileText, GitBranch, Search } from 'lucide-react'
import { Card, Row, GroupLabel } from '@/components/shell/ui'

export default function HelpSection() {
  const guides = [
    {
      icon: Terminal,
      title: 'Getting Started',
      description: 'Learn how to create and manage AI agents with tmux sessions',
      topics: [
        'Creating your first agent',
        'Navigating the dashboard',
        'Understanding agent hierarchy',
        'Working with terminal sessions',
      ],
    },
    {
      icon: Server,
      title: 'Remote Hosts (Peer Mesh)',
      description: 'Configure AI Maestro to manage sessions across multiple machines',
      topics: [
        'What is the peer mesh network?',
        'Adding a remote host',
        'Testing host connectivity',
        'Creating sessions on remote hosts',
        'Network requirements (Tailscale, local network)',
      ],
    },
    {
      icon: MessageSquare,
      title: 'Inter-Agent Messaging',
      description: 'Enable agents to communicate asynchronously',
      topics: [
        'Sending messages between agents',
        'Reading and replying to messages',
        'Message priorities and status',
        'Using the messaging CLI scripts',
      ],
    },
    {
      icon: GitBranch,
      title: 'Code Graph Query',
      description: 'Query code relationships and understand your codebase structure',
      topics: [
        'Understanding code dependencies',
        'Finding function callers and callees',
        'Exploring module relationships',
        'Querying the code graph database',
      ],
    },
    {
      icon: Search,
      title: 'Documents Search',
      description: 'Search and retrieve information from auto-generated documentation',
      topics: [
        'Searching function signatures',
        'Finding API documentation',
        'Querying class definitions',
        'Semantic search across docs',
      ],
    },
    {
      icon: FileText,
      title: 'Agent Notes & Logging',
      description: 'Document your work and track agent activity',
      topics: [
        'Adding notes to agents',
        'Viewing agent logs',
        'Exporting terminal history',
        'Organizing agent workspaces',
      ],
    },
  ]

  const links = [
    {
      label: 'GitHub Repository',
      url: 'https://github.com/23blocks-OS/ai-maestro',
      description: 'View source code and contribute',
    },
    {
      label: 'Report an Issue',
      url: 'https://github.com/23blocks-OS/ai-maestro/issues',
      description: 'Found a bug? Let us know',
    },
    {
      label: 'Documentation',
      url: 'https://github.com/23blocks-OS/ai-maestro/blob/main/README.md',
      description: 'Full project documentation',
    },
  ]

  const tips: [string, string][] = [
    ['Keyboard shortcuts', 'Use Shift+PageUp/Down to scroll in the terminal.'],
    ['Naming convention', 'Use level1-level2-name (e.g. apps-notify-batman) for automatic grouping.'],
    ['Agent notes', 'Use the notes section below the terminal to document your work.'],
    ['Remote hosts', 'Use Tailscale for secure remote access to peers across the internet.'],
  ]

  return (
    <>
      <GroupLabel>Guides</GroupLabel>
      <Card>
        {guides.map(guide => {
          const Icon = guide.icon
          return (
            <Row key={guide.title} wrap
              title={<span className="flex items-center gap-2.5"><Icon strokeWidth={1.5} className="w-4 h-4 text-ink-muted" />{guide.title}</span>}
              description={<>{guide.description}<span className="block mt-1 text-gray-500">{guide.topics.join(' · ')}</span></>} />
          )
        })}
      </Card>

      <GroupLabel>Resources</GroupLabel>
      <Card>
        {links.map(link => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
            className="block hover:bg-raised/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
            <Row title={link.label} description={link.description}
              control={<ExternalLink strokeWidth={1.5} className="w-4 h-4 text-ink-muted" />} />
          </a>
        ))}
      </Card>

      <GroupLabel>Quick tips</GroupLabel>
      <Card>
        {tips.map(([title, text]) => <Row key={title} wrap title={title} description={text} />)}
      </Card>
    </>
  )
}
