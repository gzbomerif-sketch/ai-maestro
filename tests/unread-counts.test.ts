import { describe, it, expect } from 'vitest'
import { mergeUnreadCounts } from '@/hooks/useUnreadCounts'

const ok = (n: number): PromiseSettledResult<number> => ({ status: 'fulfilled', value: n })
const fail: PromiseSettledResult<number> = { status: 'rejected', reason: new Error('host down') }

describe('mergeUnreadCounts', () => {
  it('takes fresh counts', () => {
    expect(mergeUnreadCounts({}, [{ id: 'a', outcome: ok(2) }, { id: 'b', outcome: ok(0) }])).toEqual({ a: 2, b: 0 })
  })
  it('keeps the last known count when a host fails', () => {
    expect(mergeUnreadCounts({ a: 3, b: 1 }, [{ id: 'a', outcome: fail }, { id: 'b', outcome: ok(4) }])).toEqual({ a: 3, b: 4 })
  })
  it('drops agents that are no longer listed', () => {
    expect(mergeUnreadCounts({ gone: 5 }, [{ id: 'a', outcome: ok(1) }])).toEqual({ a: 1 })
  })
  it('treats a failure with no history as zero', () => {
    expect(mergeUnreadCounts({}, [{ id: 'a', outcome: fail }])).toEqual({ a: 0 })
  })
})
