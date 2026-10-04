/**
 * Skill Content Editor
 *
 * Edits the SKILL.md of one custom skill of an agent: read-only name,
 * description, monospace body. Save PATCHes the skill content route; closing
 * with unsaved changes asks for confirmation first, and unsaved edits survive an
 * unmount (window close, agent switch) in a module-level draft cache.
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

const YAML_RESERVED = /^(true|false|yes|no|on|off|null|~|[-+]?[\d.][\d._eE+-]*)$/i

/** A YAML scalar for `value`: plain when that is safe, single-quoted (quotes doubled) otherwise. */
export function yamlScalar(value: string): string {
  const v = value.replace(/\s*[\r\n]+\s*/g, ' ').trim()
  const needsQuote =
    v === '' ||
    /^[-?:,\[\]{}#&*!|>'"%@`]/.test(v) ||
    /: |:$| #/.test(v) ||
    YAML_RESERVED.test(v)
  return needsQuote ? `'${v.replace(/'/g, "''")}'` : v
}

/** The SKILL.md a freshly created skill starts from. */
export function buildSkillScaffold(name: string, description: string): string {
  return `---\nname: ${name}\ndescription: ${yamlScalar(description)}\n---\n\n${description}\n\n## Instructions\n\n`
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/

interface DescriptionEntry {
  start: number
  end: number
  value: string
}

/** Locate the frontmatter `description:` entry: its first line, one past its last continuation line, decoded value. */
function findDescription(lines: string[]): DescriptionEntry | null {
  const start = lines.findIndex(l => /^description:/.test(l))
  if (start === -1) return null
  let end = start + 1
  for (let j = start + 1; j < lines.length; j++) {
    if (/^[ \t]+\S/.test(lines[j])) end = j + 1
    else if (lines[j].trim() !== '') break
  }
  const first = lines[start].replace(/^description:[ \t]*/, '').trim()
  const cont = lines.slice(start + 1, end).map(l => l.trim())
  let value: string
  if (/^[>|][+-]?\d*$/.test(first)) {
    value = cont.join(' ')
  } else {
    const raw = [first, ...cont].join(' ').trim()
    const single = /^'([\s\S]*)'$/.exec(raw)
    const double = /^"([\s\S]*)"$/.exec(raw)
    if (single) value = single[1].replace(/''/g, "'")
    else if (double) value = double[1].replace(/\\(["\\])/g, '$1')
    else value = raw.replace(/\s+#.*$/, '')
  }
  return { start, end, value: value.replace(/\s+/g, ' ').trim() }
}

/** The `description:` value from the SKILL.md frontmatter, decoded ('' when absent). */
export function parseSkillDescription(content: string): string {
  const fm = FRONTMATTER.exec(content)
  if (!fm) return ''
  return findDescription(fm[1].split(/\r?\n/))?.value ?? ''
}

/**
 * Write `description` into the frontmatter: replaces the existing entry (block
 * scalars and continuation lines included), or inserts one after `name:` (else
 * at the end) when missing. Content without frontmatter is returned unchanged.
 */
export function setSkillDescription(content: string, description: string): string {
  const fm = FRONTMATTER.exec(content)
  if (!fm) return content
  const eol = fm[0].includes('\r\n') ? '\r\n' : '\n'
  const lines = fm[1].split(/\r?\n/)
  const line = `description: ${yamlScalar(description)}`
  const existing = findDescription(lines)
  if (existing) {
    lines.splice(existing.start, existing.end - existing.start, line)
  } else {
    const nameAt = lines.findIndex(l => /^name:/.test(l))
    let at = lines.length
    if (nameAt !== -1) {
      at = nameAt + 1
      while (at < lines.length && /^[ \t]+\S/.test(lines[at])) at++
    }
    lines.splice(at, 0, line)
  }
  return content.replace(fm[1], () => lines.join(eol))
}

/** True when the draft differs from what was last loaded or saved. */
export function isSkillDirty(initial: SkillDraft, current: SkillDraft): boolean {
  return initial.content !== current.content || initial.description !== current.description
}

/**
 * Unsaved edits outlive the editor: closing the Skills window or switching agents unmounts it, and the
 * draft comes back on the next open of the same skill. Cleared on a successful save or an explicit Discard.
 */
type CachedSkillDraft = SkillDraft & { dirty: true }
const skillDrafts = new Map<string, CachedSkillDraft>()

export function skillDraftKey(agentId: string, name: string): string {
  return `${agentId}:${name}`
}

export function readSkillDraft(key: string): CachedSkillDraft | undefined {
  return skillDrafts.get(key)
}

/** Keep `current` while it differs from what was loaded; a draft back at the loaded text is dropped. */
export function rememberSkillDraft(key: string, loaded: SkillDraft, current: SkillDraft): void {
  if (isSkillDirty(loaded, current)) skillDrafts.set(key, { ...current, dirty: true })
  else skillDrafts.delete(key)
}

export function clearSkillDraft(key: string): void {
  skillDrafts.delete(key)
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
  const draftKey = skillDraftKey(agentId, name)

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
        // Unsaved edits from an earlier open of this skill win over the loaded text (still dirty against it)
        const cached = readSkillDraft(draftKey)
        setInitial(draft)
        setContent(cached?.content ?? draft.content)
        setDescription(cached?.description ?? draft.description)
      })
      .catch(err => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load skill')
      })
    return () => {
      cancelled = true
    }
  }, [skillUrl, draftKey])

  const dirty = initial !== null && isSkillDirty(initial, { content, description })

  // Mirror the draft into the cache as it changes, so an unmount (window closed, agent switched) keeps it
  useEffect(() => {
    if (initial) rememberSkillDraft(draftKey, initial, { content, description })
  }, [draftKey, initial, content, description])

  // A reload or tab close with unsaved edits asks first (the in-memory cache would not survive it)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const requestClose = useCallback(() => {
    if (dirty) setConfirmOpen(true)
    else onClose()
  }, [dirty, onClose])

  const handleSave = async () => {
    if (!initial) return
    setSaving(true)
    setSaveError(null)
    // The description field also owns the frontmatter line, unless the body was hand-edited there
    const descriptionChanged = description !== initial.description
    const nextContent =
      descriptionChanged && parseSkillDescription(content) === initial.description
        ? setSkillDescription(content, description)
        : content
    try {
      const res = await fetch(skillUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // description only when edited, so a body-only save never touches the registry description
        body: JSON.stringify({ content: nextContent, ...(descriptionChanged ? { description } : {}) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save skill')
      }
      clearSkillDraft(draftKey)
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
                clearSkillDraft(draftKey)
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
