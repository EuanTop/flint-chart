/**
 * Probes: the same chart drawn twice — once through Flint with the house's ThemeSpec ("current"),
 * once as hand-crafted Vega-Lite following the guide ("expected"). Each probe isolates one rule a
 * house states, on shared real data from the preview cases, so a gap reads at a glance and the
 * same shortfall can be compared across houses.
 */
import type { ChartAssemblyInput, ThemeSpec } from 'flint-chart';
import { PREVIEW_CASES } from '../../shared/preview-cases';
import { H, W, houseConfig, titled, wordmarkLayer, type HouseTokens } from './vl';
import type { ThemeGap } from './types';

type Probe = Pick<ThemeGap, 'flint' | 'expectedSpec' | 'expectedFrame'>;

/** HTML around the expected chart, for what a chart spec cannot draw: a card, a coloured headline. */
export type ExpectedFrame = NonNullable<ThemeGap['expectedFrame']>;

const previewCase = (id: string) => {
  const found = PREVIEW_CASES.find((c) => c.id === id);
  if (!found) throw new Error(`Missing preview case ${id}`);
  return found;
};

export const POPULATION = (previewCase('population').data as { Country: string; Population: number }[])
  .slice()
  .sort((a, b) => b.Population - a.Population)
  .slice(0, 8);
export const EV_SHARE = previewCase('ev-share').data as { Year: number; Country: string; 'EV share (%)': number }[];
export const UNEMPLOYMENT = previewCase('us-unemployment').data as { Year: number; 'Unemployment (%)': number }[];
export const BROWSERS = previewCase('browser-pie').data as { Browser: string; Share: number }[];
export const MEDALS = previewCase('medals-grouped').data as { Country: string; Medal: string; Count: number }[];
export const ANOMALY = previewCase('temp-anomaly').data as { Decade: string; 'Anomaly (°C)': number; Direction: string }[];
export const PROJECTION = previewCase('renewables-projection').data as { Year: number; Series: string; 'Capacity (GW)': number }[];

const BASE = { width: W, height: H };

/** A Flint input: data, semantics and encodings from the shared cases, drawn in the house theme. */
export function flintInput(
  theme: ThemeSpec,
  chart: {
    chartType: string;
    data: Record<string, unknown>[];
    semantic_types: Record<string, unknown>;
    encodings: Record<string, unknown>;
    title?: string;
    subtitle?: string;
    chartProperties?: Record<string, unknown>;
    baseSize?: { width: number; height: number };
  },
): ChartAssemblyInput {
  return {
    data: { values: chart.data },
    semantic_types: chart.semantic_types,
    chart_spec: {
      chartType: chart.chartType,
      encodings: chart.encodings,
      baseSize: chart.baseSize ?? BASE,
      ...(chart.title ? { title: chart.title } : {}),
      ...(chart.subtitle ? { subtitle: chart.subtitle } : {}),
      ...(chart.chartProperties ? { chartProperties: chart.chartProperties } : {}),
    },
    theme_spec: theme,
  } as ChartAssemblyInput;
}

const populationFlint = (theme: ThemeSpec, title?: string, subtitle?: string, chartProperties?: Record<string, unknown>) =>
  flintInput(theme, {
    chartType: 'Bar Chart',
    data: POPULATION,
    semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
    encodings: { y: 'Country', x: 'Population' },
    title,
    subtitle,
    chartProperties,
  });

const populationBars = (t: HouseTokens, color: unknown = { value: t.palette[0] }) => ({
  data: { values: POPULATION },
  mark: { type: 'bar', ...(t.barCorner ? { cornerRadiusEnd: t.barCorner } : {}) },
  encoding: {
    y: { field: 'Country', type: 'nominal', sort: null, title: null },
    x: { field: 'Population', type: 'quantitative', title: null, axis: { grid: t.grid !== null, orient: 'bottom' } },
    color,
  },
});

