import { describe, expect, it } from 'vitest';
import { vegaLiteTable } from '../src/vegalite/assemble';
import { chartTableRowTest } from '../src/core/chart-table';
import type { ChartAssemblyInput } from '../src/core/types';

const sales = [
    { region: 'Europe', product: 'A', revenue: 1200.5 },
    { region: 'Europe', product: 'B', revenue: 800 },
    { region: 'Asia', product: 'A', revenue: 950.25 },
];

const texts = (table: ReturnType<typeof vegaLiteTable>) => table.rows.map((row) => row.map((cell) => cell.text));

describe('vegaLiteTable', () => {
    it('shows the aggregated rows the chart draws, measures titled as the chart titles them', () => {
        const table = vegaLiteTable({
            data: { values: sales },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: { field: 'region' }, y: { field: 'revenue', aggregate: 'sum' } } },
        } as ChartAssemblyInput);
        expect(table.columns.map((column) => column.field)).toEqual(['region', 'revenue_sum']);
        expect(table.columns[1].align).toBe('end');
        expect(table.rows).toHaveLength(2);
        const europe = table.rows.find((row) => row[0].value === 'Europe')!;
        expect(europe[1].order).toBeCloseTo(2000.5);
        expect(europe[1].text).toBe('2,000.50');
    });

    it('titles a count Count', () => {
        const table = vegaLiteTable({
            data: { values: sales },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: { field: 'region' }, y: { aggregate: 'count' } } },
        } as ChartAssemblyInput);
        expect(table.columns.map((column) => column.title)).toEqual(['region', 'Count']);
        expect(texts(table)).toContainEqual(['Europe', '2']);
    });

    it('lists categories before measures and gives a field drawn twice one column', () => {
        const table = vegaLiteTable({
            data: { values: sales },
            chart_spec: { chartType: 'Grouped Bar Chart', encodings: { x: { field: 'region' }, y: { field: 'revenue' }, color: { field: 'product' }, group: { field: 'product' } } },
        } as ChartAssemblyInput);
        expect(table.columns.map((column) => column.field)).toEqual(['region', 'product', 'revenue']);
        expect(table.columns.find((column) => column.field === 'product')!.channels.length).toBeGreaterThanOrEqual(1);
    });

    it('names the columns a static-series fold creates', () => {
        const table = vegaLiteTable({
            data: { values: [{ year: '2020', north: 3, south: 5 }, { year: '2021', north: 4, south: 6 }] },
            chart_spec: { chartType: 'Line Chart', encodings: { x: { field: 'year' }, y: [{ field: 'north' }, { field: 'south' }] } },
        } as unknown as ChartAssemblyInput);
        expect(table.columns.map((column) => column.title)).toEqual(expect.arrayContaining(['Series', 'Value']));
        expect(table.rows).toHaveLength(4);
    });

    it('prints dates as the data writes them and orders them by time', () => {
        const table = vegaLiteTable({
            data: { values: [{ day: '2025-03-02', n: 1 }, { day: '2025-01-15', n: 2 }] },
            semantic_types: { day: 'Date', n: 'Count' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: { field: 'day' }, y: { field: 'n' } } },
        } as ChartAssemblyInput);
        const day = table.rows.map((row) => row[0]);
        expect(day.map((cell) => cell.text)).toEqual(['2025-03-02', '2025-01-15']);
        expect(day[0].order).toBeGreaterThan(day[1].order as number);
    });

    it('prints timestamps in the chart\'s date format', () => {
        const table = vegaLiteTable({
            data: { values: [{ day: Date.UTC(2025, 0, 15), n: 1 }, { day: Date.UTC(2025, 2, 2), n: 2 }] },
            semantic_types: { day: 'Date', n: 'Count' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: { field: 'day' }, y: { field: 'n' } } },
        } as ChartAssemblyInput);
        expect(table.rows[0][0].text).not.toMatch(/^\d{12,}$/);
        expect(table.rows[0][0].text).toMatch(/2025|Jan/);
    });

    it('keeps only the rows the chart kept when it cut categories to fit', () => {
        const teams = Array.from({ length: 120 }, (_, i) => ({ team: `Team ${i + 1}`, goals: 200 - i }));
        const table = vegaLiteTable({
            data: { values: teams },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: { field: 'team' }, y: { field: 'goals' } }, baseSize: { width: 200, height: 160 }, canvasSize: { width: 200, height: 160 } },
        } as ChartAssemblyInput);
        expect(table.total).toBe(120);
        expect(table.rows.length).toBeLessThan(120);
    });

    it('says what the chart computes from the rows it lists', () => {
        const values = Array.from({ length: 30 }, (_, i) => ({ group: i % 2 ? 'a' : 'b', score: (i * 7) % 23 }));
        const of = (chartType: string, encodings: Record<string, unknown>) =>
            vegaLiteTable({ data: { values }, chart_spec: { chartType, encodings } } as ChartAssemblyInput).computes;
        expect(of('Histogram', { x: { field: 'score' } })).toContain('count');
        expect(of('Boxplot', { x: { field: 'group' }, y: { field: 'score' } })).toContain('summary');
        expect(of('Bar Chart', { x: { field: 'group' }, y: { field: 'score', aggregate: 'sum' } })).toEqual([]);
    });

    it('takes its surface, type and inks from the theme', () => {
        const input = {
            data: { values: sales },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: { field: 'region' }, y: { field: 'revenue' } } },
        } as ChartAssemblyInput;
        const plain = vegaLiteTable(input).style;
        const dark = vegaLiteTable({ ...input, theme_spec: 'powerbi' }).style;
        const nyt = vegaLiteTable({ ...input, theme_spec: 'nyt' }).style;
        expect(dark.background).toBe('#1b1a19');
        expect(dark.body.color).not.toBe(plain.body.color);
        expect(nyt.body.font).toMatch(/Helvetica/);
        for (const style of [plain, dark, nyt]) {
            expect(style.body.fontSize).toBeGreaterThanOrEqual(11);
            expect(style.rule).toMatch(/^#/);
        }
    });

    it('names the rows a selection names, dates compared as the chart compares them', () => {
        const table = vegaLiteTable({
            data: { values: [{ year: 2023, n: 1 }, { year: 2024, n: 2 }, { year: 2025, n: 3 }] },
            semantic_types: { year: 'Year', n: 'Count' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: { field: 'year' }, y: { field: 'n' } } },
        } as ChartAssemblyInput);
        const held = Date.UTC(2024, 0, 1);
        const key = chartTableRowTest(table, { select: { key: { year: held } } })!;
        expect(table.rows.map((_row, i) => key(i))).toEqual([false, true, false]);
        const range = chartTableRowTest(table, { select: { where: { year: { range: ['2024', '2025'] } } } })!;
        expect(table.rows.map((_row, i) => range(i))).toEqual([false, true, true]);
        expect(chartTableRowTest(table, { select: { key: { region: 'Asia' } } })).toBeNull();
    });
});
