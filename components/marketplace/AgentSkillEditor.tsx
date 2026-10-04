/**
 * Agent Skill Editor Component
 *
 * Manages the skills attached to an agent.
 * Shows current skills and allows adding/removing from marketplace,
 * creating custom skills and editing their SKILL.md.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Zap,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Check,
  Package,
  Code,
  ChevronDown,
  ChevronRight,
  Brain,
  Pencil,
  X
} from 'lucide-react'
import type { MarketplaceSkill, AgentSkillsConfig } from '@/types/marketplace'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import SkillBrowser from './SkillBrowser'
import SkillDetailModal from './SkillDetailModal'
import SkillContentEditor, { buildSkillScaffold, isValidSkillName } from './SkillContentEditor'

interface AgentSkillEditorProps {
  agentId: string
  hostUrl?: string
  onSkillsChange?: () => void
}

// Default AI Maestro skills
const AI_MAESTRO_SKILLS = [
  { id: 'memory-search', name: 'Memory Search', description: 'Search conversation history for context' },
  { id: 'graph-query', name: 'Graph Query', description: 'Query code relationships and dependencies' },
  { id: 'planning', name: 'Planning', description: 'Create and manage task plans' },
  { id: 'agent-messaging', name: 'Agent Messaging', description: 'Send messages between agents' },
  { id: 'docs-search', name: 'Docs Search', description: 'Search auto-generated documentation' }
]

export default function AgentSkillEditor({
  agentId,
  hostUrl = '',
  onSkillsChange
}: AgentSkillEditorProps) {
  // State
  const [skills, setSkills] = useState<AgentSkillsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // UI State
  const [showBrowser, setShowBrowser] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<MarketplaceSkill | null>(null)
  const [editingSkill, setEditingSkill] = useState<string | null>(null)
  const [showNewSkill, setShowNewSkill] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newSkillError, setNewSkillError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    marketplace: true,
    aiMaestro: true,
    custom: true
  })

  // Load skills
  const loadSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${hostUrl}/api/agents/${agentId}/skills`)
      if (!res.ok) {
        if (res.status === 404) {
          // No skills configured yet, use defaults
          setSkills({
            marketplace: [],
            aiMaestro: { enabled: true, skills: AI_MAESTRO_SKILLS.map(s => s.id) },
            custom: []
          })
          return
        }
        throw new Error('Failed to load skills')
      }
      const data = await res.json()
      // API returns skills config directly, or wrapped in { skills: ... }
      setSkills(data.skills || data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills')
    } finally {
      setLoading(false)
    }
  }, [agentId, hostUrl])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // Add marketplace skill
  const handleAddSkill = async (skill: MarketplaceSkill) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${hostUrl}/api/agents/${agentId}/skills`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add: [skill.id]
        })
      })
      if (!res.ok) throw new Error('Failed to add skill')

      await loadSkills()
      onSkillsChange?.()
      setSaveSuccess(true)
      setShowBrowser(false) // Close the modal after successful add
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skill')
    } finally {
      setSaving(false)
    }
  }

  // Remove marketplace skill
  const handleRemoveSkill = async (skillId: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${hostUrl}/api/agents/${agentId}/skills?skill=${encodeURIComponent(skillId)}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to remove skill')

      await loadSkills()
      onSkillsChange?.()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove skill')
    } finally {
      setSaving(false)
    }
  }

  // Toggle AI Maestro skill
  const handleToggleAiMaestroSkill = async (skillId: string, enabled: boolean) => {
    if (!skills) return

    const currentSkills = skills.aiMaestro.skills
    const newSkills = enabled
      ? [...currentSkills, skillId]
      : currentSkills.filter(s => s !== skillId)

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${hostUrl}/api/agents/${agentId}/skills`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiMaestro: {
            enabled: skills.aiMaestro.enabled,
            skills: newSkills
          }
        })
      })
      if (!res.ok) throw new Error('Failed to update AI Maestro skills')

      await loadSkills()
      onSkillsChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skill')
    } finally {
      setSaving(false)
    }
  }

  // Toggle all AI Maestro skills
  const handleToggleAllAiMaestro = async (enabled: boolean) => {
    if (!skills) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${hostUrl}/api/agents/${agentId}/skills`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiMaestro: {
            enabled,
            skills: enabled ? AI_MAESTRO_SKILLS.map(s => s.id) : []
          }
        })
      })
      if (!res.ok) throw new Error('Failed to update AI Maestro skills')

      await loadSkills()
      onSkillsChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skills')
    } finally {
      setSaving(false)
    }
  }

  // Create a custom skill from the scaffold, then open it for editing
  const handleCreateSkill = async () => {
    const name = newName.trim()
    const description = newDescription.trim()
    if (!isValidSkillName(name)) {
      setNewSkillError('Name may only contain letters, numbers, dashes and underscores')
      return
    }
    if (!description) {
      setNewSkillError('Description is required')
      return
    }
    if (skills?.custom.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      setNewSkillError(`A custom skill named ${name} already exists`)
      return
    }
    setSaving(true)
    setNewSkillError(null)
    try {
      const res = await fetch(`${hostUrl}/api/agents/${agentId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, content: buildSkillScaffold(name, description) })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create skill')
      }
      await loadSkills()
      onSkillsChange?.()
      setShowNewSkill(false)
      setNewName('')
      setNewDescription('')
      setEditingSkill(name)
    } catch (err) {
      setNewSkillError(err instanceof Error ? err.message : 'Failed to create skill')
    } finally {
      setSaving(false)
    }
  }

  // Toggle section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // The editor owns its own state: keep it ahead of the loading spinner so a
  // reload after Save does not unmount it
  if (editingSkill) {
    return (
      <SkillContentEditor
        agentId={agentId}
        name={editingSkill}
        hostUrl={hostUrl}
        onClose={() => setEditingSkill(null)}
        onSaved={() => {
          loadSkills()
          onSkillsChange?.()
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-lg border border-hairline p-6">
        <div className="flex items-center justify-center gap-2 text-ink-muted">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading skills...
        </div>
      </div>
    )
  }

  const sectionButton = 'flex-1 min-w-0 px-4 py-3 flex items-center gap-2 text-left hover:bg-control-off transition-colors'
  const fieldClass = 'w-full rounded-md border border-control-border bg-sunken px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface rounded-lg border border-hairline overflow-hidden">
        <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-ink">Agent Skills</span>
            {skills && (
              <span className="text-xs text-ink-muted">
                {skills.marketplace.length + (skills.aiMaestro.enabled ? skills.aiMaestro.skills.length : 0) + skills.custom.length} skills
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-ok flex items-center gap-1">
                <Check className="w-3 h-3" />
                Saved
              </span>
            )}
            {saving && (
              <RefreshCw className="w-4 h-4 text-ink-muted animate-spin" />
            )}
            <Button size="sm" onClick={() => setShowBrowser(true)}>
              <Plus />
              Add Skill
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-danger/10 border-b border-danger/20">
            <div className="flex items-center gap-2 text-danger text-xs">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          </div>
        )}

        {/* Skills Lists */}
        <div className="divide-y divide-hairline">
          {/* Marketplace Skills */}
          <div>
            <div className="flex items-center">
              <button onClick={() => toggleSection('marketplace')} className={sectionButton}>
                {expandedSections.marketplace ? (
                  <ChevronDown className="w-4 h-4 text-ink-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                )}
                <Package className="w-4 h-4 text-ink-muted" />
                <span className="text-sm font-medium text-ink">Marketplace Skills</span>
                <span className="text-xs text-ink-muted">
                  ({skills?.marketplace.length || 0})
                </span>
              </button>
            </div>

            {expandedSections.marketplace && (
              <div className="px-4 pb-4">
                {skills?.marketplace.length === 0 ? (
                  <div className="text-xs text-ink-muted pl-6">
                    No marketplace skills installed.{' '}
                    <button
                      onClick={() => setShowBrowser(true)}
                      className="text-accent hover:underline"
                    >
                      Browse skills
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pl-6">
                    {skills?.marketplace.map(skill => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between p-2 bg-raised rounded-md group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Zap className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm text-ink truncate block">
                              {skill.name}
                            </span>
                            <span className="text-xs text-ink-muted truncate block">
                              {skill.plugin} • {skill.marketplace}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveSkill(skill.id)}
                          disabled={saving}
                          className="p-1 text-ink-muted hover:text-danger opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all disabled:opacity-50"
                          title="Remove skill"
                          aria-label={`Remove ${skill.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Maestro Skills */}
          <div>
            <div className="flex items-center pr-4">
              <button onClick={() => toggleSection('aiMaestro')} className={sectionButton}>
                {expandedSections.aiMaestro ? (
                  <ChevronDown className="w-4 h-4 text-ink-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                )}
                <Brain className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-ink">AI Maestro Skills</span>
                <span className="text-xs text-ink-muted">
                  ({skills?.aiMaestro.enabled ? skills.aiMaestro.skills.length : 0} of {AI_MAESTRO_SKILLS.length})
                </span>
              </button>
              <Switch
                checked={skills?.aiMaestro.enabled ?? false}
                onCheckedChange={checked => handleToggleAllAiMaestro(checked)}
                disabled={saving}
                aria-label="Enable AI Maestro skills"
              />
            </div>

            {expandedSections.aiMaestro && skills?.aiMaestro.enabled && (
              <div className="px-4 pb-4">
                <div className="space-y-2 pl-6">
                  {AI_MAESTRO_SKILLS.map(skill => {
                    const isEnabled = skills.aiMaestro.skills.includes(skill.id)
                    return (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between p-2 bg-raised rounded-md"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Zap className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm text-ink truncate block">
                              {skill.name}
                            </span>
                            <span className="text-xs text-ink-muted truncate block">
                              {skill.description}
                            </span>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={checked => handleToggleAiMaestroSkill(skill.id, checked)}
                          disabled={saving}
                          aria-label={`Enable ${skill.name}`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Custom Skills */}
          <div>
            <div className="flex items-center pr-4">
              <button onClick={() => toggleSection('custom')} className={sectionButton}>
                {expandedSections.custom ? (
                  <ChevronDown className="w-4 h-4 text-ink-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                )}
                <Code className="w-4 h-4 text-warn" />
                <span className="text-sm font-medium text-ink">Custom Skills</span>
                <span className="text-xs text-ink-muted">
                  ({skills?.custom.length || 0})
                </span>
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpandedSections(prev => ({ ...prev, custom: true }))
                  setShowNewSkill(v => !v)
                  setNewSkillError(null)
                }}
              >
                <Plus />
                New skill
              </Button>
            </div>

            {expandedSections.custom && (
              <div className="px-4 pb-4 space-y-3">
                {showNewSkill && (
                  <form
                    className="ml-6 p-3 space-y-2 bg-raised rounded-md border border-hairline"
                    onSubmit={e => {
                      e.preventDefault()
                      handleCreateSkill()
                    }}
                  >
                    <div className="space-y-1">
                      <label htmlFor="new-skill-name" className="text-xs font-medium text-ink-muted">Name</label>
                      <input
                        id="new-skill-name"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="code-review"
                        autoFocus
                        className={`${fieldClass} font-mono`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="new-skill-description" className="text-xs font-medium text-ink-muted">Description</label>
                      <input
                        id="new-skill-description"
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                        placeholder="What this skill is for"
                        className={fieldClass}
                      />
                    </div>
                    {newSkillError && (
                      <div className="flex items-center gap-2 text-danger text-xs">
                        <AlertCircle className="w-3 h-3" />
                        {newSkillError}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewSkill(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={saving || !newName.trim() || !newDescription.trim()}>
                        Create
                      </Button>
                    </div>
                  </form>
                )}

                {skills?.custom.length === 0 ? (
                  !showNewSkill && (
                    <div className="text-xs text-ink-muted pl-6">
                      No custom skills yet. Use New skill to create one.
                    </div>
                  )
                ) : (
                  <div className="space-y-2 pl-6">
                    {skills?.custom.map(skill => (
                      <div
                        key={skill.name}
                        className="flex items-center justify-between p-2 bg-raised rounded-md group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Code className="w-3.5 h-3.5 text-warn flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm text-ink truncate block">
                              {skill.name}
                            </span>
                            <span className="text-xs text-ink-muted truncate block">
                              {skill.path}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingSkill(skill.name)}
                            disabled={saving}
                            className="p-1 text-ink-muted hover:text-ink opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all disabled:opacity-50"
                            title="Edit skill"
                            aria-label={`Edit ${skill.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveSkill(`custom:${skill.name}`)}
                            disabled={saving}
                            className="p-1 text-ink-muted hover:text-danger opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all disabled:opacity-50"
                            title="Remove skill"
                            aria-label={`Remove ${skill.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill Browser Modal - Use portal to escape transform stacking context */}
      {showBrowser && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowBrowser(false)}
          />
          <div className="relative w-full max-w-5xl max-h-[85vh] bg-surface rounded-xl border border-hairline shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-hairline flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-ink">Add Skills</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBrowser(false)} aria-label="Close">
                <X />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <SkillBrowser
                agentId={agentId}
                installedSkills={skills?.marketplace || []}
                onSkillInstall={async (skill) => {
                  await handleAddSkill(skill)
                }}
                onSkillsChange={() => {
                  loadSkills()
                  onSkillsChange?.()
                }}
                hostUrl={hostUrl}
                mode="select"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-hairline bg-surface flex justify-end flex-shrink-0">
              <Button variant="ghost" onClick={() => setShowBrowser(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Skill Detail Modal */}
      <SkillDetailModal
        skill={selectedSkill}
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onInstall={handleAddSkill}
        isInstalled={selectedSkill ? (skills?.marketplace.some(s => s.id === selectedSkill.id) ?? false) : false}
        hostUrl={hostUrl}
      />
    </div>
  )
}
