import { describe, expect, it } from 'vitest';
import { assembleVegaLite } from '../src';

/** A house that wants every name flat, in its own size. */
const flatHouse = (size = 16, extra: Record<string, unknown> = {}) => ({
    id: 'flat',
    label: 'Flat',
    ink: { surface: { canvas: '#ffffff' }, series: { single: '#1f4e79', categorical: ['#1f4e79', '#e07b39', '#4a9bd4'] } },
    type: { axisLabel: { size }, axisTitle: { size } },
    labels: {},
    ...extra,
}) as any;

const axis = (spec: any, channel: 'x' | 'y') => {
    let enc: any;
    const visit = (n: any) => {
        if (!n || typeof n !== 'object') return;
        if (n.encoding?.[channel] && !enc) enc = n.encoding[channel];
        for (const c of [...(n.layer ?? []), ...(n.vconcat ?? []), n.spec].filter(Boolean)) visit(c);
    };
    visit(spec);
    return { ...spec.config?.axis, ...spec.config?.[`axis${channel.toUpperCase()}`], ...(enc?.axis ?? {}) };
};
const reports = (spec: any) => (spec._theme?.report ?? []).map((r: any) => r.code);

const MEDALS = ['United States', 'China', 'Japan', 'Australia', 'France'].flatMap((Country, c) =>
    ['Gold', 'Silver', 'Bronze'].map((Medal, m) => ({ Country, Medal, Count: 40 - c * 6 - m * 3 })));
const DECADES = ['1880s', '1900s', '1920s', '1940s', '1960s', '1980s', '2000s', '2010s', '2020s']
    .map((Decade, i) => ({ Decade, Anomaly: -0.2 + i * 0.15 }));

