import { cn, formatCurrency } from '../utils'

describe('utils', () => {
    describe('cn (className utility)', () => {
        it('merges class names', () => {
            expect(cn('base', 'extra')).toContain('base')
            expect(cn('base', 'extra')).toContain('extra')
        })

        it('handles conditional classes', () => {
            const result = cn('base', false && 'hidden', 'visible')
            expect(result).toContain('base')
            expect(result).toContain('visible')
            expect(result).not.toContain('hidden')
        })

        it('handles undefined and null', () => {
            expect(cn('base', undefined, null, 'extra')).toContain('base')
            expect(cn('base', undefined, null, 'extra')).toContain('extra')
        })
    })

    describe('formatCurrency', () => {
        it('formats USD correctly', () => {
            expect(formatCurrency(1234.56)).toBe('$1,234.56')
        })

        it('handles zero', () => {
            expect(formatCurrency(0)).toBe('$0.00')
        })

        it('handles large numbers', () => {
            expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
        })

        it('handles negative numbers', () => {
            expect(formatCurrency(-100.5)).toBe('-$100.50')
        })
    })
})
