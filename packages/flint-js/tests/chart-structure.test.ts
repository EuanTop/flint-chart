import { describe, expect, it } from 'vitest';
import { generatedVegaLiteCases } from './generated-inputs';
import { vegaLiteStructures } from '../src/vegalite/assemble';
import { structureDifferences } from '../src/core/structure';
import type { ChartAssemblyInput } from '../src/core/types';

describe('chart structure', () => {
    // The plan reads a chart's structure before the template builds it, so the two must agree.
    it('matches what each template builds, for every test case and theme', () => {
        const mismatches: string[] = [];
        for (const { section, testCase, theme, input } of generatedVegaLiteCases()) {
            const { planned, built } = vegaLiteStructures(input);
            for (const difference of structureDifferences(planned, built)) {
                mismatches.push(`${section} | ${testCase.title} | ${theme ?? 'none'} | ${difference}`);
            }
        }
        expect(mismatches).toEqual([]);
    }, 300_000);

    // A waterfall prints its value labels only when its bands are wide enough for them.
    it.each([[320, 'narrow'], [1200, 'wide']])('matches a labelled waterfall at %ipx (%s bands)', (width) => {
        const values = Array.from({ length: 40 }, (_, index) => ({ Step: `Step ${index + 1}`, Amount: (index % 3 === 0 ? -1 : 1) * (10 + index) }));
        const { planned, built } = vegaLiteStructures({
            data: { values },
            semantic_types: { Step: 'Category', Amount: 'Amount' },
            chart_spec: {
                chartType: 'Waterfall Chart', encodings: { x: 'Step', y: 'Amount' },
                chartProperties: { showTextLabels: true }, baseSize: { width, height: 300 },
            },
        } as ChartAssemblyInput);
        expect(structureDifferences(planned, built)).toEqual([]);
    });

    // Properties that change what a template draws, which the generated cases leave at their defaults.
    const grid = Array.from({ length: 12 }, (_, index) => ({ cat: `c${index % 4}`, grp: `g${index % 3}`, val: 10 + index }));
    it.each(['zero', 'normalize', 'center', 'layered'])('matches a stacked bar stacked as %s', (stackMode) => {
        const { planned, built } = vegaLiteStructures({
            data: { values: grid },
            semantic_types: { cat: 'Category', grp: 'Category', val: 'Amount' },
            chart_spec: { chartType: 'Stacked Bar Chart', encodings: { x: 'cat', y: 'val', color: 'grp' }, chartProperties: { stackMode } },
        } as ChartAssemblyInput);
        expect(structureDifferences(planned, built)).toEqual([]);
    });

    it('matches a heat map that prints its values', () => {
        const { planned, built } = vegaLiteStructures({
            data: { values: grid },
            semantic_types: { cat: 'Category', grp: 'Category', val: 'Count' },
            chart_spec: { chartType: 'Heatmap', encodings: { x: 'cat', y: 'grp', color: 'val' }, chartProperties: { showTextLabels: true } },
        } as ChartAssemblyInput);
        expect(structureDifferences(planned, built)).toEqual([]);
    });
});
