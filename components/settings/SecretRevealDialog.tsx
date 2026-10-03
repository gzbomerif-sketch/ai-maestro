'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { Dialog, Button, IconButton, Notice } from '@/components/shell/ui'

interface SecretRevealDialogProps {
  isOpen: boolean
  secret: string
  onClose: () => void
}

/** Shows a new webhook's signing secret once, with reveal and copy. */
export default function SecretRevealDialog({ isOpen, secret, onClose }: SecretRevealDialogProps) {
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowSecret(false)
      setCopied(false)
    }
  }, [isOpen])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text so the user can copy it by hand
      const el = document.querySelector('[data-secret-text]') as HTMLElement | null
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} title="Webhook created" footer={<Button variant="accent" onClick={onClose}>Done</Button>}>
      <div className="space-y-4">
        <Notice tone="error">Copy your secret now. It won&apos;t be shown again.</Notice>
        <div>
          <div className="text-[14px] text-ink-muted mb-2">Signing secret</div>
          <div className="flex items-center gap-2">
            <code data-secret-text
              className="flex-1 min-w-0 px-3 h-[34px] leading-[34px] bg-sunken border border-control-border rounded-[10px] font-mono text-[13px] text-ink select-all overflow-x-auto whitespace-nowrap">
              {showSecret ? secret : '•'.repeat(Math.min(secret.length, 40))}
            </code>
            <IconButton label={showSecret ? 'Hide secret' : 'Show secret'} onClick={() => setShowSecret(v => !v)}>
              {showSecret ? <EyeOff strokeWidth={1.5} className="w-4 h-4" /> : <Eye strokeWidth={1.5} className="w-4 h-4" />}
            </IconButton>
            <IconButton label="Copy to clipboard" onClick={handleCopy}>
              {copied ? <Check strokeWidth={1.5} className="w-4 h-4 text-ok" /> : <Copy strokeWidth={1.5} className="w-4 h-4" />}
            </IconButton>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
