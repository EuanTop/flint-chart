import { describe, it, expect } from 'vitest';
import { trailingParenthetical } from '../src/core/trailing-parenthetical';
import { DEFAULT_COMPACT_TYPES, compactApplies } from '../src/core/number-compact';
import { alreadyNamed } from '../src/core/title-plan';
import { injectCanvasFurnitureSVG } from '../src/vegalite/canvas-furniture';
import { isUnsafeUrl } from '../src/vegalite/interactions/presentation/freeform-overlay';

// The patterns these guards replace, kept here to show the rewrites answer exactly as they did.
const OLD_PARENTHETICAL = /\(([^)]*)\)\s*$/;
const OLD_SCALED_NAME = /\((?:[^)]*?\s)?\$?(k|K|m|M|mn|bn|tn|thousands?|millions?|billions?|trillions?|'?000s?)\)\s*$/;
const OLD_SCALED_TEXT = /\b(thousands|millions|billions|trillions)\b|\(\s*[$£€]?\s*(k|m|mn|bn|tn)\s*\)|[$£€](k|m|mn|bn|tn)\b|\b(mn|bn|tn)\b|'000s?/i;

const SAMPLES = [
    '', 'Population', 'Population (m)', 'Population (m)  ', 'Debt ($bn)', 'Sales (000s)', "Sales ('000s)",
    'GDP (US$ bn)', 'GDP (current $bn)', 'a (b (m)', 'a (b) (m)', 'a (b)) (m)', '(m)', '()', ')', '(', 'x)',
    'Mass (kg)', 'Spend (net ($bn)', 'Trade (k )', 'Value ( $ bn )', 'Value (£ m)', 'Count (thousands)',
    'Revenue, $bn', 'In millions', 'Cost (mm)', 'Width (M)', 'Things (\tm)', 'A\u00a0(m)\u00a0',
];

/** Elapsed milliseconds of a call, for the inputs that used to backtrack. */
function elapsed(run: () => unknown): number {
    const start = performance.now();
    run();
    return performance.now() - start;
}

describe('trailingParenthetical', () => {
    it('finds what the pattern it replaces finds', () => {
        for (const text of SAMPLES) {
            const match = OLD_PARENTHETICAL.exec(text);
            const found = trailingParenthetical(text);
            expect(found?.inner, text).toBe(match?.[1]);
            if (match) expect(found?.before, text).toBe(text.slice(0, match.index));
        }
    });

    it('reads a long run of brackets and spaces in linear time', () => {
        expect(elapsed(() => trailingParenthetical('('.repeat(100_000)))).toBeLessThan(100);
        expect(elapsed(() => trailingParenthetical(`(${' '.repeat(100_000)}`))).toBeLessThan(100);
    });
});

describe('compactApplies reads a stated scale', () => {
    it('in a field name, as the old pattern did', () => {
        for (const name of SAMPLES) {
            expect(compactApplies({ name }, DEFAULT_COMPACT_TYPES), name).toBe(!OLD_SCALED_NAME.test(name));
        }
    });

    it('in a headline or deck, as the old pattern did', () => {
        for (const said of SAMPLES) {
            expect(compactApplies({ said }, DEFAULT_COMPACT_TYPES), said).toBe(!OLD_SCALED_TEXT.test(said));
        }
    });

    it('without backtracking on runs of brackets or spaces', () => {
        expect(elapsed(() => compactApplies({ name: '('.repeat(100_000) }, DEFAULT_COMPACT_TYPES))).toBeLessThan(100);
        expect(elapsed(() => compactApplies({ name: `(${' '.repeat(100_000)}` }, DEFAULT_COMPACT_TYPES))).toBeLessThan(100);
        expect(elapsed(() => compactApplies({ said: `(${' '.repeat(100_000)}` }, DEFAULT_COMPACT_TYPES))).toBeLessThan(100);
    });
});

describe('alreadyNamed', () => {
    /** The implementation before the rewrite, by the old patterns. */
    function oldAlreadyNamed(title: string, said: string, tickUnit?: string): boolean {
        const unit = OLD_PARENTHETICAL.exec(title)?.[1]?.trim().toLowerCase();
        const bare = title.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
        const text = said.toLowerCase();
        if (!bare || !text.includes(bare)) return false;
        if (unit && tickUnit && tickUnit.trim().toLowerCase() === unit) return true;
        return !unit || text.split(/[^\p{L}\p{N}%$€£]+/u).some((word) => word.startsWith(unit));
    }

    it('answers as the old patterns did', () => {
        const saids = ['Population, millions, 2023', 'People displaced across borders', 'Mass of the fleet, kg',
            'speed, km/h', 'GDP in $bn', 'Sales (000s) by region', ''];
        for (const title of SAMPLES) {
            for (const said of saids) {
                for (const tickUnit of [undefined, 'm', 'kg']) {
                    expect(alreadyNamed(title, said, tickUnit), `${title} | ${said} | ${tickUnit}`)
                        .toBe(oldAlreadyNamed(title, said, tickUnit));
                }
            }
        }
        expect(alreadyNamed('Population (m)', 'Population, millions, 2023')).toBe(true);
        expect(alreadyNamed('People (million)', 'People displaced across borders')).toBe(false);
    });

    it('without backtracking on a title of brackets or spaces', () => {
        expect(elapsed(() => alreadyNamed('('.repeat(100_000), 'x'))).toBeLessThan(100);
        expect(elapsed(() => alreadyNamed(`${' '.repeat(100_000)}(`, 'x'))).toBeLessThan(100);
    });
});

describe('injectCanvasFurnitureSVG', () => {
    const rule = [{ kind: 'rule', left: 0, right: 0, y: 4, height: 1 }];

    it('reads the canvas size from the root <svg> tag', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><g/></svg>';
        const out = injectCanvasFurnitureSVG(svg, rule);
        expect(out.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">')).toBe(true);
        expect(out.endsWith('</svg>')).toBe(true);
        expect(out.length).toBeGreaterThan(svg.length);
    });

    it('without rescanning markup from every <svg', () => {
        expect(elapsed(() => injectCanvasFurnitureSVG(`${'<svg'.repeat(50_000)}</svg>`, rule))).toBeLessThan(100);
    });
});

describe('isUnsafeUrl', () => {
    it('refuses links that run script or carry a document', () => {
        for (const url of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:x',
            'vbscript:msgbox', 'data:text/html,<script>alert(1)</script>', 'data:image/svg+xml,<svg onload=x>', 'DATA:text/html,x']) {
            expect(isUnsafeUrl(url), url).toBe(true);
        }
    });

    it('keeps ordinary links and inlined raster images', () => {
        for (const url of ['https://example.com/a.png', '#marker', 'images/a.png', 'data:image/png;base64,AA==',
            'data:image/jpeg;base64,AA==', 'data:image/webp,AA']) {
            expect(isUnsafeUrl(url), url).toBe(false);
        }
    });
});
