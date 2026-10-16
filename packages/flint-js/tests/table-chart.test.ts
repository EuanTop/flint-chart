import { describe, expect, it } from 'vitest';
import { assembleVegaLite, vegaLiteTable } from '../src/vegalite/assemble';
import { drawsAsTable } from '../src/vegalite/templates';
import { validateChart } from '../src/validate';
import type { ChartAssemblyInput } from '../src/core/types';

const staff = Array.from({ length: 300 }, (_, i) => ({
    name: `Person ${i}`,
    joined: `2024-0${1 + (i % 9)}-15`,
    salary: 50000 + i * 37.5,
    city: ['Paris', 'Rome', 'Oslo'][i % 3],
}));
const table = (extra: Partial<ChartAssemblyInput> = {}): ChartAssemblyInput => ({
    data: { values: staff },
    semantic_types: { joined: 'Date', salary: 'Amount' },
    chart_spec: { chartType: 'Table', encodings: {} },
    ...extra,
} as ChartAssemblyInput);

describe('Table chart type', () => {
    it('is drawn as a table by hosts with a page', () => {
        expect(drawsAsTable('Table')).toBe(true);
        expect(drawsAsTable('Bar Chart')).toBe(false);
    });

    it('lists every row, its fields as columns in the order the rows hold them', () => {
        const t = vegaLiteTable(table({ field_display_names: { salary: 'Salary' } }));
        expect(t.columns.map((column) => column.title)).toEqual(['name', 'joined', 'Salary', 'city']);
        expect(t.rows).toHaveLength(300);
        expect(t.rows[1][2].text).toBe('50,037.50');
        expect(t.columns[1].type).toBe('temporal');
    });

    it('sets its text in the theme\'s roles', () => {
        const nyt = vegaLiteTable(table({ theme_spec: 'nyt' })).style;
        const dark = vegaLiteTable(table({ theme_spec: 'powerbi' })).style;
        expect(nyt.body.font).toMatch(/Helvetica/);
        expect(dark.background).toBe('#1b1a19');
        expect(dark.body.color).not.toBe(nyt.body.color);
    });

    it('compiles to a grid of text for static output, with the rows that do not fit counted', () => {
        const spec = assembleVegaLite(table({ theme_spec: 'powerbi' }));
        const texts = spec.data.values as { text: string; header: boolean }[];
        expect(texts.filter((text) => text.header).map((text) => text.text)).toEqual(['name', 'joined', 'salary', 'city']);
        expect(texts.some((text) => /^\+\d+ more rows$/.test(text.text))).toBe(true);
        const cells = spec.layer.find((layer: any) => layer.transform?.[0]?.filter === '!datum.header');
        expect(cells.mark.fill).toBeDefined();
        expect(JSON.stringify(spec)).not.toContain('__tableRole');
    });

    it('validates with no encodings, refuses encodings, and drops interactions with a reason', () => {
        expect(validateChart(table(), 'vegalite').valid).toBe(true);
        const encoded = validateChart(table({ chart_spec: { chartType: 'Table', encodings: { x: { field: 'name' } } } } as any), 'vegalite');
        expect(encoded.errors[0].message).toMatch(/takes no encodings/);
        const interactive = validateChart(table({ interaction_spec: { interactions: [{ type: 'click-highlight' }] } } as any), 'vegalite');
        expect(interactive.warnings.some((warning) => /dropped/.test(warning.message))).toBe(true);
    });

    it('lets updates name its rows, dates compared as time', () => {
        const check = validateChart(table(), 'vegalite', { updates: [{ id: 'pick', ops: [{
            op: 'set-style', targets: [{ select: { where: { joined: { range: ['2024-02-01', '2024-03-01'] } } } }], value: { state: 'emphasized' },
        }] }] });
        expect(check.updates?.[0].ops[0].ok).toBe(true);
    });
});
