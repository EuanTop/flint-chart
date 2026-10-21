/**
 * The typography rules: every TypeRole field a theme states is either drawn or reported (see the
 * theme-improvement playground page, Typography, for the before/after of each).
 */
import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';
import type { ThemeSpec } from '../src/core/theme/types';

const rows = ['North', 'South', 'East'].flatMap((Region, r) => [2022, 2023, 2024].map((Year, i) => ({ Year, Region, Value: 10 + r * 5 + i })));
const lines = (theme: ThemeSpec, extra: Record<string, unknown> = {}) => assembleVegaLite({
    data: { values: rows },
    semantic_types: { Year: 'Year', Region: 'Category', Value: 'Quantity' },
    chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value', color: 'Region' }, title: 'Regional value', subtitle: 'Index, 2022–2024', ...extra },
    theme_spec: theme,
} as any);

describe('T1: every weight and style a role states is drawn', () => {
    const styled: ThemeSpec = {
        id: 'styled',
        type: {
            deck: { weight: 'semibold', style: 'italic' },
            axisLabel: { weight: 'bold', style: 'italic' },
            axisTitle: { weight: 'bold', style: 'italic' },
            keyLabel: { weight: 'semibold', style: 'italic' },
        },
        legend: { show: 'always' },
    };

    it('writes the deck’s weight', () => {
        const spec: any = lines(styled);
        expect(spec.config.title.subtitleFontWeight).toBe(600);
        expect(spec.config.title.subtitleFontStyle).toBe('italic');
    });

    it('writes the axis labels’ weight and style, and the axis title’s style', () => {
        const spec: any = lines(styled);
        const axes = [spec.config.axisX, spec.config.axisY, spec.config.axis].filter(Boolean);
        expect(axes.some((a: any) => a.labelFontWeight === 700 && a.labelFontStyle === 'italic')).toBe(true);
        expect(axes.some((a: any) => a.titleFontStyle === 'italic')).toBe(true);
    });

    it('writes the key labels’ weight and style', () => {
        const spec: any = lines(styled);
        expect(spec.config.legend?.labelFontWeight).toBe(600);
        expect(spec.config.legend?.labelFontStyle).toBe('italic');
    });

    it('writes nothing new for a house that states neither', () => {
        const spec: any = lines({ id: 'plain' });
        expect(spec.config.title.subtitleFontWeight).toBeUndefined();
        for (const a of [spec.config.axisX, spec.config.axisY, spec.config.axis].filter(Boolean)) {
            expect(a.labelFontWeight).toBeUndefined();
            expect(a.titleFontStyle).toBeUndefined();
        }
    });
});

