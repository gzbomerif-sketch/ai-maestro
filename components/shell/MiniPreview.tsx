'use client'

import { X } from 'lucide-react'
import { currentUrl } from '@/lib/browser-nav'
import { useBrowser } from '@/hooks/useBrowser'
import { BROWSER_SANDBOX } from './BrowserPanel'

const PAGE_W = 1280
const PAGE_H = 800
const W = 288

/** Floating, scaled-down live view of the Browser page; click to open the panel. */
export default function MiniPreview({ hidden, onOpen }: { hidden: boolean; onOpen: () => void }) {
  const { browser, dispatch } = useBrowser()
  if (!browser.mini || hidden) return null
  const url = currentUrl(browser)
  const scale = W / PAGE_W
  let host = url
  try { host = new URL(url).host } catch { /* keep raw */ }

  return (
    <div className="absolute right-5 bottom-[150px] z-30 rounded-[12px] border border-hairline bg-surface overflow-hidden group"
      style={{ width: W }}>
      <div className="relative bg-white overflow-hidden" style={{ height: PAGE_H * scale }}>
        <iframe src={url} title="Mini preview" tabIndex={-1} sandbox={BROWSER_SANDBOX} referrerPolicy="no-referrer" aria-hidden
          className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left"
          style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})` }} />
        <button type="button" onClick={onOpen} aria-label={`Open browser at ${host}`} className="absolute inset-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill" />
      </div>
      <div className="flex items-center gap-2 px-2.5 h-[28px] text-[12px] text-ink-muted">
        <span className="truncate font-mono">{host}</span>
        <button type="button" aria-label="Close mini preview" onClick={() => dispatch({ type: 'setMini', mini: false })}
          className="ml-auto grid place-items-center w-5 h-5 rounded-[6px] hover:text-ink hover:bg-raised">
          <X strokeWidth={1.5} className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