describe('A1: category names measured as drawn, shrunk, widened, then as the overflow says', () => {
    it('lays names flat a little smaller than stated rather than turn them', () => {
        const spec = assembleVegaLite({
            data: { values: MEDALS },
            semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Count' },
            chart_spec: { chartType: 'Grouped Bar Chart', encodings: { x: 'Country', y: 'Count', group: 'Medal' }, baseSize: { width: 360, height: 210 } },
            theme_spec: flatHouse(18),
        } as any) as any;
        const x = axis(spec, 'x');
        expect(x.labelAngle).toBe(0);
        expect(x.labelFontSize).toBeLessThanOrEqual(18);
        expect(x.labelFontSize).toBeGreaterThanOrEqual(18 * 0.75);
        expect(reports(spec)).not.toContain('labels-straight-refused');
    });

    it('shrinks to the floor, then widens the bands', () => {
        const spec = assembleVegaLite({
            data: { values: DECADES },
            semantic_types: { Decade: 'Category', Anomaly: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Decade', y: 'Anomaly' }, baseSize: { width: 360, height: 210 } },
            theme_spec: flatHouse(17),
        } as any) as any;
        const x = axis(spec, 'x');
        expect(x.labelAngle).toBe(0);
        expect(x.labelFontSize).toBeGreaterThanOrEqual(17 * 0.75);
        // Nine bands holding "1880s" flat need more than the 300px a 360px canvas leaves the plot.
        expect(spec.width.step * DECADES.length).toBeGreaterThan(300);
    });

    it('never shrinks below the house’s least size', () => {
        const names = Array.from({ length: 14 }, (_, i) => ({ Region: `Administrative region ${i + 1}`, Value: 10 + i }));
        const spec = assembleVegaLite({
            data: { values: names },
            semantic_types: { Region: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Region', y: 'Value' }, baseSize: { width: 360, height: 210 } },
            theme_spec: flatHouse(14, { type: { axisLabel: { size: 14 }, minSize: 12 } }),
        } as any) as any;
        const x = axis(spec, 'x');
        expect(x.labelFontSize ?? 14).toBeGreaterThanOrEqual(12);
    });

    it('keeps a thinned axis thinned when the house sets its names in a case', () => {
        const names = Array.from({ length: 30 }, (_, i) => ({ Region: `fiscal year ${1990 + i}`, Value: 10 + i }));
        const spec = assembleVegaLite({
            data: { values: names },
            semantic_types: { Region: 'Rank', Value: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Region', y: 'Value' }, baseSize: { width: 360, height: 210 } },
            theme_spec: flatHouse(14, { type: { axisLabel: { size: 14, case: 'upper' }, axisTitle: { size: 14 } }, labels: { overflow: ['wrap', 'skip'] } }),
        } as any) as any;
        const expr = axis(spec, 'x').labelExpr as string;
        expect(expr).toMatch(/>= 0 \? \(upper\(datum\.label\)\) : ''/);
    });

    it('stands names too wide for their band upright where the house says nothing', () => {
        const names = Array.from({ length: 14 }, (_, i) => ({ Region: `Administrative region ${i + 1}`, Value: 10 + i }));
        const spec = assembleVegaLite({
            data: { values: names },
            semantic_types: { Region: 'Category', Value: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Region', y: 'Value' }, baseSize: { width: 360, height: 210 } },
            theme_spec: flatHouse(14, { labels: {} }),
        } as any) as any;
        expect(axis(spec, 'x').labelAngle).toBe(-90);
    });

    it('never refuses a flat house’s angle on a continuous ruler, which is not in bands', () => {
        const years = Array.from({ length: 40 }, (_, i) => ({ Year: 1984 + i, Value: 50 + Math.sin(i) * 10 }));
        const spec = assembleVegaLite({
            data: { values: years },
            semantic_types: { Year: 'Year', Value: 'Quantity' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Value' }, baseSize: { width: 300, height: 200 } },
            theme_spec: flatHouse(13),
        } as any) as any;
        expect(axis(spec, 'x').labelAngle ?? 0).toBe(0);
        expect(reports(spec)).not.toContain('labels-straight-refused');
    });

    it('never turns a heat map’s row names for its column names', () => {
        const cities = ['Singapore', 'Delhi', 'Cairo', 'Sydney', 'Seattle', 'Moscow'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const rows = cities.flatMap((City, c) => months.map((Month, m) => ({ City, Month, Temp: c * 3 + m })));
        const spec = assembleVegaLite({
            data: { values: rows },
            semantic_types: { City: 'City', Month: 'Month', Temp: 'Temperature' },
            chart_spec: { chartType: 'Heatmap', encodings: { x: 'Month', y: 'City', color: 'Temp' }, baseSize: { width: 300, height: 200 } },
            theme_spec: { ...flatHouse(12), labels: {} },
        } as any) as any;
        expect(axis(spec, 'y').labelAngle ?? 0).toBe(0);
    });

    it('leaves a chart without a theme as it was', () => {
        const spec = assembleVegaLite({
            data: { values: MEDALS },
            semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Count' },
            chart_spec: { chartType: 'Grouped Bar Chart', encodings: { x: 'Country', y: 'Count', group: 'Medal' }, baseSize: { width: 360, height: 210 } },
        } as any) as any;
        expect(spec.config?.axisX?.labelFontSize ?? 10).toBeLessThanOrEqual(10);
    });
});

describe('A2: what stands clear of what around the plot', () => {
    it('stands a top key clear of a flat y title, by the title’s lift, line and a gap', () => {
        const spec = assembleVegaLite({
            data: { values: DECADES.map((row) => ({ ...row, Direction: row.Anomaly < 0 ? 'Below average' : 'Above average' })) },
            semantic_types: { Decade: 'Category', Anomaly: { semanticType: 'Quantity', unit: '°C' }, Direction: 'Category' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Decade', y: 'Anomaly', color: 'Direction' }, baseSize: { width: 360, height: 210 } },
            theme_spec: flatHouse(17, {
                legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'omit' },
                annotation: { axisTitles: 'always', axisTitlePlacement: 'flatAboveAxis' },
            }),
        } as any) as any;
        const y = axis(spec, 'y');
        expect(y.titleAngle).toBe(0);
        const lift = -y.titleY;
        expect(spec.config.legend.offset).toBeGreaterThanOrEqual(lift + 17 + 6);
    });

    it('drops the x labels clear of the lowest y label where the first sits on the plot’s edge', () => {
        const years = Array.from({ length: 24 }, (_, i) => ({ Year: 2000 + i, Rate: 4 + Math.abs(Math.sin(i)) * 5 }));
        const spec = assembleVegaLite({
            data: { values: years },
            semantic_types: { Year: 'Year', Rate: 'Percentage' },
            chart_spec: { chartType: 'Line Chart', encodings: { x: 'Year', y: 'Rate' }, baseSize: { width: 480, height: 300 } },
            theme_spec: flatHouse(21, { structure: { ticks: { show: false } } }),
        } as any) as any;
        const x = axis(spec, 'x');
        expect(x.labelFlush).toBe(false);
        expect(x.labelPadding).toBeGreaterThanOrEqual(Math.ceil(21 / 2 + 2) - (x.ticks === false ? 0 : x.tickSize ?? 0));
    });
});

describe('A4: a measure named once', () => {
    const omitted = (subtitle?: string, title = 'Wetter than it looks') => assembleVegaLite({
        data: { values: [{ Month: 'Jan', 'Rainfall (mm)': 80 }, { Month: 'Feb', 'Rainfall (mm)': 60 }] },
        semantic_types: { Month: 'Month', 'Rainfall (mm)': 'Amount' },
        chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Month', y: 'Rainfall (mm)' }, title, ...(subtitle ? { subtitle } : {}) },
        theme_spec: flatHouse(12, { annotation: { axisTitles: 'omit' } }),
    } as any) as any;

    it('does not repeat a measure the author’s deck already names', () => {
        expect(omitted('Monthly rainfall, mm, 2024').title.subtitle).toEqual(['Monthly rainfall, mm, 2024']);
    });

    it('still names it where only the headline does', () => {
        const spec = omitted(undefined, 'Rainfall (mm) fell');
        expect([spec.title.subtitle].flat().join(' ')).toContain('Rainfall');
    });
});

describe('A5: a signed field on a one-way ramp', () => {
    const heat = (diverging: boolean) => assembleVegaLite({
        data: { values: ['Oslo', 'Cairo'].flatMap((City, c) => ['Jan', 'Jul'].map((Month, m) => ({ City, Month, Temp: c === 0 && m === 0 ? -9 : 10 + c * 12 + m * 10 }))) },
        semantic_types: { City: 'City', Month: 'Month', Temp: 'Temperature' },
        chart_spec: { chartType: 'Heatmap', encodings: { x: 'Month', y: 'City', color: 'Temp' } },
        theme_spec: flatHouse(12, {
            ink: {
                surface: { canvas: '#ffffff' }, series: {
                    single: '#1f4e79', sequential: { stops: ['#dbe9f6', '#08306b'] },
                    ...(diverging ? { diverging: { stops: ['#b2182b', '#f7f7f7', '#2166ac'] } } : {}),
                },
            },
        }),
    } as any) as any;

    it('spans the data, not a domain balanced about zero, and says so', () => {
        const spec = heat(false);
        expect(spec.encoding.color.scale.domain).toBeUndefined();
        expect(reports(spec)).toContain('diverging-read-sequential');
    });

    it('keeps the balanced domain on a diverging ramp', () => {
        const domain = heat(true).encoding.color.scale.domain;
        expect(domain[0]).toBe(-domain[1]);
    });
});

describe('labels.overflow: two paths, trimming an add-on to every step', () => {
    const unbroken = (n: number) => Array.from({ length: n }, (_, i) => ({ Region: `Metropolitan-administrative-region-${i + 1}`, Value: 10 + i }));
    const spaced = ['Democratic Republic of the Congo', 'Bosnia and Herzegovina', 'Central African Republic', 'Papua New Guinea',
        'Trinidad and Tobago', 'Saint Vincent and the Grenadines', 'Antigua and Barbuda']
        .map((Region, i) => ({ Region, Value: 10 + i }));
    const compile = (rows: any[], labels: Record<string, unknown>, width = 360, size = 14, type = 'Category') => assembleVegaLite({
        data: { values: rows },
        semantic_types: { Region: type, Value: 'Quantity' },
        chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Region', y: 'Value' }, baseSize: { width, height: 210 } },
        theme_spec: flatHouse(size, { labels }),
    } as any) as any;
    /** The step taken, with ` + trim` where it trims. */
    const overflowStep = (spec: any) => (spec._theme?.report ?? []).find((r: any) => r.code === 'labels-overflow')?.message.match(/step `([^`]+)`/)?.[1];
    const thinned = (spec: any) => /^indexof\(.*\) >= 0 \? /.test(axis(spec, 'x').labelExpr ?? '');

    it('names: wraps, trimming each line, rather than turning names that break', () => {
        const spec = compile(spaced.slice(0, 5), {});
        expect(axis(spec, 'x').labelAngle).toBe(0);
        expect(axis(spec, 'x').labelExpr).toMatch(/\["Democratic( Republic)?","/);
        expect(overflowStep(spec)).toBe('wrap + trim');
    });

    it('names: every name printed — wrapped or upright, whole or trimmed — never thinned', () => {
        for (const n of [6, 14, 40]) {
            const spec = compile(unbroken(n), {});
            expect(thinned(spec)).toBe(false);
            expect(['wrap', 'wrap + trim', 'rotate90', 'rotate90 + trim']).toContain(overflowStep(spec));
        }
    });

    it('names: −45° before upright where the theme permits it, shrinking for it if need be', () => {
        for (const width of [600, 360]) {
            expect(axis(compile(unbroken(6), { overflow: ['rotate45', 'rotate90'] }, width), 'x').labelAngle).toBe(-45);
        }
        // Upright only where no −45° turn holds, even at the floor.
        expect(axis(compile(unbroken(40), { overflow: ['rotate45', 'rotate90'] }), 'x').labelAngle).toBe(-90);
    });

    it('trims at any step unless the theme never truncates', () => {
        const turned = compile(unbroken(6), { overflow: ['rotate90'] });
        expect(overflowStep(turned)).toBe('rotate90 + trim');
        const whole = compile(unbroken(6), { overflow: ['rotate90'], truncation: 'never' });
        expect(overflowStep(whole)).toBe('rotate90');
        expect(axis(whole, 'x').labelLimit ?? 0).toBe(0);
    });

    it('shrinks before it turns: a slightly smaller flat name beats a turned one', () => {
        // Too wide at 16px for their bands, but not at 13px: they shrink rather than turn.
        const seas = ['Arctic', 'Baltic', 'Indian', 'Coral', 'Bering', 'Tasman', 'Ionian', 'Aegean'].map((Region, i) => ({ Region, Value: i + 1 }));
        const x = axis(compile(seas, { overflow: ['rotate90'] }, 400, 16), 'x');
        expect(x.labelAngle).toBe(0);
        expect(x.labelFontSize).toBeLessThan(16);
        expect(x.labelFontSize).toBeGreaterThanOrEqual(16 * 0.75);
    });

    it('reads its thresholds from `labels.fit`', () => {
        // A turned name may run 40% of the plot's height by default; a house can allow more, or less.
        const tall = compile(unbroken(6), { overflow: ['rotate90'], fit: { turnedLimit: 400 } });
        const short = compile(unbroken(6), { overflow: ['rotate90'], fit: { turnedLimit: '20%' } });
        expect(axis(tall, 'x').labelLimit).toBeGreaterThan(axis(short, 'x').labelLimit);
        expect(overflowStep(tall)).toBe('rotate90');
        expect(overflowStep(short)).toBe('rotate90 + trim');
    });

    it('sets names that fit flat whatever the path: a theme never forces a turn', () => {
        const few = [{ Region: 'North', Value: 1 }, { Region: 'South', Value: 2 }, { Region: 'East', Value: 3 }];
        for (const overflow of [['rotate45'], ['rotate90'], ['rotate45', 'rotate90']]) {
            expect(axis(compile(few, { overflow }), 'x').labelAngle ?? 0).toBe(0);
        }
    });

    it('takes the chart’s own path over the theme’s (`chartProperties.labelOverflow`)', () => {
        const run = (type: string, chartProperties?: Record<string, unknown>, theme: unknown = flatHouse(14, { labels: {} })) => assembleVegaLite({
            data: { values: Array.from({ length: 30 }, (_, i) => ({ Region: `Fiscal year ${1990 + i}`, Value: i })) },
            semantic_types: { Region: type, Value: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Region', y: 'Value' }, baseSize: { width: 360, height: 210 }, ...(chartProperties ? { chartProperties } : {}) },
            ...(theme ? { theme_spec: theme } : {}),
        } as any) as any;
        // A run of ranks thins by default; the chart can ask for every name, upright.
        expect(thinned(run('Rank'))).toBe(true);
        expect(axis(run('Rank', { labelOverflow: ['wrap', 'rotate90'] }), 'x').labelAngle).toBe(-90);
        // A row of names never thins, even where the chart asks.
        expect(thinned(run('Category', { labelOverflow: ['skip'] }))).toBe(false);
        // Without a theme too.
        expect(axis(run('Rank', { labelOverflow: ['rotate90'] }, null), 'x').labelAngle).toBe(-90);
    });
});

describe('sequences: wrap → skip → rotate, thinning to round values before they turn', () => {
    const bars = (type: string, names: string[], width = 320, theme: unknown = flatHouse(12, { labels: {} })) => assembleVegaLite({
        data: { values: names.map((K, i) => ({ K, V: (i % 7) + 1 })) },
        semantic_types: { K: type, V: 'Quantity' },
        chart_spec: { chartType: 'Bar Chart', encodings: { x: 'K', y: 'V' }, baseSize: { width, height: 200 } },
        ...(theme ? { theme_spec: theme } : {}),
    } as any) as any;
    const shown = (spec: any) => JSON.parse(axis(spec, 'x').labelExpr.match(/^indexof\((\[.*?\]), /)[1]) as string[];
    const minutes = Array.from({ length: 36 }, (_, i) => `${16 + Math.floor((40 + i) / 60)}:${String((40 + i) % 60).padStart(2, '0')}`);

    it('labels minutes on round times, flat, at the house’s size', () => {
        const spec = bars('Time', minutes);
        const x = axis(spec, 'x');
        expect(x.labelAngle).toBe(0);
        expect(x.labelFontSize).toBe(12);
        const times = shown(spec);
        expect(times.length).toBeGreaterThanOrEqual(2);
        for (const time of times) expect(Number(time.split(':')[1]) % 5).toBe(0);
    });

    it('labels decades on round decades, also without a theme', () => {
        const decades = Array.from({ length: 15 }, (_, i) => `${1880 + i * 10}s`);
        for (const spec of [bars('Decade', decades, 200), bars('Decade', decades, 200, null)]) {
            const years = shown(spec).map((d) => Number.parseInt(d, 10));
            expect(years.length).toBeGreaterThanOrEqual(2);
            const step = years[1] - years[0];
            expect([20, 50, 100]).toContain(step);
            for (const year of years) expect(year % step).toBe(0);
        }
    });

    it('trims the round values to the room between them where whole they would not stand apart', () => {
        const decades = Array.from({ length: 15 }, (_, i) => `${1880 + i * 10}s cohort of arrivals`);
        const spec = bars('Decade', decades, 200);
        const x = axis(spec, 'x');
        expect(x.labelAngle).toBe(0);
        expect(shown(spec).length).toBeGreaterThanOrEqual(2);
        expect(x.labelLimit).toBeGreaterThan(0);
    });

    it('never thins a row of names, nor ordered words that are not a sequence', () => {
        const names = Array.from({ length: 30 }, (_, i) => `Country number ${i}`);
        expect(axis(bars('Country', names), 'x').labelExpr).toBeUndefined();
        expect(axis(bars('Country', names), 'x').labelAngle).toBe(-90);
        const levels = ['Strongly disagree', 'Disagree', 'Somewhat disagree', 'Neutral', 'Somewhat agree', 'Agree', 'Strongly agree'];
        expect(axis(bars('Category', levels, 160), 'x').labelExpr ?? '').not.toMatch(/>= 0 \? datum\.label : ''/);
    });
});

describe('identifiers along x are never trimmed', () => {
    it('stands codes upright whole rather than trimming them', () => {
        const ids = Array.from({ length: 12 }, (_, i) => ({ Order: `ORD-2024-${String(100000 + i * 7919)}-EU`, Value: i + 1 }));
        const spec = assembleVegaLite({
            data: { values: ids },
            semantic_types: { Order: 'ID', Value: 'Quantity' },
            chart_spec: { chartType: 'Bar Chart', encodings: { x: 'Order', y: 'Value' }, baseSize: { width: 300, height: 200 } },
            theme_spec: flatHouse(12, { labels: {} }),
        } as any) as any;
        const x = axis(spec, 'x');
        expect(x.labelAngle).toBe(-90);
        expect(x.labelLimit ?? 0).toBe(0);
    });
});