/** Source line, note and wordmark under the chart block. */
export function footerProbe(
  theme: ThemeSpec,
  t: HouseTokens,
  o: {
    title?: string;
    subtitle?: string;
    footer: string[];
    footerAlign?: 'start' | 'end';
    footerRight?: string;
    logo?: string;
    logoCorner?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
    logoColor?: string;
  },
): Probe {
  const title = o.title ?? 'India and China hold over a third of humanity';
  const subtitle = o.subtitle ?? 'Population, millions, 2023';
  const bars = populationBars(t);
  const view = o.logo
    ? { layer: [bars, ...wordmarkLayer(t, o.logo, o.logoCorner ?? 'bottom-right', o.logoColor)] }
    : bars;
  return {
    flint: populationFlint(theme, title, subtitle),
    expectedSpec: titled(t, view, { title, subtitle, footer: o.footer, footerAlign: o.footerAlign, footerRight: o.footerRight }),
  };
}

/** One category in the house's emphasis colour, the rest in its context grey. */
export function highlightProbe(theme: ThemeSpec, t: HouseTokens, o: { focus?: string; title?: string; subtitle?: string } = {}): Probe {
  const focus = o.focus ?? 'Nigeria';
  const title = o.title ?? `${focus} is the most populous country in Africa`;
  const subtitle = o.subtitle ?? 'Population, millions, 2023';
  const color = {
    condition: { test: `datum.Country === '${focus}'`, value: t.highlight ?? t.palette[0] },
    value: t.context ?? '#c8c8c8',
  };
  return {
    flint: populationFlint(theme, title, subtitle),
    expectedSpec: titled(t, populationBars(t, color), { title, subtitle }),
  };
}

const evRows = (n: number) => {
  const countries = ['Norway', 'China', 'Germany', 'United States'].slice(0, n);
  return EV_SHARE.filter((row) => countries.includes(row.Country));
};

const evFlint = (theme: ThemeSpec, n: number, title?: string, subtitle?: string) =>
  flintInput(theme, {
    chartType: 'Line Chart',
    data: evRows(n),
    semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
    encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
    title,
    subtitle,
  });

const evLines = (t: HouseTokens, n: number, palette: string[], extra: Record<string, unknown> = {}) => ({
  data: { values: evRows(n) },
  mark: { type: 'line', strokeWidth: t.lineWidth ?? 2, point: false },
  encoding: {
    x: { field: 'Year', type: 'ordinal', title: null, axis: { labelAngle: 0 } },
    y: { field: 'EV share (%)', type: 'quantitative', title: null },
    color: { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China', 'Germany', 'United States'].slice(0, n), range: palette } },
  },
  ...extra,
});

/** The palette the house prescribes for exactly `n` series, against Flint's first `n` inks. */
export function paletteCountProbe(theme: ThemeSpec, t: HouseTokens, o: { n: number; palette: string[]; title?: string }): Probe {
  const title = o.title ?? 'Norway leads electric-car sales';
  const subtitle = 'Share of new cars sold that are electric, %';
  return {
    flint: evFlint(theme, o.n, title, subtitle),
    expectedSpec: titled(t, evLines(t, o.n, o.palette), { title, subtitle }),
  };
}

/** Series named by coloured words in the headline instead of a key. */
export function inTextLegendProbe(theme: ThemeSpec, t: HouseTokens, o: { n?: number } = {}): Probe {
  const n = o.n ?? 3;
  const names = ['Norway', 'China', 'Germany', 'United States'].slice(0, n);
  const colored = names.map((name, i) => `<span style="color:${t.palette[i]};font-weight:700">${name}</span>`);
  const list = colored.length > 1 ? `${colored.slice(0, -1).join(', ')} and ${colored[colored.length - 1]}` : colored[0];
  return {
    flint: evFlint(theme, n, 'Electric cars took off in Norway, China and Germany', 'Share of new cars sold that are electric, %'),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: { ...houseConfig(t), legend: { disable: true } },
      width: W,
      height: H,
      ...evLines(t, n, t.palette),
    },
    expectedFrame: {
      headerHtml: `<div style="font-family:${t.titleFont ?? t.font};font-size:${t.titleSize ?? 16}px;font-weight:700;color:${t.text};margin:0 14px 4px">Electric cars took off in ${list}</div>`
        + `<div style="font-family:${t.font};font-size:${t.subtitleSize ?? 12}px;color:${t.muted};margin:0 14px 2px">Share of new cars sold that are electric, %</div>`,
    },
  };
}

