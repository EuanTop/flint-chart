import { describe, expect, it } from 'vitest';
import { compile } from 'vega-lite';
import { assembleVegaLite } from '../src';

/** The axes Vega draws: orient → its rule's ink and width, read from the compiled spec. */
function axes(spec: any): Record<string, { scale: string; domain: boolean; color?: string; width?: number }> {
    const out: Record<string, any> = {};
    const config = spec.config ?? {};
    const walk = (n: any) => {
        for (const a of n.axes ?? []) {
            if (a.labels === false && a.domain === false) continue;
            const side = a.scale === 'x' ? config.axisX : config.axisY;
            out[a.orient] = { scale: a.scale, domain: a.domain ?? side?.domain ?? true, color: side?.domainColor, width: side?.domainWidth };
        }
        (n.marks ?? []).forEach(walk);
    };
    walk(compile(spec).spec);
    return out;
}

const INK = { surface: { canvas: '#ffffff' }, structure: { axis: '#444444', grid: '#dddddd' }, series: { single: '#1f6fb2' } };
const house = (axis: Record<string, unknown>) => ({ id: 'a', label: 'A', ink: INK, structure: { axis, grid: { measure: 'quiet' } } }) as any;
const ROWS = ['India', 'China', 'US', 'Indonesia'].map((Country, i) => ({ Country, People: 1400 - i * 300 }));
const bars = (theme: unknown, horizontal: boolean) => assembleVegaLite({
    data: { values: ROWS }, semantic_types: { Country: 'Country', People: 'Count' },
    chart_spec: { chartType: 'Bar Chart', encodings: horizontal ? { y: 'Country', x: 'People' } : { x: 'Country', y: 'People' } },
    theme_spec: theme,
} as any) as any;

describe('AX1: where an axis sits', () => {
    it('puts a trailing value axis on the right of columns, and leaves horizontal bars’ at the bottom', () => {
        const theme = house({ measure: { placement: 'trailing' } });
        expect(axes(bars(theme, false)).right?.scale).toBe('y');
        expect(axes(bars(theme, true)).bottom?.scale).toBe('x');
    });

    it('puts a top value axis over horizontal bars, and leaves columns’ on the left', () => {
        const theme = house({ measure: { placement: 'top' } });
        expect(axes(bars(theme, true)).top?.scale).toBe('x');
        expect(axes(bars(theme, false)).left?.scale).toBe('y');
    });

    it('keeps opposite as it was: top for a horizontal value axis, right for a vertical one', () => {
        const theme = house({ measure: { placement: 'opposite' } });
        expect(axes(bars(theme, true)).top?.scale).toBe('x');
        expect(axes(bars(theme, false)).right?.scale).toBe('y');
    });
});

describe('AX1: axes styled by side', () => {
    it('styles the bottom and left rules by side, whatever they carry, each in its own ink', () => {
        const theme = house({
            categorical: { line: 'full', lineWeight: 2 },
            measure: { line: 'hairline' },
            x: { line: 'full', lineWeight: 2, color: '#212529' },
            y: { line: 'full', lineWeight: 1, color: '#adb5bd' },
        });
        for (const horizontal of [false, true]) {
            const spec = bars(theme, horizontal);
            expect(spec.config.axisX.domainWidth).toBe(2);
            expect(spec.config.axisY.domainWidth).toBe(1);
            expect(spec.config.axisX.domainColor).not.toBe(spec.config.axisY.domainColor);
        }
    });

    it('lets a side override only what it states', () => {
        const spec = bars(house({ categorical: { line: 'full', lineWeight: 2 }, x: { color: '#aa0000' } }), false);
        expect(spec.config.axisX.domainWidth).toBe(2);
        expect(spec.config.axisX.domainColor).not.toBe(bars(house({ categorical: { line: 'full', lineWeight: 2 } }), false).config.axisX.domainColor);
    });

    it('leaves a theme that styles by role alone as it was', () => {
        const role = house({ categorical: { line: 'full', lineWeight: 2 } });
        expect(bars(role, true).config.axisY.domainWidth).toBe(2);
    });
});
