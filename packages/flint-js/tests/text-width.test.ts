import { describe, expect, it } from 'vitest';
import { textWidth } from '../src/core/text-width';

describe('text width', () => {
    it('reads the first family of a stack the table knows', () => {
        expect(textWidth('1,000', 10, "'Helvetica Neue', Helvetica, Arial, sans-serif"))
            .toBeCloseTo(textWidth('1,000', 10, 'Helvetica Neue'), 6);
        expect(textWidth('1,000', 10, "'Not A Font', Arial")).toBeCloseTo(textWidth('1,000', 10, 'Arial'), 6);
    });

    it('sets a heavy face wider than a regular one', () => {
        expect(textWidth('Population', 11, "'Arial Black', Arial")).toBeGreaterThan(textWidth('Population', 11, 'Arial'));
        expect(textWidth('Population', 11, 'Arial', 'bold')).toBeGreaterThan(textWidth('Population', 11, 'Arial'));
    });

    it('takes 0.62 em for a font it does not know and a full em for CJK', () => {
        expect(textWidth('abc', 10, 'Unknown Face')).toBeCloseTo(18.6, 6);
        expect(textWidth('收入', 10, 'Arial')).toBeCloseTo(20, 6);
    });
});