/** The chart as a product-UI card: container, header, actions. */
export function cardProbe(
  theme: ThemeSpec,
  t: HouseTokens,
  o: { style: Record<string, string | number>; header: string; meta?: string; actions?: boolean },
): Probe {
  const title = 'Unemployment rate';
  const header = `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:2px 2px 6px">
    <div><div style="font-family:${t.titleFont ?? t.font};font-size:${t.titleSize ?? 14}px;font-weight:600;color:${t.text}">${o.header}</div>
    ${o.meta ? `<div style="font-family:${t.font};font-size:12px;color:${t.muted};margin-top:2px">${o.meta}</div>` : ''}</div>
    ${o.actions === false ? '' : `<div style="font-family:${t.font};color:${t.muted};font-size:16px;letter-spacing:1px">⋯</div>`}</div>`;
  return {
    flint: flintInput(theme, {
      chartType: 'Line Chart',
      data: UNEMPLOYMENT,
      semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
      encodings: { x: 'Year', y: 'Unemployment (%)' },
      title,
      subtitle: 'United States, 2000–2023',
    }),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: { ...houseConfig(t), padding: 4, background: 'transparent' },
      width: W - 20,
      height: H - 30,
      data: { values: UNEMPLOYMENT },
      mark: { type: 'line', strokeWidth: t.lineWidth ?? 2 },
      encoding: {
        x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', tickCount: 6 } },
        y: { field: 'Unemployment (%)', type: 'quantitative', title: null, axis: { format: '.0f', labelExpr: "datum.label + '%'" } },
      },
    },
    expectedFrame: { style: o.style, headerHtml: header },
  };
}

/** A hover tooltip in the house's style, pinned open on the 2020 peak. */
export function tooltipProbe(
  theme: ThemeSpec,
  t: HouseTokens,
  o: { fill: string; text: string; border?: string; radius?: number; title?: string },
): Probe {
  const peak = UNEMPLOYMENT.find((row) => row.Year === 2020)!;
  return {
    flint: flintInput(theme, {
      chartType: 'Line Chart',
      data: UNEMPLOYMENT,
      semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
      encodings: { x: 'Year', y: 'Unemployment (%)' },
      title: 'Unemployment rate',
    }),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: houseConfig(t),
      title: 'Unemployment rate',
      width: W,
      height: H,
      layer: [
        {
          data: { values: UNEMPLOYMENT },
          mark: { type: 'line', strokeWidth: t.lineWidth ?? 2 },
          encoding: {
            x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd' } },
            y: { field: 'Unemployment (%)', type: 'quantitative', title: null },
          },
        },
        {
          data: { values: [peak] },
          mark: { type: 'rule', color: t.muted, strokeDash: [3, 3] },
          encoding: { x: { field: 'Year', type: 'quantitative' } },
        },
        {
          data: { values: [peak] },
          mark: { type: 'point', filled: true, size: 60, color: t.palette[0], stroke: t.background ?? '#fff', strokeWidth: 2 },
          encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } },
        },
        {
          data: { values: [peak] },
          mark: { type: 'rect', color: o.fill, stroke: o.border ?? null, cornerRadius: o.radius ?? 4, xOffset: 14, x2Offset: 118, yOffset: -34, y2Offset: 4 },
          encoding: { x: { field: 'Year', type: 'quantitative' }, x2: { field: 'Year' }, y: { field: 'Unemployment (%)', type: 'quantitative' }, y2: { field: 'Unemployment (%)' } },
        },
        {
          data: { values: [peak] },
          mark: { type: 'text', align: 'left', dx: 24, dy: -22, fontSize: 11, color: o.text, text: '2020' },
          encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } },
        },
        {
          data: { values: [peak] },
          mark: { type: 'text', align: 'left', dx: 24, dy: -6, fontSize: 12, fontWeight: 'bold', color: o.text, text: '● Unemployment 8.1%' },
          encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } },
        },
      ],
    },
  };
}

