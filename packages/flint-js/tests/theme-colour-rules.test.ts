/**
 * The colour rules a theme's palette must keep however the data falls (see the theme-improvement
 * playground page for the before/after of each).
 *
 * R1 — never leave the house palette.
 */
import { describe, expect, it } from 'vitest';
import { assemblePlotly, assembleVegaLite } from '../src';
import type { ThemeSpec } from '../src/core/theme/types';
import { contrastRatio } from '../src/core/theme/presence';

const VEGA_DEFAULT_SCHEME = ['#4c78a8', '#f58518', '#e45756', '#72b7b2', '#54a24b'];

/** Every colour range written on a colour channel, anywhere in the spec. */
function colourRanges(spec: any): string[][] {
    const out: string[][] = [];
    const visit = (node: any) => {
        if (!node || typeof node !== 'object') return;
        for (const channel of ['color', 'fill', 'stroke']) {
            const range = node.encoding?.[channel]?.scale?.range;
            if (Array.isArray(range)) out.push(range.map((c: string) => c.toLowerCase()));
        }
        for (const child of [...(node.layer ?? []), ...(node.vconcat ?? []), ...(node.hconcat ?? []), node.spec].filter(Boolean)) visit(child);
    };
    visit(spec);
    return out;
}

const threeInks: ThemeSpec = {
    id: 'three-inks',
    ink: {
        text: { primary: '#111111', muted: '#666666' },
        series: { single: '#d40511', categorical: ['#d40511', '#000000', '#0072bc'] },
    },
};

const shares = (n: number) => Array.from({ length: n }, (_, i) => ({ Source: `S${i + 1}`, Share: 50 - i * 7 }));
const years = (n: number) => Array.from({ length: n }, (_, s) => [2020, 2021, 2022].map((Year, i) => ({ Year, Source: `S${s + 1}`, Value: 10 + s * 3 + i })))
    .flat();

