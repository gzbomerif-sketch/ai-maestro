'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, PictureInPicture2 } from 'lucide-react'
import { currentUrl, normalizeUrl } from '@/lib/browser-nav'
import { useBrowser } from '@/hooks/useBrowser'
import { IconButton } from './ui'

/** Same sandbox for the panel and the mini preview. */
export const BROWSER_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads'

const navBtn = 'grid place-items-center w-[30px] h-[30px] rounded-[8px] text-ink-muted hover:text-ink hover:bg-raised disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'

/** A small browser in the tool panel: URL bar, back/forward/reload, live page. */
export default function BrowserPanel() {
  const { browser, dispatch } = useBrowser()
  const url = currentUrl(browser)
  const [draft, setDraft] = useState(url)
  const [nonce, setNonce] = useState(0)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setDraft(url) }, [url])

  const go = () => {
    const next = normalizeUrl(draft)
    if (!next) { setError('Enter an http:// or https:// address'); return }
    setError(null)
    if (next === url) setNonce(n => n + 1)
    else dispatch({ type: 'navigate', url: next })
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      <div className="h-[44px] flex-none flex items-center gap-1 px-2 border-b border-hairline/70">
        <button type="button" aria-label="Back" title="Back" className={navBtn} disabled={browser.index === 0} onClick={() => dispatch({ type: 'back' })}>
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Forward" title="Forward" className={navBtn} disabled={browser.index >= browser.history.length - 1} onClick={() => dispatch({ type: 'forward' })}>
          <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Reload" title="Reload" className={navBtn} onClick={() => setNonce(n => n + 1)}>
          <RotateCw strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <form className="flex-1 min-w-0 mx-1" onSubmit={e => { e.preventDefault(); go() }}>
          <input value={draft} onChange={e => { setDraft(e.target.value); setError(null) }} aria-label="Address" spellCheck={false}
            onFocus={e => e.currentTarget.select()}
            className={`w-full h-[30px] px-3 rounded-[8px] bg-sunken border text-[13px] font-mono text-ink placeholder:text-gray-500 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${error ? 'border-danger/60' : 'border-control-border'}`} />
        </form>
        <IconButton label="Open in new tab" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
          <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
        </IconButton>
        <IconButton label={browser.mini ? 'Hide mini preview' : 'Show mini preview'} active={browser.mini} onClick={() => dispatch({ type: 'setMini', mini: !browser.mini })}>
          <PictureInPicture2 strokeWidth={1.5} className="w-4 h-4" />
        </IconButton>
      </div>
      {error && <div role="alert" className="px-3 py-1.5 text-[12px] text-danger border-b border-hairline/70">{error}</div>}
      <iframe key={`${url}#${nonce}`} src={url} title="Browser" sandbox={BROWSER_SANDBOX} referrerPolicy="no-referrer"
        className="flex-1 w-full min-h-0 bg-white border-0" />
      <div className="flex-none flex items-center gap-2 px-3 h-[30px] border-t border-hairline/70 text-[12px] text-gray-500">
        Page blank? Some sites block being embedded.
        <button type="button" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} className="text-ink-muted hover:text-ink underline-offset-2 hover:underline">Open in new tab</button>
      </div>
    </div>
  )
}