/** A written callout on the chart: a note pointing at a reading. */
export function annotationProbe(theme: ThemeSpec, t: HouseTokens, o: { color?: string; style?: 'line' | 'arrow' | 'circle' } = {}): Probe {
  const color = o.color ?? t.text;
  const notes = [
    { Year: 2009.6, value: 9.6, label: 'Financial crisis', dx: 30, dy: -18 },
    { Year: 2020, value: 8.1, label: 'Pandemic', dx: -8, dy: -26 },
  ];
  return {
    flint: flintInput(theme, {
      chartType: 'Line Chart',
      data: UNEMPLOYMENT,
      semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
      encodings: { x: 'Year', y: 'Unemployment (%)' },
      title: 'Unemployment spiked twice in two decades',
      subtitle: 'US unemployment rate, %',
    }),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: houseConfig(t),
      title: { text: 'Unemployment spiked twice in two decades', subtitle: 'US unemployment rate, %' },
      width: W,
      height: H,
      layer: [
        {
          data: { values: UNEMPLOYMENT },
          mark: { type: 'line', strokeWidth: t.lineWidth ?? 2 },
          encoding: {
            x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd' }, scale: { domain: [2000, 2023] } },
            y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 12] } },
          },
        },
        ...notes.flatMap((note) => [
          {
            data: { values: [note] },
            mark: o.style === 'circle'
              ? { type: 'point', size: 260, stroke: color, strokeWidth: 1.2, filled: false }
              : { type: 'rule', color, strokeWidth: 0.8 },
            encoding: o.style === 'circle'
              ? { x: { field: 'Year', type: 'quantitative' }, y: { field: 'value', type: 'quantitative' } }
              : {
                x: { field: 'Year', type: 'quantitative' },
                y: { field: 'value', type: 'quantitative' },
                y2: { datum: note.value + 1.6 },
              },
          },
          {
            data: { values: [note] },
            mark: { type: 'text', align: note.dx < 0 ? 'right' : 'left', fontSize: 11, color, fontStyle: 'normal', text: note.label, dx: note.dx < 0 ? 4 : -4, dy: -4 },
            encoding: { x: { field: 'Year', type: 'quantitative' }, y: { datum: note.value + 1.6 } },
          },
        ]),
      ],
    },
  };
}

/** Category names stacked above each horizontal bar, values at the bar's end, no value axis. */
export function labelsAboveBarsProbe(theme: ThemeSpec, t: HouseTokens): Probe {
  const title = 'India and China hold over a third of humanity';
  const subtitle = 'Population, millions, 2023';
  const rows = POPULATION.slice(0, 6);
  return {
    flint: flintInput(theme, {
      chartType: 'Bar Chart',
      data: rows,
      semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
      encodings: { y: 'Country', x: 'Population' },
      title,
      subtitle,
      chartProperties: { showTextLabels: true },
    }),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: { ...houseConfig(t), axis: { ...(houseConfig(t).axis as object), grid: false } },
      title: { text: title, subtitle },
      data: { values: rows },
      facet: { row: { field: 'Country', type: 'nominal', sort: { field: 'Population', order: 'descending' }, header: { labelAngle: 0, labelAnchor: 'start', labelAlign: 'left', labelOrient: 'top', labelPadding: 2, labelFontSize: 11, labelColor: t.text, labelFont: t.font, title: null } } },
      spacing: 4,
      spec: {
        width: W,
        height: 12,
        layer: [
          { mark: { type: 'bar', color: t.palette[0], height: 12 }, encoding: { x: { field: 'Population', type: 'quantitative', axis: null, scale: { domain: [0, 1600] } } } },
          { mark: { type: 'text', align: 'left', dx: 4, fontSize: 11, color: t.text }, encoding: { x: { field: 'Population', type: 'quantitative' }, text: { field: 'Population', type: 'quantitative', format: ',.0f' } } },
        ],
      },
      resolve: { scale: { x: 'shared' } },
    },
  };
}

/** Value labels where the guide puts them, in its ink. */
export function valueLabelProbe(
  theme: ThemeSpec,
  t: HouseTokens,
  o: { placement: 'inside' | 'outside'; color?: string; format?: string; hideAxis?: boolean },
): Probe {
  const title = 'India and China hold over a third of humanity';
  const subtitle = 'Population, millions, 2023';
  const inside = o.placement === 'inside';
  return {
    flint: populationFlint(theme, title, subtitle, { showTextLabels: true }),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: houseConfig(t),
      title: { text: title, subtitle },
      width: W,
      height: H,
      data: { values: POPULATION },
      encoding: {
        y: { field: 'Country', type: 'nominal', sort: null, title: null },
        x: { field: 'Population', type: 'quantitative', title: null, ...(o.hideAxis ? { axis: null } : {}) },
      },
      layer: [
        { mark: { type: 'bar', color: t.palette[0], ...(t.barCorner ? { cornerRadiusEnd: t.barCorner } : {}) } },
        {
          mark: { type: 'text', align: inside ? 'right' : 'left', dx: inside ? -4 : 4, fontSize: t.labelSize ?? 11, color: o.color ?? (inside ? '#ffffff' : t.text) },
          encoding: { text: { field: 'Population', type: 'quantitative', format: o.format ?? ',.0f' } },
        },
      ],
    },
  };
}