describe('R1: a house palette is never replaced by the renderer’s scheme', () => {
    it('folds the tail of a pie into a grey derived from the house’s muted ink', () => {
        const spec: any = assembleVegaLite({
            data: { values: shares(5) },
            semantic_types: { Source: 'Category', Share: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'Source', size: 'Share' } },
            theme_spec: threeInks,
        } as any);
        const ranges = colourRanges(spec);
        expect(ranges.length).toBeGreaterThan(0);
        for (const range of ranges) {
            expect(range.slice(0, 3)).toEqual(['#d40511', '#000000', '#0072bc']);
            for (const c of range) expect(VEGA_DEFAULT_SCHEME).not.toContain(c);
        }
        expect(spec._theme.report.some((r: any) => r.code === 'palette-exhausted' && /grey derived from its muted ink/.test(r.message))).toBe(true);
    });

    it('gives the extra lines of a line chart the house grey, not new hues', () => {
        const spec: any = assembleVegaLite({
            data: { values: years(5) },
            semantic_types: { Year: 'Year', Source: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value', color: 'Source' } },
            theme_spec: threeInks,
        } as any);
        const [range] = colourRanges(spec);
        expect(range.slice(0, 3)).toEqual(['#d40511', '#000000', '#0072bc']);
        const tail = new Set(range.slice(3));
        expect(tail.size).toBe(1);
        expect(VEGA_DEFAULT_SCHEME).not.toContain([...tail][0]);
    });

    it('keeps a stated overflow ink when the house names one', () => {
        const spec: any = assembleVegaLite({
            data: { values: years(5) },
            semantic_types: { Year: 'Year', Source: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value', color: 'Source' } },
            theme_spec: { ...threeInks, ink: { ...threeInks.ink, series: { ...threeInks.ink!.series, overflow: '#aabbcc' } } },
        } as any);
        const [range] = colourRanges(spec);
        expect(range.slice(3)).toEqual(['#aabbcc', '#aabbcc']);
    });
});

const anomaly = [['1880s', -0.17], ['1920s', -0.27], ['1960s', -0.03], ['1980s', 0.26], ['2010s', 0.72]]
    .map(([Decade, Anomaly]) => ({ Decade, Anomaly }));
const statusHouse = (signed?: 'status'): ThemeSpec => ({
    id: 'status-house',
    ink: {
        series: {
            single: '#20aa3f',
            status: { positive: '#257675', negative: '#d14124' },
            ...(signed ? { selection: { signed } } : {}),
        },
    },
});
/** The colour encoding on the first bar layer. */
function barColour(spec: any): any {
    let found: any;
    const visit = (node: any) => {
        if (!node || typeof node !== 'object' || found) return;
        const mark = typeof node.mark === 'string' ? node.mark : node.mark?.type;
        if (mark === 'bar' && !node.__themeSynthetic) found = node.encoding?.color ?? { mark: node.mark };
        for (const child of [...(node.layer ?? []), ...(node.vconcat ?? []), node.spec].filter(Boolean)) visit(child);
    };
    visit(spec);
    return found;
}

describe('R2: one signed series of bars takes the status inks by sign', () => {
    const input = (theme: ThemeSpec, chartType = 'Bar Chart') => ({
        data: { values: anomaly },
        semantic_types: { Decade: 'Category', Anomaly: 'Quantity' },
        chart_spec: { chartType, encodings: { x: 'Decade', y: 'Anomaly' } },
        theme_spec: theme,
    } as any);

    it('colours each bar by the sign of its own value', () => {
        const colour = barColour(assembleVegaLite(input(statusHouse('status'))));
        expect(colour.condition).toEqual({ test: 'datum["Anomaly"] < 0', value: '#d14124' });
        expect(colour.value).toBe('#257675');
    });

    it('leaves the single ink when the house does not colour signed values by status', () => {
        const colour = barColour(assembleVegaLite(input(statusHouse())));
        expect(colour?.condition).toBeUndefined();
    });

    it('does not split a line at zero', () => {
        const spec: any = assembleVegaLite({
            ...input(statusHouse('status'), 'Line Chart'),
            semantic_types: { Decade: 'Category', Anomaly: 'Quantity' },
        });
        expect(JSON.stringify(spec)).not.toContain('datum[\\"Anomaly\\"] < 0');
    });
});

describe('R2 follow-up: the colour is signed only when what it encodes carries the sign', () => {
    const signedHouse = (signed: 'status' | 'diverging'): ThemeSpec => ({
        id: `signed-${signed}`,
        ink: {
            text: { primary: '#111111', muted: '#666666' },
            series: {
                single: '#20aa3f',
                categorical: ['#d40511', '#000000', '#0072bc'],
                categoricalExtended: Array.from({ length: 12 }, (_, i) => `#${(0x102030 + i * 0x0a0b0c).toString(16)}`),
                sequential: { stops: ['#e5edf5', '#00539b'] },
                diverging: { stops: ['#00539b', '#f2f2f2', '#c2352b'] },
                status: { positive: '#257675', negative: '#d14124', neutral: '#999999' },
                overflow: '#aabbcc',
                selection: { signed },
            },
        },
    });
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Winter readings below freezing; every month still averages above it.
    const readings = (shift: number) => MONTHS.flatMap((Month, m) => [-4, 0, 4, 8, 12].map((d) => ({ Month, Temperature: 6 + 8 * Math.sin((m / 11) * Math.PI) + d + shift })));
    const ridgeline = (theme: ThemeSpec | string, shift: number) => assembleVegaLite({
        data: { values: readings(shift) },
        semantic_types: { Month: 'Month', Temperature: 'Temperature' },
        chart_spec: { chartType: 'Ridgeline Plot', encodings: { x: 'Temperature', color: 'Month' }, chartProperties: { colorBy: 'series' } },
        theme_spec: theme,
    } as any);

    for (const signed of ['status', 'diverging'] as const) {
        it(`months on a ridgeline keep their ramp when the temperatures dip below zero (${signed} house)`, () => {
            const cold = colourRanges(ridgeline(signedHouse(signed), -6))[0];
            expect(readings(-6).some((r) => r.Temperature < 0)).toBe(true);
            expect(cold).toEqual(colourRanges(ridgeline(signedHouse(signed), 20))[0]);
            expect(cold).not.toContain('#aabbcc');
            expect(new Set(cold).size).toBe(12);
        });

        it(`regions that each net a gain keep their own inks when some values dip below zero (${signed} house)`, () => {
            const line = (shift: number) => assembleVegaLite({
                data: { values: ['North', 'South', 'East'].flatMap((Region, r) => [2021, 2022, 2023, 2024].map((Year, i) => ({ Year, Region, Value: 4 + r * 3 + i * 2 + shift }))) },
                semantic_types: { Year: 'Year', Region: 'Category', Value: 'Quantity' },
                chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value', color: 'Region' } },
                theme_spec: signedHouse(signed),
            } as any);
            expect(colourRanges(line(-5))[0]).toEqual(colourRanges(line(10))[0]);
        });
    }

    it('takes no NYT grey for the months past its five inks', () => {
        const range = colourRanges(ridgeline('nyt', -6))[0];
        expect(range).toHaveLength(12);
        expect(range).not.toContain('#9e9e9e');
    });

    it('still gives categories that split by sign the status inks', () => {
        const spec = assembleVegaLite({
            data: { values: [['North', 12], ['South', -8], ['East', 5], ['West', -3]].map(([Region, Net]) => ({ Region, Net })) },
            semantic_types: { Region: 'Category', Net: 'Profit' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Region', y: 'Net', color: 'Region' } },
            theme_spec: signedHouse('status'),
        } as any);
        expect(new Set(colourRanges(spec)[0])).toEqual(new Set(['#257675', '#d14124']));
    });

    it('reads a continuous colour’s sign from its own values, not the axes’', () => {
        const scatter = (yShift: number, colourShift: number) => assembleVegaLite({
            data: { values: Array.from({ length: 12 }, (_, i) => ({ Growth: i - 4 + yShift, Spend: 10 + i, Score: 5 + i * 2 + colourShift })) },
            semantic_types: { Growth: 'Quantity', Spend: 'Quantity', Score: 'Quantity' },
            chart_spec: { chartType: 'Scatter Plot', encodings: { x: 'Spend', y: 'Growth', color: 'Score' } },
            theme_spec: signedHouse('diverging'),
        } as any);
        const positive = colourRanges(scatter(10, 0))[0];
        expect(colourRanges(scatter(0, 0))[0]).toEqual(positive);
        expect(colourRanges(scatter(0, -20))[0]).not.toEqual(positive);
    });
});

describe('Ridgeline: named ridges share one ink', () => {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const rows = MONTHS.flatMap((Month, m) => [0, 2, 4, 6, 8].map((d) => ({ Month, Temperature: m * 2 + d })));
    const ridgeline = (chartProperties: Record<string, unknown> = {}, theme: string = 'nyt') => assembleVegaLite({
        data: { values: rows },
        semantic_types: { Month: 'Month', Temperature: 'Temperature' },
        chart_spec: { chartType: 'Ridgeline Plot', encodings: { x: 'Temperature', color: 'Month' }, chartProperties },
        theme_spec: theme,
    } as any);
    const areas = (spec: any): any[] => {
        const out: any[] = [];
        const visit = (node: any) => {
            if (!node || typeof node !== 'object') return;
            const mark = typeof node.mark === 'string' ? node.mark : node.mark?.type;
            if (mark === 'area') out.push(node);
            for (const child of node.layer ?? []) visit(child);
        };
        visit(spec);
        return out;
    };

    it('draws every ridge in the house’s single ink, kept apart by its series', () => {
        const spec: any = ridgeline();
        const [area] = areas(spec);
        expect(area.encoding.color).toBeUndefined();
        expect(area.encoding.detail).toMatchObject({ field: 'Month' });
        expect(area.mark.color).toBe('#2f6b9a');
        expect(spec._theme.report.some((r: any) => r.code === 'series-mode-not-applied')).toBe(false);
    });

    it('colours each ridge by its series when asked', () => {
        expect(colourRanges(ridgeline({ colorBy: 'series' }))[0]).toHaveLength(MONTHS.length);
    });

    it('keeps the x ramp a house would otherwise paint over', () => {
        for (const area of areas(ridgeline({ colorBy: 'x' }))) expect(area.mark.color).toMatchObject({ gradient: 'linear' });
    });
});

/** The resolved point definition on the first line layer (mark-level, else the config's). */
function linePoint(spec: any): any {
    let found: any;
    const visit = (node: any) => {
        if (!node || typeof node !== 'object' || found) return;
        const mark = typeof node.mark === 'string' ? node.mark : node.mark?.type;
        if (mark === 'line') found = (typeof node.mark === 'object' && node.mark.point) || spec.config?.line?.point;
        for (const child of [...(node.layer ?? []), ...(node.vconcat ?? []), node.spec].filter(Boolean)) visit(child);
    };
    visit(spec);
    return found;
}
const trend = [2018, 2019, 2020, 2021, 2022, 2023].map((Year, i) => ({ Year, Value: 10 + i * 3 }));
const dotted = (point: ThemeSpec['geometry'] extends infer G ? any : never): ThemeSpec => ({
    id: 'dotted',
    ink: { surface: { canvas: '#ffffff' }, text: { primary: '#222222' }, series: { single: '#20aa3f' } },
    geometry: { point: { presence: 'full', size: 28, ...point } },
});
const lineInput = (theme: ThemeSpec) => ({
    data: { values: trend },
    semantic_types: { Year: 'Year', Value: 'Quantity' },
    chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value' } },
    theme_spec: theme,
} as any);

describe('R3: a line’s dots never take a colour the house did not name', () => {
    it('gives a single-series line’s dots the line’s own ink', () => {
        const point = linePoint(assembleVegaLite(lineInput(dotted({}))));
        expect(point.color).toBe('#20aa3f');
    });

    it('keeps a hollow dot’s ring in the dot’s ink rather than the page colour', () => {
        const point = linePoint(assembleVegaLite(lineInput(dotted({ fill: 'hollow' }))));
        expect(point.filled).toBe(false);
        expect(point.stroke).toBeUndefined();
        expect(point.color).toBe('#20aa3f');
    });

    it('lets a house draw its dots in the text ink', () => {
        const point = linePoint(assembleVegaLite(lineInput(dotted({ ink: 'text' }))));
        expect(point.color).toBe('#222222');
    });
});


/** Synthetic text layers that carry a colour scale, with their ranges. */
function textRanges(spec: any): string[][] {
    const out: string[][] = [];
    const visit = (node: any) => {
        if (!node || typeof node !== 'object') return;
        const mark = typeof node.mark === 'string' ? node.mark : node.mark?.type;
        if (mark === 'text' && node.__themeSynthetic && Array.isArray(node.encoding?.color?.scale?.range)) out.push(node.encoding.color.scale.range);
        for (const child of [...(node.layer ?? []), ...(node.vconcat ?? []), ...(node.hconcat ?? []), node.spec].filter(Boolean)) visit(child);
    };
    visit(spec);
    return out;
}

describe('R4: text written in a series’ colour stays readable', () => {
    const pale = (extra: Partial<NonNullable<NonNullable<ThemeSpec['ink']>['series']>> = {}): ThemeSpec => ({
        id: 'pale',
        ink: { surface: { canvas: '#ffffff' }, series: { categorical: ['#0072bc', '#f0a500', '#6cd8fd'], ...extra } },
        legend: { placement: ['seriesEnd', 'right'] },
    });
    const ev = [2018, 2020, 2022, 2023].flatMap((Year, i) => [
        { Year, Country: 'Norway', Share: 49 + i * 14 },
        { Year, Country: 'China', Share: 4 + i * 11 },
        { Year, Country: 'Germany', Share: 2 + i * 8 },
    ]);
    const input = (theme: ThemeSpec) => ({
        data: { values: ev },
        semantic_types: { Year: 'Year', Country: 'Country', Share: 'Quantity' },
        chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Share', color: 'Country' } },
        theme_spec: theme,
    } as any);

    it('darkens the series names whose ink fails 3:1, leaving the lines in the house’s inks', () => {
        const spec: any = assembleVegaLite(input(pale()));
        const [lines] = colourRanges(spec);
        expect(lines).toEqual(['#0072bc', '#f0a500', '#6cd8fd']);
        const [names] = textRanges(spec);
        expect(names[0]).toBe('#0072bc');
        for (const ink of names) expect(contrastRatio(ink, '#ffffff')).toBeGreaterThanOrEqual(3);
        expect(spec._theme.report.some((r: any) => r.code === 'text-ink-darkened')).toBe(true);
    });

    it('uses the house’s own text variant where it gives one', () => {
        const spec: any = assembleVegaLite(input(pale({ categoricalText: ['#0072bc', '#8a6100', '#0b6e8f'] })));
        const [names] = textRanges(spec);
        expect(names).toEqual(['#0072bc', '#8a6100', '#0b6e8f']);
    });
});

describe('R5: a series ink too faint against the plot is made visible', () => {
    const faint: ThemeSpec = {
        id: 'faint',
        ink: { surface: { canvas: '#ffffff' }, series: { single: '#0090da', categorical: ['#0090da', '#333333', '#f2f2f2'] } },
    };
    const parts = [['Equity', 50], ['Bonds', 30], ['Other', 20]].map(([Asset, Share]) => ({ Asset, Share }));

    it('edges a near-white fill in a darker shade of its hue, keeping the fill', () => {
        const spec: any = assembleVegaLite({
            data: { values: parts },
            semantic_types: { Asset: 'Category', Share: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Asset', y: 'Share', color: 'Asset' } },
            theme_spec: faint,
        } as any);
        const json = JSON.stringify(spec);
        expect(json).toContain('#f2f2f2');
        const edge = (spec.encoding ?? spec.layer?.[0]?.encoding)?.stroke;
        expect(edge?.scale?.range).toBeDefined();
        const faintEdge = edge.scale.range[2];
        expect(faintEdge).not.toBe('#f2f2f2');
        expect(contrastRatio(faintEdge, '#ffffff')).toBeGreaterThanOrEqual(2);
        expect(spec._theme.report.some((r: any) => r.code === 'faint-ink-edged')).toBe(true);
    });

    it('darkens a line drawn in a faint ink, and leaves inks that read alone', () => {
        const yellow: ThemeSpec = { id: 'yellow', ink: { surface: { canvas: '#ffffff' }, series: { single: '#ffcc00' } } };
        const spec: any = assembleVegaLite({
            data: { values: [2020, 2021, 2022].map((Year, i) => ({ Year, Value: 3 + i })) },
            semantic_types: { Year: 'Year', Value: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value' } },
            theme_spec: yellow,
        } as any);
        const line = (spec.layer ?? [spec]).find((l: any) => (l.mark?.type ?? l.mark) === 'line');
        expect(line.mark.color).not.toBe('#ffcc00');
        expect(contrastRatio(line.mark.color, '#ffffff')).toBeGreaterThanOrEqual(1.6);

        const blue: any = assembleVegaLite({
            data: { values: [2020, 2021, 2022].map((Year, i) => ({ Year, Value: 3 + i })) },
            semantic_types: { Year: 'Year', Value: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value' } },
            theme_spec: { id: 'blue', ink: { series: { single: '#3ebcd2' } } },
        } as any);
        expect(JSON.stringify(blue)).toContain('#3ebcd2');
        expect((blue._theme?.report ?? []).some((r: any) => /faint-ink/.test(r.code))).toBe(false);
    });
});

describe('R1 follow-up: a tail of one keeps its own name', () => {
    it('greys the smallest of five slices under its own name rather than "Others (1)"', () => {
        const fourInks: ThemeSpec = { id: 'four', ink: { text: { muted: '#666666' }, series: { categorical: ['#0072bc', '#d40511', '#000000', '#f0a500'] } } };
        const spec: any = assembleVegaLite({
            data: { values: [['Chrome', 65], ['Safari', 12], ['Edge', 12], ['Firefox', 6], ['Other', 5]].map(([Browser, Share]) => ({ Browser, Share })) },
            semantic_types: { Browser: 'Category', Share: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'Browser', size: 'Share' } },
            theme_spec: fourInks,
        } as any);
        const json = JSON.stringify(spec);
        expect(json).not.toContain('Others (1)');
        const domains: string[][] = [];
        const visit = (node: any) => {
            if (!node || typeof node !== 'object') return;
            const d = node.encoding?.color?.scale?.domain;
            if (Array.isArray(d)) domains.push(d);
            for (const child of [...(node.layer ?? []), ...(node.vconcat ?? []), node.spec].filter(Boolean)) visit(child);
        };
        visit(spec);
        expect(domains[0]).toEqual(['Chrome', 'Safari', 'Edge', 'Firefox', 'Other']);
    });
});

const lineChart = (n: number, theme: ThemeSpec) => assembleVegaLite({
    data: { values: years(n) },
    semantic_types: { Year: 'Year', Source: 'Category', Value: 'Quantity' },
    chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value', color: 'Source' } },
    theme_spec: theme,
} as any);

describe('R6: a set written for a series count', () => {
    const counted: ThemeSpec = {
        id: 'counted',
        ink: {
            text: { primary: '#111111', muted: '#666666' },
            series: {
                single: '#6929c4',
                categorical: ['#6929c4', '#1192e8', '#005d5d', '#9f1853', '#fa4d56', '#570408'],
                categoricalByCount: { 2: ['#6929c4', '#009d9a'], 3: ['#a56eff', '#005d5d', '#9f1853'] },
            },
        },
    };

    it('takes the set for exactly that many series', () => {
        expect(colourRanges(lineChart(2, counted))[0]).toEqual(['#6929c4', '#009d9a']);
        expect(colourRanges(lineChart(3, counted))[0]).toEqual(['#a56eff', '#005d5d', '#9f1853']);
    });

    it('falls back to the general order for a count it has no set for', () => {
        expect(colourRanges(lineChart(4, counted))[0]).toEqual(['#6929c4', '#1192e8', '#005d5d', '#9f1853']);
    });

    it('reaches a larger counted set the way it reaches the extended tier', () => {
        const tiered: ThemeSpec = {
            id: 'tiered',
            ink: {
                text: { primary: '#111111', muted: '#666666' },
                series: {
                    categorical: ['#0076ce', '#6ea204', '#f2af00'],
                    categoricalByCount: { 6: ['#0076ce', '#6ea204', '#f2af00', '#b85200', '#ba467d', '#00468b'] },
                },
            },
        };
        expect(colourRanges(lineChart(5, tiered))[0]).toEqual(['#0076ce', '#6ea204', '#f2af00', '#b85200', '#ba467d']);
    });

    it('repeats the palette past its end when the house asks', () => {
        const spec: any = lineChart(5, { ...threeInks, ink: { ...threeInks.ink, series: { ...threeInks.ink!.series, repeat: true } } });
        expect(colourRanges(spec)[0]).toEqual(['#d40511', '#000000', '#0072bc', '#d40511', '#000000']);
        expect(spec._theme.report.some((r: any) => r.code === 'palette-repeated')).toBe(true);
    });

    it('still folds the tail of a pie, whose first and last slices touch', () => {
        const spec: any = assembleVegaLite({
            data: { values: shares(5) },
            semantic_types: { Source: 'Category', Share: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'Source', size: 'Share' } },
            theme_spec: { ...threeInks, ink: { ...threeInks.ink, series: { ...threeInks.ink!.series, repeat: true } } },
        } as any);
        for (const range of colourRanges(spec)) expect(new Set(range).size).toBe(range.length);
    });

    it('changes nothing for a house that states neither', () => {
        expect(colourRanges(lineChart(3, threeInks))[0]).toEqual(['#d40511', '#000000', '#0072bc']);
    });
});

describe('R8: colours bound to values — the chart’s own, the house’s roles', () => {
    const house: ThemeSpec = {
        id: 'house',
        ink: {
            text: { primary: '#111111', muted: '#666666' },
            series: {
                categorical: ['#0793ab', '#a1000f', '#ff781f', '#07ab20', '#6a3d9a'],
                roles: { other: '#7a7a7a', total: '#333333' },
            },
        },
    };
    const PARTY_COLOURS = { DFL: '#0793ab', republican: '#a1000f' };
    const votes = [
        { Party: 'Republican', Votes: 40 }, { Party: 'Green', Votes: 6 }, { Party: 'DFL', Votes: 45 },
        { Party: 'Independence', Votes: 5 }, { Party: 'Other', Votes: 4 },
    ];
    const pie = (theme: ThemeSpec | undefined, colors: Record<string, string> | null = PARTY_COLOURS) => assembleVegaLite({
        data: { values: votes },
        semantic_types: { Party: colors ? { semanticType: 'Category', colors } : 'Category', Votes: 'Quantity' },
        chart_spec: { chartType: 'Pie Chart', encodings: { color: 'Party', size: 'Votes' } },
        ...(theme ? { theme_spec: theme } : {}),
    } as any);
    const scaleOf = (spec: any) => {
        let found: any;
        const visit = (n: any) => {
            if (!n || typeof n !== 'object' || found) return;
            if (n.encoding?.color?.scale?.range) found = n.encoding.color.scale;
            for (const c of [...(n.layer ?? []), n.spec].filter(Boolean)) visit(c);
        };
        visit(spec);
        return found;
    };
    const inkOf = (spec: any) => {
        const scale = scaleOf(spec);
        return Object.fromEntries(scale.domain.map((v: string, i: number) => [v, String(scale.range[i]).toLowerCase()]));
    };

    it('gives each value the chart binds its colour, case-insensitively', () => {
        const ink = inkOf(pie(house));
        expect(ink.DFL).toBe('#0793ab');
        expect(ink.Republican).toBe('#a1000f');
    });

    it('gives a value with a role the house’s role ink', () => {
        expect(inkOf(pie(house)).Other).toBe('#7a7a7a');
    });

    it('keeps bound colours off every other value', () => {
        const ink = inkOf(pie(house));
        for (const v of ['Green', 'Independence']) expect(['#0793ab', '#a1000f', '#7a7a7a']).not.toContain(ink[v]);
        expect(ink.Green).not.toBe(ink.Independence);
    });

    it('lets the chart’s colour win over the house’s role', () => {
        expect(inkOf(pie(house, { ...PARTY_COLOURS, other: '#cccccc' })).Other).toBe('#cccccc');
    });

    it('writes the domain in the order Vega-Lite would, so the key reads the same', () => {
        // Flint's templates keep the rows' order (`sort: null`); the written domain must match it.
        const spec: any = pie(house);
        expect(scaleOf(spec).domain).toEqual(spec.data.values.map((r: any) => r.Party));
        const lines: any = assembleVegaLite({
            data: { values: votes.flatMap((v) => [2022, 2024].map((Year) => ({ ...v, Year }))) },
            semantic_types: { Year: 'Year', Party: { semanticType: 'Category', colors: PARTY_COLOURS }, Votes: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Votes', color: 'Party' } },
            theme_spec: house,
        } as any);
        expect(scaleOf(lines).domain).toEqual(['Republican', 'Green', 'DFL', 'Independence', 'Other']);
    });

    it('binds the chart’s colours with no theme, the rest taking the scheme without them', () => {
        const ink = inkOf(pie(undefined));
        expect(ink.DFL).toBe('#0793ab');
        expect(ink.Republican).toBe('#a1000f');
        for (const v of ['Green', 'Independence', 'Other']) expect(['#0793ab', '#a1000f']).not.toContain(ink[v]);
        expect(new Set(Object.values(ink)).size).toBe(5);
    });

    it('uses the role ink for Other as the overflow ink when the house names none', () => {
        const spec: any = lineChart(5, { ...threeInks, ink: { ...threeInks.ink, series: { ...threeInks.ink!.series, roles: { other: '#999999' } } } });
        expect(colourRanges(spec)[0].slice(3)).toEqual(['#999999', '#999999']);
    });

    it('binds pie slices and series traces in Plotly too', () => {
        const fig: any = assemblePlotly({
            data: { values: votes },
            semantic_types: { Party: { semanticType: 'Category', colors: PARTY_COLOURS }, Votes: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'Party', size: 'Votes' } },
            theme_spec: house,
        } as any);
        const trace = fig.data.find((t: any) => t.type === 'pie');
        const ink = Object.fromEntries(trace.labels.map((l: string, i: number) => [l, String(trace.marker.colors[i]).toLowerCase()]));
        expect(ink.DFL).toBe('#0793ab');
        expect(ink.Republican).toBe('#a1000f');
        expect(ink.Other).toBe('#7a7a7a');
        expect(['#0793ab', '#a1000f']).not.toContain(ink.Green);
    });

    it('leaves the whole palette to a chart that holds none of the bound values', () => {
        expect(colourRanges(lineChart(3, house))[0]).toEqual(['#0793ab', '#a1000f', '#ff781f']);
    });

    it('changes nothing when neither the chart nor the house binds a value', () => {
        expect(scaleOf(pie({ ...house, ink: { ...house.ink, series: { categorical: house.ink!.series!.categorical } } }, null)).domain).toBeUndefined();
        expect(scaleOf(pie(undefined, null))?.domain).toBeUndefined();
    });
});

describe('R7: inks by mark family', () => {
    const families: ThemeSpec = {
        id: 'families',
        ink: {
            text: { primary: '#111111', muted: '#666666' },
            series: {
                single: '#00a5b5',
                categorical: ['#00a5b5', '#f26722', '#8dc63f'],
                byMark: {
                    line: { single: '#f26722', categorical: ['#003b5c', '#f26722', '#6d6e71'] },
                    bar: { single: '#00a5b5' },
                    point: { categorical: ['#3ebcd2', '#8a1c1c', '#333333'] },
                },
            },
        },
    };
    const markColour = (spec: any): string | undefined => {
        let found: string | undefined;
        const visit = (n: any) => {
            if (!n || typeof n !== 'object' || found) return;
            const m = n.mark;
            if (m && typeof m === 'object' && typeof m.color === 'string') found = m.color.toLowerCase();
            for (const c of [...(n.layer ?? []), n.spec].filter(Boolean)) visit(c);
        };
        visit(spec);
        return found;
    };

    it('gives a line chart the line family’s set', () => {
        expect(colourRanges(lineChart(3, families))[0]).toEqual(['#003b5c', '#f26722', '#6d6e71']);
    });

    it('gives a single line the line family’s single ink and a single bar the bar family’s', () => {
        const line: any = assembleVegaLite({
            data: { values: SIGNED_ROWS }, semantic_types: { Year: 'Year', Value: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value' } }, theme_spec: families,
        } as any);
        const bar: any = assembleVegaLite({
            data: { values: SIGNED_ROWS }, semantic_types: { Year: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Year', y: 'Value' } }, theme_spec: families,
        } as any);
        expect(markColour(line)).toBe('#f26722');
        expect(markColour(bar)).toBe('#00a5b5');
    });

    it('gives a scatter the point family’s set', () => {
        const spec: any = assembleVegaLite({
            data: { values: years(3) }, semantic_types: { Year: 'Quantity', Source: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Scatter Plot', encodings: { x: 'Year', y: 'Value', color: 'Source' } }, theme_spec: families,
        } as any);
        expect(colourRanges(spec)[0]).toEqual(['#3ebcd2', '#8a1c1c', '#333333']);
    });

    it('keeps the general set where the chart has no family of its own', () => {
        const spec: any = assembleVegaLite({
            data: { values: shares(3) }, semantic_types: { Source: 'Category', Share: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'Source', size: 'Share' } }, theme_spec: families,
        } as any);
        expect(colourRanges(spec)[0]).toEqual(['#00a5b5', '#f26722', '#8dc63f']);
    });
});

const SIGNED_ROWS = [2019, 2020, 2021, 2022, 2023].map((Year, i) => ({ Year, Value: [12, 15, 11, 17, 19][i] }));

describe('R10: an ordered series can take a ramp', () => {
    const MEDALS = ['Gold', 'Silver', 'Bronze'];
    const medalRows = ['USA', 'China', 'Japan'].flatMap((Country, c) => MEDALS.map((Medal, m) => ({ Country, Medal, Count: 40 - c * 10 - m * 3 })));
    const grouped = (theme: ThemeSpec, order = true) => assembleVegaLite({
        data: { values: medalRows },
        semantic_types: { Country: 'Country', Medal: order ? { semanticType: 'Category', sortOrder: MEDALS } : 'Category', Count: 'Count' },
        chart_spec: { chartType: 'Grouped Bar Chart', encodings: { x: 'Country', y: 'Count', group: 'Medal' } },
        theme_spec: theme,
    } as any);
    const ordered: ThemeSpec = {
        id: 'ordered',
        ink: {
            text: { primary: '#111111', muted: '#666666' },
            series: {
                categorical: ['#00539b', '#4b9cd3', '#993399'],
                sequential: { stops: ['#e5edf5', '#00539b'] },
                ordinal: { stops: ['#00539b', '#6697c3', '#99bad7'] },
                selection: { ordered: 'ramp' },
            },
        },
    };

    it('samples the ordinal ramp, first category on the first stop, when the order is declared', () => {
        expect(colourRanges(grouped(ordered))[0]).toEqual(['#00539b', '#6697c3', '#99bad7']);
    });

    it('keeps distinct hues for a series with no declared order', () => {
        expect(colourRanges(grouped(ordered, false))[0]).toEqual(['#00539b', '#4b9cd3', '#993399']);
    });

    it('keeps distinct hues for a sequence Flint infers but the chart does not declare', () => {
        const spec: any = assembleVegaLite({
            data: { values: ['North', 'South', 'East'].flatMap((Region, r) => [2022, 2023, 2024].map((Year, i) => ({ Year, Region, Value: 10 + r * 5 + i }))) },
            semantic_types: { Year: 'Year', Region: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value', color: 'Region' } },
            theme_spec: ordered,
        } as any);
        expect(new Set(colourRanges(spec)[0])).toEqual(new Set(['#00539b', '#4b9cd3', '#993399']));
    });

    it('keeps distinct hues for a declared order unless the house asks for a ramp', () => {
        const { selection, ...series } = ordered.ink!.series!;
        void selection;
        expect(colourRanges(grouped({ ...ordered, ink: { ...ordered.ink, series } }))[0]).toEqual(['#00539b', '#4b9cd3', '#993399']);
    });
});

describe('R12: gradient fills', () => {
    const base: ThemeSpec = { id: 'g', ink: { text: { primary: '#111111', muted: '#666666' }, series: { single: '#0176d3', categorical: ['#0176d3', '#fe9339', '#2e844a'] } } };
    const withGeometry = (geometry: any): ThemeSpec => ({ ...base, geometry } as ThemeSpec);
    const nodes = (spec: any): any[] => {
        const out: any[] = [];
        const visit = (n: any) => {
            if (!n || typeof n !== 'object') return;
            if (n.mark) out.push(n);
            for (const c of [...(n.layer ?? []), ...(n.vconcat ?? []), ...(n.hconcat ?? []), n.spec].filter(Boolean)) visit(c);
        };
        visit(spec);
        return out;
    };
    const type = (n: any) => (typeof n.mark === 'string' ? n.mark : n.mark?.type);
    const singleArea = (theme: ThemeSpec) => assembleVegaLite({
        data: { values: SIGNED_ROWS }, semantic_types: { Year: 'Year', Value: 'Quantity' },
        chart_spec: { chartType: 'Area Chart', encodings: { x: 'Year', y: 'Value' } }, theme_spec: theme,
    } as any);
    const singleLine = (theme: ThemeSpec) => assembleVegaLite({
        data: { values: SIGNED_ROWS }, semantic_types: { Year: 'Year', Value: 'Quantity' },
        chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value' } }, theme_spec: theme,
    } as any);

    it('fades a single area from its ink to clear at the baseline', () => {
        const area = nodes(singleArea(withGeometry({ area: { fill: 'fade' } }))).find((n) => type(n) === 'area');
        const g = area.encoding.fill.value;
        expect(g.gradient).toBe('linear');
        expect(g.stops[0].color).toMatch(/^rgba\(1, 118, 211, /);
        expect(g.stops[1].color).toBe('rgba(1, 118, 211, 0)');
    });

    it('keeps stacked bands solid and says so', () => {
        const spec: any = assembleVegaLite({
            data: { values: years(3) }, semantic_types: { Year: 'Year', Source: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Area Chart', encodings: { x: 'Year', y: 'Value', color: 'Source' } }, theme_spec: withGeometry({ area: { fill: 'fade' } }),
        } as any);
        expect(nodes(spec).some((n) => n.encoding?.fill?.condition)).toBe(false);
        expect(spec._theme.report.some((r: any) => r.code === 'area-fade-not-applied')).toBe(true);
    });

    it('puts a tint of the line’s ink under a single line, beneath it and out of reach of the pointer', () => {
        const spec: any = singleLine(withGeometry({ line: { wash: 'tint' } }));
        const all = nodes(spec);
        const washIndex = all.findIndex((n) => n.__themeRole === 'line-wash');
        const lineIndex = all.findIndex((n) => type(n) === 'line' && !n.__themeSynthetic);
        expect(washIndex).toBeGreaterThanOrEqual(0);
        expect(washIndex).toBeLessThan(lineIndex);
        const wash = all[washIndex];
        expect(wash.mark).toMatchObject({ type: 'area', interactive: false });
        expect(wash.encoding.fill.value).toBe('rgba(1, 118, 211, 0.12)');
        expect(wash.encoding.tooltip).toBeNull();
    });

    it('gives each of several lines a fade of its own ink', () => {
        const spec: any = lineChart(3, withGeometry({ line: { wash: 'fade' } }));
        const wash = nodes(spec).find((n) => n.__themeRole === 'line-wash');
        expect(wash.encoding.y.stack).toBeNull();
        expect(wash.encoding.fill.condition).toHaveLength(3);
        // The wash has no colour channel: sharing the line's scale would share (and could hide) its key.
        expect(wash.encoding.color).toBeUndefined();
        expect(wash.encoding.detail.field).toBe('Source');
        const line = nodes(spec).find((n) => type(n) === 'line' && !n.__themeSynthetic);
        expect(line.encoding.color.legend).not.toBeNull();
    });

    it('draws nothing new for a house that asks for neither', () => {
        expect(nodes(singleLine(base)).some((n) => n.__themeRole === 'line-wash')).toBe(false);
        expect(nodes(singleArea(base)).find((n) => type(n) === 'area').encoding.fill).toBeUndefined();
    });
});

describe('R13: pattern fills for the texture channel', () => {
    const MEDALS = ['Gold', 'Silver', 'Bronze'];
    const medalRows = ['USA', 'China', 'Japan'].flatMap((Country, c) => MEDALS.map((Medal, m) => ({ Country, Medal, Count: 40 - c * 10 - m * 3 })));
    const grouped = (marks: ThemeSpec['marks']) => assembleVegaLite({
        data: { values: medalRows },
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Count' },
        chart_spec: { chartType: 'Grouped Bar Chart', encodings: { x: 'Country', y: 'Count', group: 'Medal' } },
        theme_spec: { id: 'tex', ink: { series: { categorical: ['#226092', '#7c6fb0', '#6e9a3c'] } }, marks },
    } as any);
    const bars = (spec: any): any[] => {
        const out: any[] = [];
        const visit = (n: any) => {
            if (!n || typeof n !== 'object') return;
            if ((typeof n.mark === 'string' ? n.mark : n.mark?.type) === 'bar') out.push(n);
            for (const c of [...(n.layer ?? []), n.spec].filter(Boolean)) visit(c);
        };
        visit(spec);
        return out;
    };

    it('gives each series its own pattern in its own ink, outlined in a darker shade', () => {
        const spec: any = grouped({ redundantEncoding: 'always', redundantChannels: ['texture'] });
        const [bar] = bars(spec);
        expect(bar.encoding.color).toBeUndefined();
        expect(bar.encoding.fill.scale.range).toHaveLength(3);
        for (const url of bar.encoding.fill.scale.range) expect(url).toMatch(/^url\(#flint-tex-/);
        expect(bar.encoding.stroke.field).toBe(bar.encoding.fill.field);
        const patterns = spec.usermeta.flintPatterns;
        expect(patterns.map((p: any) => p.kind)).toEqual(['diagonal', 'antidiagonal', 'horizontal']);
        expect(patterns.map((p: any) => p.background)).toEqual(['#226092', '#7c6fb0', '#6e9a3c']);
    });

    it('hatches every series alike when the house says so', () => {
        const spec: any = grouped({ redundantEncoding: 'always', redundantChannels: ['texture'], texture: { pattern: 'hatch', ink: 'white' } });
        expect(new Set(spec.usermeta.flintPatterns.map((p: any) => p.kind))).toEqual(new Set(['diagonal']));
        expect(spec.usermeta.flintPatterns[0].line).toMatch(/^rgba\(255/);
    });

    it('hatches a single series too, when the house asks for texture always', () => {
        const spec: any = assembleVegaLite({
            data: { values: SIGNED_ROWS }, semantic_types: { Year: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Year', y: 'Value' } },
            theme_spec: { id: 'one', ink: { series: { single: '#226092' } }, marks: { redundantEncoding: 'always', redundantChannels: ['texture'], texture: { pattern: 'hatch' } } },
        } as any);
        expect(bars(spec)[0].mark.fill).toMatch(/^url\(#flint-tex-/);
    });

    it('takes the house’s own pattern sequence, a solid entry leaving a flat fill', () => {
        const spec: any = grouped({ redundantEncoding: 'always', redundantChannels: ['texture'], texture: { patterns: ['solid', 'dots', 'diagonal'], ink: 'white' } });
        const range = bars(spec)[0].encoding.fill.scale.range;
        expect(range[0]).toBe('#226092');
        expect(range[1]).toMatch(/^url\(#flint-tex-/);
        expect(spec.usermeta.flintPatterns.map((p: any) => p.kind)).toEqual(['dots', 'diagonal']);
    });

    it('leaves a single series flat when its pattern is solid', () => {
        const spec: any = assembleVegaLite({
            data: { values: SIGNED_ROWS }, semantic_types: { Year: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Year', y: 'Value' } },
            theme_spec: { id: 'one', ink: { series: { single: '#226092' } }, marks: { redundantEncoding: 'always', redundantChannels: ['texture'], texture: { patterns: ['solid', 'dots'] } } },
        } as any);
        expect(spec.usermeta?.flintPatterns).toBeUndefined();
        expect(bars(spec)[0].mark.stroke).toBeUndefined();
    });

    it('keeps each wedge its own ink when the colour is shared with a label layer', () => {
        const spec: any = assembleVegaLite({
            data: { values: [{ B: 'Chrome', S: 64 }, { B: 'Safari', S: 19 }, { B: 'Edge', S: 9 }, { B: 'Firefox', S: 8 }] },
            semantic_types: { B: 'Category', S: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'B', size: 'S' } },
            theme_spec: {
                id: 'pie', ink: { series: { categorical: ['#226092', '#7c6fb0', '#6e9a3c', '#b0563c'] } },
                marks: { redundantEncoding: 'always', redundantChannels: ['texture'], texture: { pattern: 'hatch' } },
                dataLabels: { show: 'always' },
            },
        } as any);
        const arcs: any[] = [];
        const visit = (n: any) => {
            if (!n || typeof n !== 'object') return;
            if ((typeof n.mark === 'string' ? n.mark : n.mark?.type) === 'arc') arcs.push(n);
            for (const c of [...(n.layer ?? []), n.spec].filter(Boolean)) visit(c);
        };
        visit(spec);
        expect(spec.layer?.length).toBeGreaterThan(1);
        expect(arcs).toHaveLength(1);
        expect(arcs[0].mark.fill).toBeUndefined();
        expect(arcs[0].encoding.fill.field).toBe('B');
        expect(new Set(spec.usermeta.flintPatterns.map((p: any) => p.background)).size).toBe(4);
    });

    it('keeps a house separator (a slice gap) and turns only the ink outline darker per series', () => {
        const pie: any = assembleVegaLite({
            data: { values: [{ B: 'Chrome', S: 64 }, { B: 'Safari', S: 19 }, { B: 'Edge', S: 17 }] },
            semantic_types: { B: 'Category', S: 'Quantity' },
            chart_spec: { chartType: 'Pie Chart', encodings: { color: 'B', size: 'S' } },
            theme_spec: {
                id: 'gap', ink: { surface: { canvas: '#ffffff' }, series: { categorical: ['#226092', '#7c6fb0', '#6e9a3c'] } },
                marks: { slice: { gap: 2, gapStyle: 'rule' }, redundantEncoding: 'always', redundantChannels: ['texture'], texture: { patterns: ['solid', 'diagonal', 'dots'] } },
            },
        } as any);
        const arc = [pie, ...(pie.layer ?? [])].find((n: any) => (typeof n.mark === 'string' ? n.mark : n.mark?.type) === 'arc');
        expect(arc.mark.stroke).toBe('#ffffff');
        expect(arc.encoding.stroke).toBeUndefined();
        expect(arc.encoding.fill.scale.range[1]).toMatch(/^url\(/);

        const outlined: any = grouped({ outline: { presence: 'hairline', weight: 1, source: 'ink' }, redundantEncoding: 'always', redundantChannels: ['texture'] });
        const [bar] = bars(outlined);
        expect(bar.mark.stroke).toBeUndefined();
        expect(bar.encoding.stroke.scale.range).toHaveLength(3);
    });

    it('writes the patterns into the SVG’s defs, ahead of the marks that use them', async () => {
        const { injectCanvasFurnitureSVG } = await import('../src/vegalite/canvas-furniture');
        const svg = injectCanvasFurnitureSVG('<svg width="100" height="50"><rect fill="url(#p)"/></svg>', [], [{ id: 'p', kind: 'cross', background: '#226092', line: '#123456', spacing: 6 }]);
        expect(svg.indexOf('<defs><pattern id="p"')).toBeLessThan(svg.indexOf('url(#p)'));
        expect(svg).toContain('patternTransform="rotate(45)"');
    });

    it('adds nothing for a house that does not ask for texture', () => {
        const spec: any = grouped({});
        expect(spec.usermeta?.flintPatterns).toBeUndefined();
        expect(bars(spec)[0].encoding.color).toBeDefined();
    });
});
