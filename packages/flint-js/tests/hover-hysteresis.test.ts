// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from 'vitest';
import { changeset, parse, View } from 'vega';
import { compile } from 'vega-lite';
import { assembleVegaLite } from '../src/vegalite/assemble';
import { addVegaLiteInteractions, injectVegaInteractionStore } from '../src/vegalite/interactions/compile';
import { INTERACTION_KEY, sceneItems, sceneItemsUnder } from '../src/vegalite/interactions/hit-adapter';
import { HOVER_STORE } from '../src/vegalite/interactions/stores';
import { hoverGroupFocus } from '../src/interactive/interactions';

/**
 * Hover keeps what it shows while one of those marks is still under the pointer, so crossing another
 * series's mark drawn over it does not flip the hover. That needs every mark under the pointer, not
 * only the topmost one Vega picks.
 */
describe('the marks under the pointer', () => {
    it('are every one drawn there: a thick line and another series\'s point over it', async () => {
        // A runs from 0 to 2 with no value at 1; B falls from 2 to 0 through (1, 1), its point there
        // sitting on A's line.
        const values = [
            { x: 0, y: 0, s: 'A' }, { x: 2, y: 2, s: 'A' },
            { x: 0, y: 2, s: 'B' }, { x: 1, y: 1, s: 'B' }, { x: 2, y: 0, s: 'B' },
        ];
        const spec: any = assembleVegaLite({
            data: { values },
            semantic_types: { x: 'Quantity', y: 'Quantity', s: 'Category' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'x', y: 'y', color: 's' }, baseSize: { width: 200, height: 200 } },
            theme_spec: 'pop',
        } as any);
        const plan = addVegaLiteInteractions(spec, [hoverGroupFocus({ groupBy: 's' })]);
        const compiled = compile(spec).spec as any;
        if (plan) injectVegaInteractionStore(compiled, plan);
        const view = new View(parse(compiled), { renderer: 'none' });
        await view.runAsync();

        const point = sceneItems(view).find((item) => item.mark?.marktype === 'symbol' && item.datum?.s === 'B' && item.datum?.x === 1);
        expect(point).toBeDefined();
        const at = { x: point.x, y: point.y };
        const under = sceneItemsUnder(view, at);
        const series = (item: any) => item.datum?.s ?? item.mark?.items?.[0]?.datum?.s;
        expect(under.some((item) => item.mark?.marktype === 'line' && series(item) === 'A')).toBe(true);
        expect(under.some((item) => item.mark?.marktype === 'symbol' && series(item) === 'B')).toBe(true);
        // Away from both, nothing is under the pointer.
        expect(sceneItemsUnder(view, { x: at.x, y: at.y - 40 }).length).toBe(0);
        view.finalize();
    });
});

describe('chrome drawn from the chart\'s rows', () => {
    it('answers no pointer: a panel\'s floor rule keeps a row but not its identity', async () => {
        // Pop draws each panel's x axis line as a rule over the panel's first row; keyed upstream,
        // the rule would hover as that row's series.
        const values = ['N', 'E'].flatMap((region) => ['Console', 'Web'].flatMap((s, si) =>
            [0, 1, 2, 3].map((m) => ({ region, month: `2025-0${m + 1}-01`, users: 10 + si * 30 + m * 5, s }))));
        const spec: any = assembleVegaLite({
            data: { values },
            semantic_types: { region: 'Category', month: 'YearMonth', users: 'Quantity', s: 'Category' },
            chart_spec: { chartType: 'Line Chart', encodings: { column: 'region', x: 'month', y: 'users', color: 's' }, baseSize: { width: 300, height: 200 } },
            theme_spec: 'pop',
        } as any);
        const plan = addVegaLiteInteractions(spec, [hoverGroupFocus({ groupBy: 's' })]);
        const compiled = compile(spec).spec as any;
        if (plan) injectVegaInteractionStore(compiled, plan);
        const view = new View(parse(compiled), { renderer: 'none' });
        await view.runAsync();
        const floors: any[] = [];
        const walk = (item: any) => {
            if (item.mark?.marktype === 'rule' && item.datum && '__flintFloor' in item.datum) floors.push(item);
            for (const child of item.items ?? []) walk(child);
        };
        walk((view.scenegraph() as any).root);
        expect(floors.length).toBeGreaterThan(0);
        expect(sceneItems(view).some((item) => item.mark?.marktype === 'rule' && '__flintFloor' in (item.datum ?? {}))).toBe(false);
        view.finalize();
    });
});

describe('how a hovered group stands out', () => {
    const values = [
        { a: 1, b: 2, s: 'A', g: 'M' }, { a: 2, b: 3, s: 'A', g: 'F' },
        { a: 1, b: 4, s: 'B', g: 'M' }, { a: 2, b: 1, s: 'B', g: 'F' },
    ];
    const chart = (chartType: string, encodings: Record<string, string>): any => assembleVegaLite({
        data: { values },
        semantic_types: { a: 'Quantity', b: 'Quantity', s: 'Category', g: 'Category' },
        chart_spec: { chartType, encodings, baseSize: { width: 200, height: 200 } },
    } as any);

    it('is a highlight where the group is a line, and a spotlight where it is points or bars', () => {
        const emphasis = (spec: any) => addVegaLiteInteractions(spec, [hoverGroupFocus({ groupBy: 's' })])?.groupHoverEmphasis;
        expect(emphasis(chart('Line Chart', { x: 'a', y: 'b', color: 's' }))).toBe('highlight');
        expect(emphasis(chart('Scatter Plot', { x: 'a', y: 'b', color: 's' }))).toBe('spotlight');
        expect(emphasis(chart('Bar Chart', { x: 's', y: 'b' }))).toBe('spotlight');
    });

    it('fills a hollow point with its own colour rather than greying its outline', async () => {
        const spec = chart('Scatter Plot', { x: 'a', y: 'b', color: 's', shape: 'g' });
        const plan = addVegaLiteInteractions(spec, [hoverGroupFocus({ groupBy: 's' })]);
        const compiled = compile(spec).spec as any;
        if (plan) injectVegaInteractionStore(compiled, plan);
        const view = new View(parse(compiled), { renderer: 'none' });
        await view.runAsync();
        const idle = sceneItems(view).find((item) => item.mark?.marktype === 'symbol' && item.datum?.s === 'A');
        expect(idle.fill).toBe('transparent');
        const key = idle.datum[INTERACTION_KEY];
        view.change(HOVER_STORE, changeset().insert([{ key }]));
        await view.runAsync();
        const hovered = sceneItems(view).find((item) => item.datum?.[INTERACTION_KEY] === key);
        expect(hovered.stroke).toBe(idle.stroke);
        expect(hovered.fill).toBe(idle.stroke);
        expect(hovered.strokeWidth).toBe(idle.strokeWidth);
        view.finalize();
    });
});