/** Observed solid, projected in the house's forecast style. */
export function forecastProbe(
  theme: ThemeSpec,
  t: HouseTokens,
  o: { projectedColor?: string; dash?: number[]; band?: boolean; label?: boolean } = {},
): Probe {
  const title = 'Renewable capacity is set to more than double by 2030';
  const subtitle = 'Global renewable capacity, GW';
  return {
    flint: flintInput(theme, {
      chartType: 'Line Chart',
      data: PROJECTION,
      semantic_types: { Year: 'Year', Series: 'Category', 'Capacity (GW)': 'Quantity' },
      encodings: { x: 'Year', y: 'Capacity (GW)', strokeDash: 'Series' },
      title,
      subtitle,
    }),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: houseConfig(t),
      title: { text: title, subtitle },
      width: W,
      height: H,
      layer: [
        ...(o.band ? [{
          data: { values: [{ from: 2023, to: 2030 }] },
          mark: { type: 'rect', color: t.context ?? '#eeeeee', opacity: 0.45 },
          encoding: { x: { field: 'from', type: 'quantitative', scale: { domain: [2015, 2030], zero: false } }, x2: { field: 'to' } },
        }, {
          data: { values: [{ from: 2023 }] },
          mark: { type: 'text', align: 'left', baseline: 'top', dx: 4, dy: 4, fontSize: 10, color: t.muted, text: 'FORECAST' },
          encoding: { x: { field: 'from', type: 'quantitative' }, y: { value: 0 } },
        }] : []),
        {
          data: { values: PROJECTION.filter((row) => row.Series === 'Observed') },
          mark: { type: 'line', strokeWidth: t.lineWidth ?? 2, color: t.palette[0] },
          encoding: {
            x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd' }, scale: { domain: [2015, 2030], zero: false } },
            y: { field: 'Capacity (GW)', type: 'quantitative', title: null },
          },
        },
        {
          data: { values: PROJECTION.filter((row) => row.Series === 'Projected') },
          mark: { type: 'line', strokeWidth: t.lineWidth ?? 2, color: o.projectedColor ?? t.palette[0], strokeDash: o.dash ?? [4, 3] },
          encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Capacity (GW)', type: 'quantitative' } },
        },
        ...(o.label === false ? [] : [{
          data: { values: [{ Year: 2027, v: 4300, text: 'Projected' }, { Year: 2019, v: 1440, text: 'Observed' }] },
          mark: { type: 'text', align: 'right', dx: -6, dy: -8, fontSize: 11, color: t.muted },
          encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'v', type: 'quantitative' }, text: { field: 'text' } },
        }]),
      ],
    },
  };
}

/** A pie as the guide orders and labels it. */
export function pieProbe(
  theme: ThemeSpec,
  t: HouseTokens,
  o: { donut?: boolean; labels?: 'outside' | 'inside' | 'legend'; sort?: boolean; maxSlices?: number } = {},
): Probe {
  const title = 'Chrome dominates desktop browsing';
  const subtitle = 'Desktop browser market share, %, 2024';
  const rows = o.sort === false ? BROWSERS : BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  const radius = 80;
  const labels = o.labels ?? 'outside';
  return {
    flint: flintInput(theme, {
      chartType: o.donut ? 'Donut Chart' : 'Pie Chart',
      data: BROWSERS,
      semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
      encodings: { size: 'Share', color: 'Browser' },
      title,
      subtitle,
    }),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: { ...houseConfig(t), ...(labels === 'legend' ? {} : { legend: { disable: true } }) },
      title: { text: title, subtitle },
      width: W,
      height: H,
      data: { values: rows },
      encoding: {
        theta: { field: 'Share', type: 'quantitative', stack: true },
        order: { field: 'Share', type: 'quantitative', sort: 'descending' },
        color: { field: 'Browser', type: 'nominal', sort: rows.map((row) => row.Browser), scale: { range: t.palette } },
      },
      layer: [
        { mark: { type: 'arc', outerRadius: radius, ...(o.donut ? { innerRadius: radius * 0.6 } : {}), stroke: t.background ?? '#fff', strokeWidth: 1.5 } },
        ...(labels === 'legend' ? [] : [{
          mark: { type: 'text', radius: labels === 'inside' ? radius * 0.75 : radius + 18, fontSize: 11, color: labels === 'inside' ? '#ffffff' : t.text },
          encoding: { text: { field: 'label', type: 'nominal' } },
          transform: [{ calculate: "datum.Browser + ' ' + datum.Share + '%'", as: 'label' }],
        }]),
      ],
    },
  };
}

