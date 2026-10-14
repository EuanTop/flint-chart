/**
 * The header: furniture on the canvas's top edge, on a line above the headline and beside it,
 * planned before the title is fitted (see the theme-improvement page, Furniture).
 */
import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';
import type { ThemeSpec } from '../src/core/theme/types';
import { canvasFurnitureMarkup, placeCanvasFurniture } from '../src/vegalite/canvas-furniture';

const rows = [2018, 2019, 2020, 2021, 2022, 2023].map((Year, i) => ({ Year, Value: [3, 5, 4, 7, 8, 11][i] }));
const chart = (theme: ThemeSpec | undefined, spec: Record<string, unknown> = {}) => assembleVegaLite({
    data: { values: rows },
    semantic_types: { Year: 'Year', Value: 'Quantity' },
    chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value' }, baseSize: { width: 400, height: 260 }, title: 'Value rose for five years', subtitle: 'Index', ...spec },
    ...(theme ? { theme_spec: theme } : {}),
} as any);
const items = (spec: any): any[] => spec.usermeta?.flintCanvasFurniture ?? [];
const pad = (spec: any) => (typeof spec.padding === 'number' ? { top: spec.padding, left: spec.padding, right: spec.padding } : spec.padding);
const plotHeight = (spec: any) => spec.height ?? spec.config?.view?.continuousHeight;

describe('F1: the canvas top is the canvas edge', () => {
    const edge: ThemeSpec = {
        id: 'edge',
        furniture: [
            { kind: 'rule', at: 'canvasTop', color: '#e3120b', height: 1 },
            { kind: 'tab', at: 'canvasTop', color: '#e3120b', width: 40, height: 10 },
        ],
    };

    it('runs a rule along the top edge, edge to edge, and hangs the tab from it, flush with the headline', () => {
        const spec: any = chart(edge);
        const [rule, tab] = items(spec);
        expect(rule).toMatchObject({ kind: 'rect', left: 0, right: 0, y: 0, height: 1 });
        expect(rule.width).toBeUndefined();
        expect(tab).toMatchObject({ kind: 'rect', y: 0, width: 40, height: 10 });
        expect(tab.left).toBe(pad(chart({ id: 'plain' })).left);
    });

    it('takes the band from the plot, so the canvas the caller asked for holds', () => {
        const plain: any = chart({ id: 'plain' });
        const spec: any = chart(edge);
        expect(pad(spec).top - pad(plain).top).toBe(10);
        expect(plotHeight(plain) - plotHeight(spec)).toBe(10);
    });

    it('keeps the earlier masthead tab above the headline, inside the margin', () => {
        const spec: any = chart({ id: 'tab', furniture: [{ kind: 'mastheadTab', anchor: 'topLeft', color: '#e3120b', width: 26, height: 3 }] });
        const [tab] = items(spec);
        expect(tab.y).toBe(pad(chart({ id: 'plain' })).top);
    });

    it('draws a span to whatever width the canvas renders at', () => {
        expect(placeCanvasFurniture({ kind: 'rect', left: 0, right: 0, y: 0, height: 1 }, 512)).toEqual({ x: 0, y: 0, width: 512, height: 1 });
        expect(placeCanvasFurniture({ kind: 'rect', right: 10, y: 0, width: 40, height: 8 }, 300)).toEqual({ x: 250, y: 0, width: 40, height: 8 });
    });
});

describe('F2: above the headline', () => {
    it('sets the chart’s figure label above the headline, in the kicker role', () => {
        const spec: any = chart({ id: 'k', type: { kicker: { case: 'upper', weight: 'bold', color: '#0a4b69', size: 11 } } }, { label: 'Figure 1' });
        const [label] = items(spec);
        expect(label).toMatchObject({ kind: 'text', text: 'FIGURE 1', fontWeight: 700, color: '#0a4b69' });
        expect(label.y + label.height).toBeLessThanOrEqual(pad(spec).top);
    });

    it('draws a figure label with no theme, over the headline wherever it is anchored', () => {
        // With no theme the headline is centred, and the label with it.
        expect(items(chart(undefined, { label: 'Figure 3' }))[0]).toMatchObject({ kind: 'text', text: 'Figure 3', center: true });
        expect(canvasFurnitureMarkup(items(chart(undefined, { label: 'Figure 3' })), 400)).toContain('text-anchor="middle"');
    });

    it('takes a logo from inline SVG or an image, with a link, at either end of the line', () => {
        const spec: any = chart({
            id: 'logo',
            furniture: [
                { kind: 'image', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>', width: 30, height: 20, align: 'end', href: 'https://example.org', alt: 'House' },
                { kind: 'text', text: 'House Data', align: 'start', type: { weight: 'bold' } },
            ],
        });
        const [logo, word] = items(spec);
        expect(logo.src).toMatch(/^data:image\/svg\+xml/);
        expect(logo).toMatchObject({ right: pad(spec).right, width: 30, height: 20, href: 'https://example.org' });
        expect(word).toMatchObject({ kind: 'text', text: 'House Data', fontWeight: 700 });
        const markup = canvasFurnitureMarkup(items(spec), 400);
        expect(markup).toContain('<a href="https://example.org"');
        expect(markup).toContain('<image');
    });
});

describe('F3: beside the headline', () => {
    const long = 'A headline long enough that it has to be broken somewhere over the plot';
    const logo = (width: number, align: 'start' | 'end' = 'end'): ThemeSpec => ({
        id: 'beside', furniture: [{ kind: 'image', at: 'besideTitle', src: 'data:image/png;base64,AA==', width, height: 24, align }],
    });
    const lines = (spec: any) => [spec.title?.text].flat().length;

    it('fits the headline to the width left beside a logo', () => {
        // The title is fitted to its block less the logo and its gap (150 + 8).
        const block = (spec: any) => Number(/fit the (\d+)px block/.exec(spec._theme.report.find((r: any) => r.code === 'title-broken')?.message ?? '')?.[1]);
        expect(block(chart({ id: 'plain' }, { title: long })) - block(chart(logo(150), { title: long }))).toBe(158);
        expect(lines(chart(logo(150), { title: long }))).toBeGreaterThanOrEqual(2);
    });

    it('moves the title over by what sits at its start', () => {
        expect(chart(logo(60, 'start')).title.dx).toBe(68);
    });

    it('moves a logo above the headline when beside it the headline would be squeezed', () => {
        const spec: any = chart(logo(320));
        const [placed] = items(spec);
        expect(spec.title.dx).toBeUndefined();
        expect(placed.y + placed.height).toBeLessThanOrEqual(pad(spec).top);
        expect(spec._theme.report.some((r: any) => r.code === 'header-moved-above-title')).toBe(true);
    });

    it('takes the header’s room from the plot, never from the rules the theme sets around it', () => {
        // A logo moved above the headline takes a line; the 1px rules above and below the plot keep 1px.
        const spec: any = chart({
            id: 'ruled', furniture: [
                { kind: 'headerRule', color: '#cccccc', height: 1 },
                { kind: 'footerRule', color: '#cccccc', height: 1 },
                { kind: 'image', at: 'besideTitle', src: 'data:image/png;base64,AA==', width: 320, height: 24, align: 'end' },
            ],
        });
        const rules = (spec.vconcat ?? []).filter((v: any) => v.__themeSynthetic);
        expect(rules).toHaveLength(2);
        for (const rule of rules) expect(rule.height).toBe(1);
    });

    it('starts the title at the plot’s edge when the house says so', () => {
        const spec: any = chart({ id: 'plot', layout: { titleBlock: { frame: 'plot' } } });
        expect(spec.config.title.frame).toBe('group');
    });
});
