/**
 * Skill Content Editor
 *
 * Edits the SKILL.md of one custom skill of an agent: read-only name,
 * description, monospace body. Save PATCHes the skill content route; closing
 * with unsaved changes asks for confirmation first.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, Check, Code, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface SkillDraft {
  content: string
  description: string
}

/** Skill names double as directory names, so the API only accepts these characters. */
export function isValidSkillName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name)
}

/** The SKILL.md a freshly created skill starts from. */
export function buildSkillScaffold(name: string, description: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${description}\n\n## Instructions\n\n`
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/

/** The `description:` value from the SKILL.md frontmatter ('' when absent). */
export function parseSkillDescription(content: string): string {
  const fm = FRONTMATTER.exec(content)
  if (!fm) return ''
  const line = /^description:[ \t]*(.*)$/m.exec(fm[1])
  if (!line) return ''
  return line[1].trim().replace(/^(["'])(.*)\1$/, '$2')
}

/** Rewrite the frontmatter `description:` line; content without one is returned unchanged. */
export function setSkillDescription(content: string, description: string): string {
  const fm = FRONTMATTER.exec(content)
  if (!fm || !/^description:/m.test(fm[1])) return content
  const single = description.replace(/\s*[\r\n]+\s*/g, ' ').trim()
  const block = fm[1].replace(/^description:.*$/m, () => `description: ${single}`)
  return content.replace(fm[1], () => block)
}

/** True when the draft differs from what was last loaded or saved. */
export function isSkillDirty(initial: SkillDraft, current: SkillDraft): boolean {
  return initial.content !== current.content || initial.description !== current.description
}

interface SkillContentEditorProps {
  agentId: string
  name: string
  onClose: () => void
  onSaved: () => void
  hostUrl?: string
}

const FIELD =
  'w-full rounded-md border border-control-border bg-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

export default function SkillContentEditor({
  agentId,
  name,
  onClose,
  onSaved,
  hostUrl = '',
}: SkillContentEditorProps) {
  const [initial, setInitial] = useState<SkillDraft | null>(null)
  const [content, setContent] = useState('')
  const [description, setDescription] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const skillUrl = `${hostUrl}/api/agents/${agentId}/skills/custom/${encodeURIComponent(name)}`

  useEffect(() => {
    let cancelled = false
    setInitial(null)
    setLoadError(null)
    fetch(skillUrl)
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to load skill')
        return data as { content: string }
      })
      .then(data => {
        if (cancelled) return
        const draft = { content: data.content, description: parseSkillDescription(data.content) }
        setInitial(draft)
        setContent(draft.content)
        setDescription(draft.description)
      })
      .catch(err => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load skill')
      })
    return () => {
      cancelled = true
    }
  }, [skillUrl])

  const dirty = initial !== null && isSkillDirty(initial, { content, description })

  const requestClose = useCallback(() => {
    if (dirty) setConfirmOpen(true)
    else onClose()
  }, [dirty, onClose])

  const handleSave = async () => {
    if (!initial) return
    setSaving(true)
    setSaveError(null)
    // The description field also owns the frontmatter line, unless the body was hand-edited there
    const nextContent =
      description !== initial.description && parseSkillDescription(content) === initial.description
        ? setSkillDescription(content, description)
        : content
    try {
      const res = await fetch(skillUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: nextContent, description }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save skill')
      }
      setContent(nextContent)
      setInitial({ content: nextContent, description })
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
      onSaved()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save skill')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-hairline bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-hairline flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={requestClose} aria-label="Back to skills">
            <ArrowLeft />
          </Button>
          <Code className="w-4 h-4 text-warn flex-shrink-0" />
          <span className="text-sm font-medium text-ink truncate">Edit skill</span>
        </div>
        <div className="flex items-center gap-2">
          {justSaved && (
            <span className="text-xs text-ok flex items-center gap-1">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
          {dirty && !justSaved && <span className="text-xs text-ink-muted">Unsaved changes</span>}
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving || content.length === 0}>
            {saving && <RefreshCw className="animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {(loadError || saveError) && (
        <div className="px-4 py-2 bg-danger/10 border-b border-danger/20 flex items-center gap-2 text-danger text-xs">
          <AlertCircle className="w-3 h-3" />
          {loadError || saveError}
        </div>
      )}

      {initial === null && !loadError ? (
        <div className="p-6 flex items-center justify-center gap-2 text-ink-muted text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading skill...
        </div>
      ) : initial !== null ? (
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="skill-name" className="text-xs font-medium text-ink-muted">Name</label>
            <input id="skill-name" value={name} readOnly className={`${FIELD} font-mono`} />
          </div>
          <div className="space-y-1">
            <label htmlFor="skill-description" className="text-xs font-medium text-ink-muted">Description</label>
            <input
              id="skill-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What this skill is for"
              className={FIELD}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="skill-content" className="text-xs font-medium text-ink-muted">SKILL.md</label>
            <textarea
              id="skill-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              spellCheck={false}
              className={`${FIELD} font-mono min-h-[50vh] resize-y leading-relaxed`}
            />
          </div>
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your edits to {name} have not been saved and will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep editing</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                onClose()
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