/** Bars whose colour carries their sign: the house's positive and negative inks. */
export function signedProbe(theme: ThemeSpec, t: HouseTokens, o: { positive: string; negative: string }): Probe {
  const title = 'The world has warmed every decade since the 1960s';
  const subtitle = 'Temperature anomaly vs 1951–1980, °C';
  return {
    flint: flintInput(theme, {
      chartType: 'Bar Chart',
      data: ANOMALY.map(({ Decade, 'Anomaly (°C)': v }) => ({ Decade, 'Anomaly (°C)': v })),
      semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' } },
      encodings: { x: 'Decade', y: 'Anomaly (°C)' },
      title,
      subtitle,
    }),
    expectedSpec: titled(t, {
      data: { values: ANOMALY },
      mark: { type: 'bar' },
      encoding: {
        x: { field: 'Decade', type: 'ordinal', title: null, axis: { labelAngle: 0 } },
        y: { field: 'Anomaly (°C)', type: 'quantitative', title: null },
        color: { condition: { test: 'datum["Anomaly (°C)"] < 0', value: o.negative }, value: o.positive },
      },
    }, { title, subtitle }),
  };
}

/** Grouped bars: how the house spaces groups and orders series. */
export function groupedProbe(theme: ThemeSpec, t: HouseTokens, o: { palette?: string[]; padding?: number; title?: string } = {}): Probe {
  const rows = MEDALS.filter((row) => ['United States', 'China', 'Japan', 'Australia'].includes(row.Country));
  const title = o.title ?? 'The US and China shared the top of the medal table';
  const subtitle = 'Paris 2024 Olympic medals by type';
  return {
    flint: flintInput(theme, {
      chartType: 'Grouped Bar Chart',
      data: rows,
      semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
      encodings: { x: 'Country', y: 'Count', group: 'Medal' },
      title,
      subtitle,
    }),
    expectedSpec: titled(t, {
      data: { values: rows },
      mark: { type: 'bar', ...(t.barCorner ? { cornerRadiusEnd: t.barCorner } : {}) },
      encoding: {
        x: { field: 'Country', type: 'nominal', title: null, axis: { labelAngle: 0 }, scale: { paddingInner: o.padding ?? 0.25 } },
        xOffset: { field: 'Medal', sort: ['Gold', 'Silver', 'Bronze'] },
        y: { field: 'Count', type: 'quantitative', title: null },
        color: { field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver', 'Bronze'], scale: { range: o.palette ?? t.palette } },
      },
    }, { title, subtitle }),
  };
}

/** Just the house's line chart, for rules about lines: weight, markers, end labels, axis. */
export function lineProbe(
  theme: ThemeSpec,
  t: HouseTokens,
  o: { n?: number; endLabels?: boolean; points?: boolean; area?: boolean; title?: string; subtitle?: string; yTitle?: string; unitTop?: string; extra?: Record<string, unknown>[] } = {},
): Probe {
  const n = o.n ?? 4;
  const names = ['Norway', 'China', 'Germany', 'United States'].slice(0, n);
  const rows = evRows(n);
  const title = o.title ?? 'Norway leads electric-car sales';
  const subtitle = o.subtitle ?? 'Share of new cars sold that are electric, %';
  const last = rows.filter((row) => row.Year === 2023);
  return {
    flint: evFlint(theme, n, title, subtitle),
    expectedSpec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      config: { ...houseConfig(t), ...(o.endLabels ? { legend: { disable: true } } : {}) },
      title: { text: title, subtitle },
      width: W,
      height: H,
      layer: [
        {
          data: { values: rows },
          mark: { type: o.area ? 'area' : 'line', strokeWidth: t.lineWidth ?? 2, ...(o.points ? { point: { filled: true, size: 30 } } : {}), ...(o.area ? { opacity: 0.25, line: true } : {}) },
          encoding: {
            x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [2018, 2020, 2022, 2023] } },
            y: {
              field: 'EV share (%)', type: 'quantitative', title: o.yTitle ?? null,
              ...(o.unitTop ? { axis: { labelExpr: `datum.value === 100 ? datum.label + '${o.unitTop}' : datum.label` } } : {}),
            },
            color: { field: 'Country', type: 'nominal', scale: { domain: names, range: t.palette } },
          },
        },
        ...(o.endLabels ? [{
          data: { values: last },
          mark: { type: 'text', align: 'left', dx: 6, fontSize: t.labelSize ?? 11, fontWeight: 'bold' },
          encoding: {
            x: { field: 'Year', type: 'quantitative' },
            y: { field: 'EV share (%)', type: 'quantitative' },
            text: { field: 'Country' },
            color: { field: 'Country', type: 'nominal', scale: { domain: names, range: t.palette } },
          },
        }] : []),
        ...(o.extra ?? []),
      ],
    },
  };
}

