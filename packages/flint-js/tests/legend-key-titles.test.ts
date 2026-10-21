import { describe, expect, it } from 'vitest';
import { assembleVegaLite, vegaLiteStages } from '../src/vegalite/assemble';
import { assemblePlotly } from '../src';
import { THEME_PRESETS } from '../src/core/theme/presets';

const PENGUINS = ['Adelie', 'Chinstrap', 'Gentoo'].flatMap((Species, s) => ['Male', 'Female'].flatMap((Sex, x) =>
    [0, 1, 2, 3, 4].map((k) => ({ Species, Sex, Flipper: 180 + s * 15 + k * 3 + x, Mass: 3200 + s * 900 + k * 120 + x * 300 }))));

const penguins = (canvasSize: { width: number; height: number }, theme: unknown = 'economist') => ({
    data: { values: PENGUINS },
    semantic_types: { Species: 'Category', Sex: 'Category', Flipper: 'Quantity', Mass: 'Quantity' },
    chart_spec: { chartType: 'Scatter Plot', title: 'Penguins', encodings: { x: 'Flipper', y: 'Mass', color: 'Species', shape: 'Sex' }, canvasSize },
    theme_spec: theme,
}) as any;

const BUBBLES = ['Asia', 'Europe', 'Africa', 'Americas'].flatMap((Region, r) => [0, 1, 2, 3, 4, 5].map((k) => ({
    Country: `${Region} ${k}`, Region, GDP: 800 * 2 ** (r + k * 0.6), Life: 48 + r * 6 + k * 3, Population: 5 + r * 120 + k * 90,
})));

describe('keys that share a row above the plot', () => {
    it.each([
        { width: 400, height: 520 },
        { width: 560, height: 380 },
        { width: 800, height: 420 },
    ])('seat their titles alike, so neither reads as wrapped beside the other (%j)', (canvasSize) => {
        const { plan } = vegaLiteStages(penguins(canvasSize));
        const layout = plan.legend.layout!;
        for (const edge of layout.edges.filter((e) => (e.orient === 'top' || e.orient === 'bottom') && e.direction === 'horizontal')) {
            const keys = layout.keys.filter((key) => key?.orient === edge.orient);
            expect(new Set(keys.map((key) => key!.inlineTitle)).size).toBe(1);
        }
    });
});

describe('a key title\'s type', () => {
    it('reads in the secondary ink and bold where the house styles neither key nor axis titles', () => {
        const spec: any = assembleVegaLite(penguins({ width: 560, height: 380 }, 'nyt'));
        const ink = (THEME_PRESETS.nyt.spec as any).ink.text;
        expect(spec.config.legend.titleColor).toBe(ink.secondary);
        expect(spec.config.legend.titleColor).not.toBe(ink.muted);
        expect(spec.config.legend.titleFontWeight).toBe(700);
        expect(spec.config.legend.titleFontSize).toBe(spec.config.legend.labelFontSize);
    });

    it.each(['economist', 'swiss', 'material'])('takes the face and ink the house sets axis titles in (%s), never lighter than bold', (id) => {
        // The Economist sets axis titles in its regular weight: a key title in that weight, face, size
        // and ink would read as one more entry, so it keeps to bold.
        const spec: any = assembleVegaLite(penguins({ width: 560, height: 380 }, id));
        const axisTitle = (THEME_PRESETS as any)[id].spec.type.axisTitle;
        expect(spec.config.legend.titleFontWeight).toBe(700);
        expect(spec.config.legend.titleColor).toBe(axisTitle.color ?? spec.config.legend.titleColor);
        expect(spec.config.legend.titleFontSize).toBe(spec.config.legend.labelFontSize);
    });

    it('takes a lighter weight only where the house sets it on key titles', () => {
        const spec: any = assembleVegaLite(penguins({ width: 560, height: 380 }, { extends: 'economist', type: { keyTitle: { weight: 'regular' } } }));
        expect(spec.config.legend.titleFontWeight).toBe(400);
    });

    it('takes the house\'s keyTitle role', () => {
        const theme = { extends: 'economist', type: { keyTitle: { color: '#123456', weight: 'regular', size: 14, style: 'italic' } } };
        const spec: any = assembleVegaLite(penguins({ width: 560, height: 380 }, theme));
        expect(spec.config.legend).toMatchObject({ titleColor: '#123456', titleFontWeight: 400, titleFontStyle: 'italic' });
        expect(spec.config.legend.titleFontSize).toBeGreaterThan(spec.config.legend.labelFontSize);
    });
});

describe('a key title in Plotly', () => {
    it('takes the house\'s keyTitle role too', () => {
        const theme = { extends: 'economist', type: { keyTitle: { color: '#123456' } } };
        const figure: any = assemblePlotly(penguins({ width: 560, height: 380 }, theme));
        expect(figure.layout.legend?.title?.font?.color).toBe('#123456');
    });
});

describe('a colour ramp\'s title', () => {
    it('stays where the headline and an axis name its field: its labels are numbers', () => {
        const spec: any = assembleVegaLite({
            data: { values: BUBBLES },
            semantic_types: { Country: 'Country', Region: 'Category', GDP: 'Amount', Life: 'Quantity', Population: 'Quantity' },
            chart_spec: {
                chartType: 'Scatter Plot', title: 'Income and life', encodings: { x: 'GDP', y: 'Life', color: 'Life', size: 'Population' },
                canvasSize: { width: 560, height: 380 },
            },
            theme_spec: 'economist',
        } as any);
        const color = spec.encoding?.color ?? spec.layer?.find((layer: any) => layer.encoding?.color)?.encoding.color;
        expect(color.legend?.title).not.toBeNull();
        expect(spec.config.legend.title).not.toBeNull();
    });
});

describe('several keys', () => {
    const COUNTRIES = ['Asia', 'Europe', 'Africa', 'Americas', 'Oceania'].flatMap((Continent, c) => [0, 1, 2].map((k) => ({
        Country: `${Continent} ${k}`, Continent, Income: ['Low income', 'Middle income', 'High income'][k],
        GDP: 900 * 2 ** (c + k), Life: 50 + c * 5 + k * 4, Population: 10 + c * 150 + k * 60,
    })));
    const titlesOf = (encodings: Record<string, string>) => {
        const spec: any = assembleVegaLite({
            data: { values: COUNTRIES },
            semantic_types: { Country: 'Country', Continent: 'Category', Income: 'Category', GDP: 'Amount', Life: 'Quantity', Population: 'Quantity' },
            chart_spec: { chartType: 'Scatter Plot', title: 'Income and life expectancy, 2007', encodings, canvasSize: { width: 400, height: 520 } },
            theme_spec: 'economist',
        } as any);
        const titles: Record<string, unknown> = {};
        JSON.stringify(spec, (key, value) => {
            if (['color', 'shape', 'size'].includes(key) && value?.field && !(key in titles)) titles[key] = value.legend?.title;
            return value;
        });
        return { titles, config: spec.config.legend };
    };

    it('each carry a title, so one key\'s names do not run on into the next\'s', () => {
        const { titles, config } = titlesOf({ x: 'GDP', y: 'Life', color: 'Continent', shape: 'Income', size: 'Population' });
        expect(titles.color).not.toBeNull();
        expect(titles.shape).not.toBeNull();
        expect(titles.size).not.toBeNull();
        expect(config.title).not.toBeNull();
    });

    it('leaves a key alone untitled where its names say what they are', () => {
        const { titles } = titlesOf({ x: 'GDP', y: 'Life', color: 'Continent' });
        expect(titles.color).toBeNull();
    });
});
