import { describe, expect, it } from 'vitest';
import { openVegaLiteSession } from '../src/vegalite/assemble';
import type { ChartAssemblyInput } from '../src/core/types';

const teams = Array.from({ length: 40 }, (_, index) => ({ Team: `Team number ${index + 1}`, Goals: 40 - index }));

const crowded: ChartAssemblyInput = {
    data: { values: teams },
    semantic_types: { Team: 'Country', Goals: 'Count' },
    theme_spec: 'datawrapper',
    chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Team', y: 'Goals' }, baseSize: { width: 360, height: 240 }, canvasSize: { width: 360, height: 240 } },
};

/** Every x axis config the emitted spec states, wherever it sits. */
function xAxes(spec: any): any[] {
    const found: any[] = [];
    const walk = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (node.x?.axis && typeof node.x.axis === 'object') found.push(node.x.axis);
        if (node.axisX) found.push(node.axisX);
        Object.values(node).forEach(walk);
    };
    walk(spec);
    return found;
}

describe('pinned axis labels', () => {
    it('leaves the plan alone when nothing is pinned', () => {
        const free = openVegaLiteSession(structuredClone(crowded));
        const empty = openVegaLiteSession(structuredClone(crowded), { pins: { axisLabels: {} } });
        expect(JSON.stringify(empty.spec)).toBe(JSON.stringify(free.spec));
    });

    it('holds a pinned size and angle on a crowded axis, and drops the crowding note', () => {
        const free = openVegaLiteSession(structuredClone(crowded));
        expect(free.axisLabels.x.crowdedFrom).toBeDefined();
        expect(free.axisLabels.x.angle).not.toBe(0);

        const pinned = openVegaLiteSession(structuredClone(crowded), { pins: { axisLabels: { x: { fontSize: 13, angle: 0 } } } });
        expect(pinned.axisLabels.x).toMatchObject({ fontSize: 13, angle: 0, align: 'center', baseline: 'top' });
        expect(pinned.axisLabels.x.crowdedFrom).toBeUndefined();
        expect(pinned.axisLabels.x.overflowFit).toBeUndefined();
        expect(xAxes(pinned.spec).some((axis) => axis.labelFontSize === 13 && axis.labelAngle === 0)).toBe(true);
    });

    it('keeps the pins when the session plans other rows', () => {
        const session = openVegaLiteSession(structuredClone(crowded), { pins: { axisLabels: { x: { angle: -90 } } } });
        const fewer = session.replan({ keep: (row) => Number(row.Goals) > 30 });
        expect(fewer.axisLabels.x).toMatchObject({ angle: -90, align: 'right', baseline: 'middle' });
    });
});