describe('T3: the case a role asks for is drawn', () => {
    it('cases text by the rule', async () => {
        const { applyTextCase } = await import('../src/core/text-case');
        expect(applyTextCase('Share of new car sales', 'upper')).toBe('SHARE OF NEW CAR SALES');
        expect(applyTextCase('share of the US vote', 'title')).toBe('Share of the US Vote');
        expect(applyTextCase('the end of an era', 'title')).toBe('The End of an Era');
        expect(applyTextCase('fewer jobless in the US', 'sentence')).toBe('Fewer jobless in the US');
        expect(applyTextCase('Fewer Jobless', 'lower')).toBe('fewer jobless');
        expect(applyTextCase('As written', 'asIs')).toBe('As written');
    });

    const cased: ThemeSpec = {
        id: 'cased',
        type: {
            headline: { case: 'upper' },
            deck: { case: 'upper' },
            axisTitle: { case: 'upper' },
            keyLabel: { case: 'upper' },
        },
        legend: { show: 'always' },
    };
    const textOf = (title: any) => [title?.text].flat().join(' ');

    it('cases the headline and the deck', () => {
        const spec: any = lines(cased);
        expect(textOf(spec.title)).toBe('REGIONAL VALUE');
        expect([spec.title.subtitle].flat().join(' ')).toBe('INDEX, 2022–2024');
    });

    it('cases the axis titles it prints', () => {
        const spec: any = lines(cased);
        expect(JSON.stringify(spec)).toContain('"title":"VALUE"');
    });

    it('cases the key labels with an expression over the label', () => {
        const spec: any = lines(cased);
        expect(JSON.stringify(spec)).toContain('upper(datum.label)');
    });

    it('title-cases category labels by looking each value up', () => {
        const spec: any = assembleVegaLite({
            data: { values: [{ Party: 'green party', Seats: 2 }, { Party: 'party of the people', Seats: 5 }] },
            semantic_types: { Party: 'Category', Seats: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Party', y: 'Seats' } },
            theme_spec: { id: 'tc', type: { axisLabel: { case: 'title' } } },
        } as any);
        const text = JSON.stringify(spec);
        expect(text).toContain('Green Party');
        expect(text).toContain('Party of the People');
    });

    it('draws text as written for a house that states no case', () => {
        const spec: any = lines({ id: 'plain' });
        expect(textOf(spec.title)).toBe('Regional value');
        expect(JSON.stringify(spec)).not.toContain('upper(');
    });
});

describe('T4: the roles nothing read are drawn where Flint has their text, or reported', () => {
    const marks = (spec: any): any[] => {
        const out: any[] = [];
        const visit = (n: any) => {
            if (!n || typeof n !== 'object') return;
            if (n.mark) out.push(n);
            for (const c of [...(n.layer ?? []), ...(n.vconcat ?? []), ...(n.hconcat ?? []), ...(n.concat ?? []), n.spec].filter(Boolean)) visit(c);
        };
        visit(spec);
        return out;
    };

    it('sets a statistic’s note in the annotation role', () => {
        const points = Array.from({ length: 12 }, (_, i) => ({ X: i, Y: 2 * i + (i % 3) }));
        const spec: any = assembleVegaLite({
            data: { values: points },
            semantic_types: { X: 'Quantity', Y: 'Quantity' },
            chart_spec: { chartType: 'Regression', encodings: { x: 'X', y: 'Y' } },
            theme_spec: { id: 'a', annotation: { statistics: { show: ['r2'] } }, type: { annotation: { family: 'Georgia', style: 'italic', color: '#7a5c00' } } },
        } as any);
        const note = marks(spec).find((n) => typeof n.mark?.text === 'string' && n.mark.text.startsWith('R²'));
        expect(note.mark).toMatchObject({ font: 'Georgia', fontStyle: 'italic', fill: '#7a5c00' });
    });

    it('sets a KPI’s big number in the display role, keeping the size the tile fitted', () => {
        const kpi = (theme?: ThemeSpec) => assembleVegaLite({
            data: { values: [{ Metric: 'Renewable share', 'Share (%)': 31, Target: 40 }] },
            semantic_types: { Metric: 'Category', 'Share (%)': 'Quantity', Target: 'Quantity' },
            chart_spec: { chartType: 'KPI Card', encodings: { metric: 'Metric', value: 'Share (%)', goal: 'Target' } },
            ...(theme ? { theme_spec: theme } : {}),
        } as any);
        const number = (spec: any) => marks(spec).find((n) => n.__textRole === 'display');
        const plain = number(kpi({ id: 'plain' }));
        const styled = number(kpi({ id: 'd', type: { display: { family: 'Lato', weight: 'black', color: '#0b3d91', size: 60 } } }));
        expect(styled.mark).toMatchObject({ font: 'Lato', fontWeight: 900, fill: '#0b3d91' });
        expect(styled.mark.fontSize).toBe(plain.mark.fontSize);
    });

    it('no longer reports the footnote role: the source line is set in it (S1)', () => {
        const spec: any = lines({ id: 'f', type: { footnote: { size: 9 } } });
        expect(spec._theme.report.some((r: any) => r.code === 'role-not-drawn' && r.path === 'type.footnote')).toBe(false);
    });
});
