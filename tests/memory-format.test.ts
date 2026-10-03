import { describe, it, expect } from 'vitest'
import { formatConfidence } from '@/lib/memory-format'

describe('formatConfidence', () => {
  it('shows a percentage for real values', () => {
    expect(formatConfidence(0.734)).toBe('73%')
    expect(formatConfidence(0)).toBe('0%')
    expect(formatConfidence(1)).toBe('100%')
  })
  it('shows a dash instead of NaN% when there is no data', () => {
    expect(formatConfidence(undefined)).toBe('—')
    expect(formatConfidence(null)).toBe('—')
    expect(formatConfidence(NaN)).toBe('—')
  })
})
