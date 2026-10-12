import { describe, expect, it } from 'vitest';
import { generatedVegaLiteCases } from './generated-inputs';
import { vegaLiteHonour, vegaLiteStages } from '../src/vegalite/assemble';
import { vegaLiteDepartures } from '../src/vegalite/honour';

/** Decisions a template makes for itself that the plan also makes; the template's value is drawn. */
const TEMPLATE_OWNED: Array<{ chartType: string; decision: string; reason: string }> = [
    { chartType: 'Bar Table', decision: 'axisLabels.y.', reason: 'its name column is a composite view it labels itself' },
    { chartType: 'Bar Table', decision: 'orders.y', reason: 'it ranks the rows itself' },
    { chartType: 'Bar Table', decision: 'furniture.facets.independentY', reason: 'its panels are a composite that resolves its own scales' },
    { chartType: 'Sparkline', decision: 'furniture.facets.independentY', reason: 'each strip is scaled to its own series' },
]

describe('the plan as drawn', () => {
    // Every decision the plan makes is drawn as made, except those listed above.
    it('draws what the plan decided, for every test case and theme', () => {
        const departures: string[] = [];
        const used = new Set<(typeof TEMPLATE_OWNED)[number]>();
        for (const { section, testCase, theme, input } of generatedVegaLiteCases()) {
            for (const departure of vegaLiteHonour(input)) {
                const known = TEMPLATE_OWNED.find((entry) => entry.chartType === testCase.chartType && departure.decision.startsWith(entry.decision));
                if (known) {
                    used.add(known);
                    continue;
                }
                departures.push(`${section} | ${testCase.title} | ${theme ?? 'none'} | ${departure.decision}${departure.at ? ` at ${departure.at}` : ''}: `
                    + `${JSON.stringify(departure.planned)} planned, ${JSON.stringify(departure.drawn)} drawn`);
            }
        }
        expect(departures).toEqual([]);
        expect(TEMPLATE_OWNED.filter((entry) => !used.has(entry))).toEqual([]);
    }, 300_000);

    it('reads a spec that departs from the plan', () => {
        const values = ['North', 'South', 'East', 'West'].flatMap((Region, index) =>
            ['Bikes', 'Cars'].map((Product, offset) => ({ Region, Product, Sales: 100 * (index + 1) + 40 * offset })));
        const { plan, spec } = vegaLiteStages({
            data: { values },
            semantic_types: { Region: 'Category', Product: 'Category', Sales: 'Quantity' },
            theme_spec: 'nyt',
            chart_spec: { chartType: 'Grouped Bar Chart', encodings: { x: 'Region', y: 'Sales', color: 'Product' } },
        } as any);
        const fields = { x: 'Region', y: 'Sales', color: 'Product' };
        expect(vegaLiteDepartures(plan, spec, true, fields)).toEqual([]);
        const altered = JSON.parse(JSON.stringify(spec));
        altered.config.axisX.labelFontSize = plan.axisLabels.x.fontSize + 3;
        const walk = (node: any): void => {
            if (!node || typeof node !== 'object') return;
            if (node.encoding?.y?.axis?.values) node.encoding.y.axis.values = node.encoding.y.axis.values.slice(1);
            if (node.encoding?.color?.legend) node.encoding.color.legend.orient = 'left';
            for (const child of [...(node.layer ?? []), ...(node.vconcat ?? []), node.spec].filter(Boolean)) walk(child);
        };
        walk(altered);
        const decisions = vegaLiteDepartures(plan, altered, false, fields).map((departure) => departure.decision);
        expect(decisions).toEqual(expect.arrayContaining(['axisLabels.x.fontSize', 'rulers.y.values', 'legend.keys.color.orient', 'plot']));
    });
});
