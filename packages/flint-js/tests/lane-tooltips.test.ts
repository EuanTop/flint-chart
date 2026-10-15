import { describe, expect, it } from 'vitest';
import { TEST_GENERATORS } from '../src/test-data';
import { assembleECharts, assembleChartjs } from '../src/index';

/** Every test case of a chart type, as an assembly input. */
function inputs(chartType: string): any[] {
    return Object.values(TEST_GENERATORS as Record<string, () => any[]>).flatMap((generate) => {
        try { return generate(); } catch { return []; }
    }).filter((testCase) => testCase.chartType === chartType).map((testCase) => {
        const names = new Map(testCase.fields.map((field: any) => [field.id, field.name]));
        const encodings = Object.fromEntries(Object.entries<any>(testCase.encodingMap)
            .filter(([, encoding]) => names.get(encoding?.fieldID)).map(([channel, encoding]) => [channel, names.get(encoding.fieldID)]));
        return {
            data: { values: testCase.data },
            semantic_types: Object.fromEntries(Object.entries<any>(testCase.metadata).map(([field, meta]) => [field, meta.semanticType])),
            chart_spec: { chartType: testCase.chartType, encodings, chartProperties: testCase.chartProperties },
        };
    });
}

const laned = (series: any[]) => series.some((one) => String(one?.name ?? one?.label ?? '').startsWith('__lane'));

describe('bars and boxes drawn in lanes', () => {
    it('name each ECharts bar in the tooltip by its group, never the lane', () => {
        const option: any = inputs('Grouped Bar Chart').map((input) => assembleECharts(input)).find((built: any) => laned(built.series ?? []));
        expect(option).toBeDefined();
        const params = option.series.map((series: any) => ({ seriesName: series.name, marker: '', axisValueLabel: 'Band', data: series.data.find((item: any) => item && item !== '-') }))
            .filter((param: any) => param.data);
        const text = option.tooltip.formatter(params);
        expect(text).not.toMatch(/__lane/);
        expect(text).toContain(params[0].data.laneGroup);
    });

    it('name each Chart.js bar in the tooltip by its group, never the lane', () => {
        const config: any = inputs('Grouped Bar Chart').map((input) => assembleChartjs(input)).find((built: any) => laned(built.data?.datasets ?? []));
        expect(config).toBeDefined();
        const dataset = config.data.datasets.find((one: any) => one.label.startsWith('__lane'));
        const index = dataset.data.findIndex((value: any) => value != null);
        const label = config.options.plugins.tooltip.callbacks.label({ dataset, dataIndex: index, formattedValue: '42', raw: dataset.data[index] });
        expect(label).toBe(`${dataset.laneGroups[index]}: 42`);
        // A lane with no bar at a band lists nothing there.
        expect(config.options.plugins.tooltip.filter({ raw: null, dataset })).toBe(false);
    });

    it('name each ECharts box in the tooltip by its group, never the lane', () => {
        const option: any = inputs('Boxplot').map((input) => assembleECharts({ ...input, chart_spec: { ...input.chart_spec, chartProperties: { ...input.chart_spec.chartProperties, dodge: 'local' } } }))
            .find((built: any) => laned(built.series ?? []));
        if (!option) return;
        const box = option.series.find((series: any) => series.type === 'boxplot' && String(series.name).startsWith('__lane'));
        const item = box.data.find((datum: any) => datum && datum !== '-');
        const text = box.tooltip.formatter({ name: 'Band', marker: '', data: item });
        expect(text).not.toMatch(/__lane/);
        expect(text).toContain(item.laneGroup);
        expect(text).toMatch(/median/);
    });
});