export { H, W };

export const GAPMINDER = previewCase('gapminder-bubble').data as { 'GDP per capita': number; 'Life expectancy': number; 'Population (M)': number; Continent: string }[];

/** A scatter of countries by continent: dot size, opacity and the house's scatter palette. */
export function scatterProbe(
  theme: ThemeSpec,
  t: HouseTokens,
  o: { palette?: string[]; opacity?: number; size?: number; stroke?: string; bubbles?: boolean; title?: string } = {},
): Probe {
  const title = o.title ?? 'Richer countries live longer';
  const subtitle = 'Life expectancy, years, by GDP per person, $ (log scale), 2018';
  const continents = [...new Set(GAPMINDER.map((row) => row.Continent))].sort();
  return {
    flint: flintInput(theme, {
      chartType: 'Scatter Plot',
      data: GAPMINDER,
      semantic_types: { 'GDP per capita': 'Quantity', 'Life expectancy': 'Quantity', 'Population (M)': 'Quantity', Continent: 'Category' },
      encodings: { x: 'GDP per capita', y: 'Life expectancy', color: 'Continent', ...(o.bubbles ? { size: 'Population (M)' } : {}) },
      chartProperties: { logScale_x: true },
      title,
      subtitle,
    }),
    expectedSpec: titled(t, {
      data: { values: GAPMINDER },
      mark: { type: 'circle', opacity: o.opacity ?? 0.8, ...(o.stroke ? { stroke: o.stroke, strokeWidth: 0.5 } : {}), ...(o.bubbles ? {} : { size: o.size ?? 50 }) },
      encoding: {
        x: { field: 'GDP per capita', type: 'quantitative', scale: { type: 'log', domain: [1000, 150000] }, title: null, axis: { values: [1000, 10000, 100000], format: '~s' } },
        y: { field: 'Life expectancy', type: 'quantitative', scale: { zero: false }, title: null },
        color: { field: 'Continent', type: 'nominal', scale: { domain: continents, range: o.palette ?? t.palette } },
        ...(o.bubbles ? { size: { field: 'Population (M)', type: 'quantitative', legend: null, scale: { range: [20, 900] } } } : {}),
      },
    }, { title, subtitle }),
  };
}

/**
 * Give a house's gap charts the source line its guide shows (S1): the chart states its source, the
 * theme how it reads. `ids` limits it to some gaps; unset, every gap chart and the house's signature.
 */
export function withChartSource(house: { gaps: Array<{ id: string; flint?: ChartAssemblyInput }> }, source: string, ids?: string[]): void {
  for (const gap of house.gaps) {
    if (!gap.flint || (ids && !ids.includes(gap.id))) continue;
    gap.flint = { ...gap.flint, chart_spec: { ...gap.flint.chart_spec, source } } as ChartAssemblyInput;
  }
}
