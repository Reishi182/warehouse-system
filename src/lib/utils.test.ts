import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn - classname utility', () => {
    it('should merge class names', () => {
        const result = cn('class1', 'class2');
        expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
        const result = cn('base', true && 'included', false && 'excluded');
        expect(result).toBe('base included');
    });

    it('should handle undefined and null', () => {
        const result = cn('base', undefined, null, 'valid');
        expect(result).toBe('base valid');
    });

    it('should merge tailwind classes correctly', () => {
        // tw-merge should handle conflicting classes
        const result = cn('p-4', 'p-2');
        expect(result).toBe('p-2');
    });

    it('should handle empty input', () => {
        const result = cn();
        expect(result).toBe('');
    });

    it('should handle array of classes', () => {
        const result = cn(['class1', 'class2']);
        expect(result).toBe('class1 class2');
    });

    it('should handle object syntax', () => {
        const result = cn({
            'included-class': true,
            'excluded-class': false,
        });
        expect(result).toBe('included-class');
    });
});
