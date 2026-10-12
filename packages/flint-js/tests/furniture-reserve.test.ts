import { describe, expect, it } from 'vitest';
import { openVegaLiteSession, vegaLiteStages } from '../src/vegalite/assemble';
import type { ChartAssemblyInput } from '../src/core/types';

const months = Array.from({ length: 6 }, (_, index) => ({ Month: `2025-0${index + 1}`, Change: index === 0 ? 400_000 : index % 3 === 0 ? -120_000 : 180_000 }));

const chart = (chartType: string, size: Partial<ChartAssemblyInput['chart_spec']>, values: any[] = months): ChartAssemblyInput => ({
    data: { values },
    semantic_types: { Month: 'Category', Change: 'Quantity' },
    theme_spec: 'powerbi',
    chart_spec: { chartType, encodings: { x: 'Month', y: 'Change' }, ...size },
    options: { themeDecisions: true },
});

const roomy = { baseSize: { width: 440, height: 440 }, canvasSize: { width: 720, height: 440 } };

describe('room kept for the furniture', () => {
    it('keeps none where no banded axis fits its steps to the room', () => {
        const { plan } = vegaLiteStages(chart('Bar Chart', { baseSize: { width: 440, height: 440 } }));
        expect(plan.layout.xStepFitted).toBe(false);
        expect(plan.reserve).toBeUndefined();
    });

    it('measures the tick labels and the key beside the plot, and fits the bands to what is left', () => {
        const { plan } = vegaLiteStages(chart('Waterfall Chart', roomy));
        expect(plan.layout.xStepFitted).toBe(true);
        const reserve = plan.reserve!;
        expect(reserve.parts.yLabels).toBeGreaterThan(0);
        expect(reserve.parts.sideKeys).toBeGreaterThan(0);
        expect(reserve.width).toBe(Math.ceil(Object.values(reserve.parts).reduce((sum, part) => sum + (part ?? 0), 0)));
        expect(reserve.height).toBe(0);
        expect(plan.options.bandStepFitCapacityX).toBe(720 - reserve.width);
    });

    it('gives the bands of a chart without a key the room a key would take', () => {
        const bar = vegaLiteStages(chart('Bar Chart', roomy)).plan;
        const waterfall = vegaLiteStages(chart('Waterfall Chart', roomy)).plan;
        expect(bar.reserve!.parts.sideKeys).toBeUndefined();
        expect(bar.layout.xStep).toBeGreaterThan(waterfall.layout.xStep);
    });

    it('holds the room on a replan, so the rows in view do not move the bands through it', () => {
        const values = [{ Month: 'A', Change: 1_000_000 }, ...['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((Month, index) => ({ Month, Change: index + 1 }))];
        const session = openVegaLiteSession(chart('Bar Chart', roomy, values));
        const replanned = session.replan({ keep: (row: any) => row.Month !== 'A' });
        const fresh = vegaLiteStages(chart('Bar Chart', roomy, values.slice(1)));
        const step = (spec: any) => spec._theme.decisions.layout.xStep;
        expect(step(replanned.spec)).toBeLessThan(fresh.plan.layout.xStep);
        expect(step(fresh.spec)).toBe(fresh.plan.layout.xStep);
    });
});
