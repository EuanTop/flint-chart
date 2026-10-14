import { describe, expect, it } from 'vitest';
import { assembleVegaLite, assemblePlotly } from '../src';
import { groupPadding } from '../src/core/group-gaps';

const MEDALS = ['United States', 'China', 'Japan', 'Australia', 'France'].flatMap((Country, c) =>
    ['Gold', 'Silver', 'Bronze'].map((Medal, m) => ({ Country, Medal, Count: 40 - c * 6 - m * 3 })));

const grouped = (theme?: unknown, horizontal = false, rows = MEDALS) => ({
    data: { values: rows },
    semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Count' },
    chart_spec: {
        chartType: 'Grouped Bar Chart',
        encodings: horizontal ? { y: 'Country', x: 'Count', group: 'Medal' } : { x: 'Country', y: 'Count', group: 'Medal' },
        baseSize: { width: 480, height: 300 },
    },
    ...(theme ? { theme_spec: theme } : {}),
}) as any;

/** The bar layer's category and offset scales. */
const scales = (spec: any, horizontal = false) => {
    let bar: any;
    const visit = (n: any) => {
        if (!n || typeof n !== 'object' || bar) return;
        if ((n.mark?.type ?? n.mark) === 'bar') bar = n;
        for (const c of [...(n.layer ?? []), ...(n.vconcat ?? []), n.spec].filter(Boolean)) visit(c);
    };
    visit(spec);
    const enc = { ...(spec.encoding ?? {}), ...(bar?.encoding ?? {}) };
    return { band: enc[horizontal ? 'y' : 'x']?.scale ?? {}, lanes: enc[horizontal ? 'yOffset' : 'xOffset']?.scale ?? {} };
};

describe('G1: how a group of bars shares its step', () => {
    it('solves the bar from the step, the gap in a group and the space between groups', () => {
        // Three bars touching, a bar's width between groups: four bar widths a step.
        const touching = groupPadding({ gap: 0, spacing: 1 }, 0.8, 3, 100);
        expect(touching.bar).toBeCloseTo(25);
        expect(touching.inner).toBeCloseTo(0.25);
        expect(touching.lane).toBe(0);
        // 2px between bars: (100 − 4) / (3 + 1) = 24px bars.
        const hairline = groupPadding({ gap: '2px', spacing: 1 }, 0.8, 3, 100);
        expect(hairline.bar).toBeCloseTo(24);
        expect(hairline.inner).toBeCloseTo(0.24);
        expect(hairline.lane).toBeCloseTo(2 / 26);
        // No spacing stated: the group fills the band fraction, the bars split it less their gaps.
        const kept = groupPadding({ gap: 0.1 }, 0.6, 3, 100);
        expect(kept.inner).toBeCloseTo(0.4);
        expect(kept.bar! * 3 + kept.bar! * 0.1 * 2).toBeCloseTo(60);
    });

    it('keeps the house’s band fraction between groups and a hairline inside them, by default', () => {
        const { band, lanes } = scales(assembleVegaLite(grouped({ id: 'g', marks: { bandFraction: 0.6 } })));
        expect(band.paddingInner).toBeCloseTo(0.4);
        // Before G1 the lanes took the same 40%; now a twentieth of a bar (here more than 1px).
        expect(lanes.paddingInner).toBeCloseTo(0.05 / 1.05);
        expect(lanes.paddingOuter).toBe(0);
    });

    it('never lets the default gap fall under 1px, nor the groups come closer than half a bar', () => {
        // 12px bars: a twentieth is 0.6px, so the gap is 1px.
        const thin = groupPadding({}, 0.8, 3, 48);
        expect(thin.bar! * (thin.lane / (1 - thin.lane))).toBeCloseTo(1);
        // A 0.95 band fraction leaves 5% of the step between groups — under half a bar — so it grows.
        const wide = groupPadding({}, 0.95, 3, 100);
        const spacing = wide.inner * 100;
        expect(spacing).toBeCloseTo(wide.bar! * 0.5, 1);
        const gap = wide.bar! * (wide.lane / (1 - wide.lane));
        expect(spacing).toBeGreaterThanOrEqual(3 * gap - 1e-9);
        // A stated spacing is the house's call and is kept.
        expect(groupPadding({ spacing: '2px' }, 0.95, 3, 100).inner).toBeCloseTo(0.02);
    });

    it('draws the gaps a house states, in shares of a bar or in px, either way round', () => {
        const theme = { id: 'g', geometry: { band: { fraction: 0.6, group: { gap: 0, spacing: 1 } } } };
        const { band, lanes } = scales(assembleVegaLite(grouped(theme)));
        expect(band.paddingInner).toBeCloseTo(0.25);
        expect(lanes.paddingInner).toBe(0);
        const across = scales(assembleVegaLite(grouped({ id: 'g', geometry: { band: { group: { gap: '1px', spacing: 0.5 } } } }, true)), true);
        expect(across.band.paddingInner).toBeGreaterThan(0.1);
        expect(across.lanes.paddingInner).toBeGreaterThan(0);
        expect(across.lanes.paddingInner).toBeLessThan(0.15);
    });

    it('reports a gap it cannot read', () => {
        const spec: any = assembleVegaLite(grouped({ id: 'g', geometry: { band: { group: { gap: 'wide' } } } }));
        expect(spec._theme.report.map((r: any) => r.code)).toContain('group-gap-not-applied');
    });

    it('leaves an unthemed grouped chart as it was', () => {
        const { lanes } = scales(assembleVegaLite(grouped()));
        expect(lanes.paddingInner).toBeUndefined();
    });

    it('sizes locally dodged bars by the same rule', () => {
        // Each country holds a different number of medals: the bars are pinned by size.
        const rows = MEDALS.filter((r) => !(r.Country === 'Japan' && r.Medal === 'Bronze'));
        const theme = { id: 'g', geometry: { band: { fraction: 0.8, group: { gap: 0, spacing: 1 } } } };
        const spec: any = assembleVegaLite({ ...grouped(theme, false, rows), chart_spec: { ...grouped(theme, false, rows).chart_spec, chartProperties: { dodge: 'local' } } });
        let bar: any;
        const visit = (n: any) => {
            if (!n || typeof n !== 'object' || bar) return;
            if ((n.mark?.type ?? n.mark) === 'bar') bar = n;
            for (const c of [...(n.layer ?? []), n.spec].filter(Boolean)) visit(c);
        };
        visit(spec);
        expect(typeof bar.mark.size).toBe('number');
        const step = spec.width.step;
        expect(bar.mark.size).toBeCloseTo(step / 4, 0);
    });

    it('gives Plotly the same two gaps', () => {
        const theme = { id: 'g', geometry: { band: { fraction: 0.6, group: { gap: 0, spacing: 1 } } } };
        const figure: any = assemblePlotly(grouped(theme));
        expect(figure.layout.bargroupgap).toBe(0);
        expect(figure.layout.bargap).toBeCloseTo(0.25);
    });
});
