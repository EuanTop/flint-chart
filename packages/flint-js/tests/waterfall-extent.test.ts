import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';
import { vegaLiteStages } from '../src/vegalite/assemble';

const values = [{ s: 'Start', v: 1000 }, { s: 'Sales', v: 400 }, { s: 'Costs', v: -250 }, { s: 'Tax', v: -50 }, { s: 'End', v: 1100 }];
const input = (showTextLabels: boolean): any => ({
    data: { values },
    semantic_types: { s: 'Category', v: 'Amount' },
    chart_spec: { chartType: 'Waterfall Chart', encodings: { x: 's', y: 'v' }, chartProperties: { showTextLabels }, baseSize: { width: 600, height: 320 } },
});

describe('waterfall extent', () => {
    // An end total stands from zero to the running sum before it; it is not added to the sum again.
    it('spans the levels its bars reach', () => {
        const { plan } = vegaLiteStages(input(false));
        expect(plan.domains.y?.extent).toEqual([0, 1400]);
    });

    it('pads labelled bars from those levels, not past them', () => {
        const spec = assembleVegaLite(input(true)) as any;
        const [lo, hi] = (spec.layer ?? spec.spec.layer)[0].encoding.y.scale.domain;
        expect(lo).toBeLessThan(0);
        expect(hi).toBeGreaterThan(1400);
        expect(hi).toBeLessThan(1600);
    });
});
