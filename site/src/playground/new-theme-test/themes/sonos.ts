import type { ThemeSpec } from 'flint-chart';
import research from '../research/sonos.json';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import { BROWSERS, flintInput, footerProbe, groupedProbe, UNEMPLOYMENT, W, H } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Neue Haas Grotesk Display', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const RED = '#FD4F57';
const GREEN = '#00948E';
const BLUE = '#2B2AA8';
const BLACK = '#000000';

const t: HouseTokens = {
  font: FONT,
  text: BLACK,
  muted: '#3A3A3A',
  grid: '#BDBDBD',
  gridDash: [1, 3],
  axis: null,
  background: '#FFFFFF',
  palette: [RED, GREEN, BLUE, BLACK],
  highlight: RED,
  context: '#D9D9D9',
  titleSize: 26,
  titleWeight: 'bold',
  subtitleSize: 13,
  subtitleColor: BLACK,
  labelSize: 11,
  sourceSize: 10,
};

const theme: ThemeSpec = {
  id: 'sonos',
  label: 'Sonos (Agency SR guidelines)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: BLACK, secondary: BLACK, muted: '#3A3A3A', inverse: '#FFFFFF' },
    structure: { grid: '#BDBDBD', axis: BLACK, rule: BLACK },
    series: {
      single: RED,
      categorical: [RED, GREEN, BLUE, BLACK],
      // The 80/60/40% tints of each secondary colour, before any new hue.
      categoricalExtended: [RED, GREEN, BLUE, BLACK, '#FE959A', '#66BFBB', '#807FCB', '#FEB9BC', '#99D4D2', '#AAAADC'],
      sequential: { stops: ['#D5D4EE', '#AAAADC', '#807FCB', '#5555B9', BLUE], space: 'lab' },
    },
    accent: RED,
  },
  type: {
    headline: { family: FONT, size: 26, weight: 'bold', color: BLACK },
    deck: { family: FONT, size: 13, weight: 'regular', color: BLACK },
    axisLabel: { family: FONT, size: 11, weight: 'regular', color: BLACK },
    axisTitle: { family: FONT, size: 10, weight: 'regular', color: BLACK },
    keyLabel: { family: FONT, size: 12, weight: 'regular', color: BLACK },
    // “The label should be set in ‘Regular’ weight with the value in ‘Bold’.”
    valueLabel: { family: FONT, size: 12, weight: 'bold', color: BLACK },
    footnote: { family: FONT, size: 10, color: '#3A3A3A' },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit' },
    },
    // “White vertical line markers for each increment of the horizontal axis”, over the stack (GR2).
    grid: { measure: 'quiet', category: { presence: 'full', style: 'solid', color: '#FFFFFF', layer: 'front' }, style: 'dotted', dash: [1, 3], weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: {
    fillOpacity: 1,
    separator: { presence: 'full', width: 2, source: 'surface' },
    slice: { gap: 2, gapStyle: 'rule' },
    point: { presence: 'full', size: 36, fill: 'solid', halo: { presence: 'full', width: 1.5 } },
  },
  geometry: {
    area: { opacity: 1, edge: 'omit' },
    point: { presence: 'full', size: 36, fill: 'solid', outlineWidth: 1.5 },
    arc: { gap: 2, gapStyle: 'rule' },
  },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'whenTheyFit', placement: 'atMark', inkMode: 'contrastWithMark' },
  annotation: { axisTitles: 'omit' },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
  // The SONOS wordmark heads every graphic, top-left (F2).
  furniture: [{ kind: 'text', at: 'aboveTitle', align: 'start', text: 'SONOS', type: { family: FONT, size: 14, weight: 'black', color: BLACK } }],
};

const MIX = (PREVIEW_CASES.find((c) => c.id === 'electricity-mix-area')!.data as { Year: number; Source: string; 'Generation (TWh)': number }[])
  .filter((row) => ['Coal', 'Gas', 'Hydro'].includes(row.Source));
/** Bottom to top, as the spread stacks them: blue, teal, red. */
const STACK = ['Hydro', 'Gas', 'Coal'];
const STACK_INK: Record<string, string> = { Hydro: BLUE, Gas: GREEN, Coal: RED };

function stacked() {
  const years = [...new Set(MIX.map((row) => row.Year))].sort();
  const rows: { Year: number; Source: string; y0: number; y1: number; v: number }[] = [];
  for (const year of years) {
    let base = 0;
    for (const source of STACK) {
      const v = MIX.find((row) => row.Year === year && row.Source === source)!['Generation (TWh)'];
      rows.push({ Year: year, Source: source, y0: base, y1: base + v, v });
      base += v;
    }
  }
  return { years, rows };
}

const wordmark = (label: string, sub: string, inverse = false) =>
  `<div style="display:flex;align-items:baseline;gap:56px;margin:0 14px 6px;font-family:${FONT};color:${inverse ? '#fff' : '#000'}">`
  + `<span style="font-weight:700;font-size:17px;letter-spacing:3px">SONOS</span>`
  + `<span style="font-size:12px;line-height:1.15"><b>${label}</b><br>${sub}</span></div>`;

function signature() {
  const { years, rows } = stacked();
  const x = { field: 'Year', type: 'quantitative', scale: { domain: [years[0], years[years.length - 1]], nice: false }, axis: null };
  const top = rows.filter((row) => row.Source === 'Coal');
  const color = { field: 'Source', type: 'nominal', scale: { domain: ['Coal', 'Gas', 'Hydro'], range: [RED, GREEN, BLUE] } };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: { left: 14, right: 0, top: 10, bottom: 0 } },
    title: { text: 'Coal still tops the mix', subtitle: 'World electricity from coal, gas and hydro, TWh' },
    width: W + 40,
    height: H + 30,
    layer: [
      ...STACK.map((source, i) => ({
        data: { values: rows.filter((row) => row.Source === source) },
        mark: { type: 'area', opacity: 1, color: STACK_INK[source] },
        encoding: {
          x,
          y: {
            field: 'y1', type: 'quantitative', title: null, scale: { domain: [0, 21000] },
            axis: i === 0 ? { values: [5000, 10000, 15000, 20000], format: '~s', labelFontSize: 9, labelColor: BLACK, grid: false, domain: false, ticks: true, tickSize: 5, tickColor: BLACK, labelPadding: 2 } : null,
          },
          y2: { field: 'y0' },
        },
      })),
      {
        data: { values: rows },
        mark: { type: 'point', opacity: 0 },
        encoding: { x, y: { field: 'y1', type: 'quantitative' }, color: { ...color, legend: { orient: 'none', legendX: 312, legendY: 46, direction: 'vertical', symbolType: 'circle', symbolSize: 90, symbolOpacity: 1, symbolStrokeColor: '#ffffff', symbolStrokeWidth: 1, labelFontSize: 11, labelColor: '#ffffff' } } },
      },
      {
        data: { values: top },
        mark: { type: 'rule', color: '#ffffff', strokeWidth: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'y1', type: 'quantitative' }, y2: { datum: 0 } },
      },
      {
        data: { values: rows },
        mark: { type: 'point', filled: true, size: 42, stroke: '#ffffff', strokeWidth: 1.5, opacity: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'y1', type: 'quantitative' }, color: { ...color, legend: null } },
      },
      {
        data: { values: rows },
        mark: { type: 'text', fontSize: 9, fontWeight: 'bold', dy: -9, align: 'left', dx: 3 },
        encoding: {
          x: { field: 'Year', type: 'quantitative' },
          y: { field: 'y1', type: 'quantitative' },
          text: { field: 'v', type: 'quantitative', format: ',d' },
          color: { condition: { test: "datum.Source === 'Coal'", value: BLACK }, value: '#ffffff' },
        },
      },
      ...(['left', 'right'] as const).map((side) => ({
        data: { values: top },
        transform: [{ filter: `datum.Year ${side === 'right' ? '===' : '!=='} ${years[years.length - 1]}` }],
        mark: { type: 'text', fontSize: 11, fontWeight: 'bold', color: '#ffffff', baseline: 'bottom', dy: -6, align: side, dx: side === 'right' ? -4 : 4 },
        encoding: {
          x: { field: 'Year', type: 'quantitative' },
          y: { datum: 0, type: 'quantitative' },
          text: { field: 'Year', type: 'quantitative', format: 'd' },
        },
      })),
    ],
  };
}

/** One bar the width of the page: sections touch, label regular and value bold at each section's bottom-left. */
function bigStack() {
  const rows = BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  let x0 = 0;
  const base = H + 12;
  const sections = rows.map((row, i) => {
    // The value grows with its section; the label sits on top of it.
    const fs = row.Share >= 10 ? Math.round(16 + ((row.Share - 10) / 55) * 30) : 11;
    const out = { ...row, x0, x1: x0 + row.Share, ink: [RED, GREEN, BLUE, BLACK, '#FE959A'][i], fs, labelY: base - fs - 2 };
    x0 += row.Share;
    return out;
  });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), padding: 0 },
    width: W + 20,
    height: H + 20,
    data: { values: sections },
    layer: [
      {
        mark: { type: 'rect' },
        encoding: {
          x: { field: 'x0', type: 'quantitative', scale: { domain: [0, 100], nice: false }, axis: null },
          x2: { field: 'x1' },
          y: { value: 0 },
          y2: { value: H + 20 },
          color: { field: 'ink', type: 'nominal', scale: null, legend: null },
        },
      },
      {
        transform: [{ filter: 'datum.Share >= 10' }],
        mark: { type: 'text', align: 'left', baseline: 'bottom', color: '#ffffff', font: FONT, fontSize: 11, dx: 6 },
        encoding: { x: { field: 'x0', type: 'quantitative' }, y: { field: 'labelY', type: 'quantitative', scale: null }, text: { field: 'Browser' } },
      },
      {
        transform: [{ filter: 'datum.Share >= 10' }, { calculate: "datum.Share + '%'", as: 'label' }],
        mark: { type: 'text', align: 'left', baseline: 'bottom', color: '#ffffff', font: FONT, fontWeight: 'bold', dx: 5 },
        encoding: {
          x: { field: 'x0', type: 'quantitative' },
          y: { value: base },
          text: { field: 'label' },
          size: { field: 'fs', type: 'quantitative', scale: null, legend: null },
        },
      },
      {
        transform: [{ filter: 'datum.Share < 10' }, { calculate: "datum.Share + '%'", as: 'label' }],
        mark: { type: 'text', align: 'left', baseline: 'bottom', color: '#ffffff', font: FONT, fontWeight: 'bold', fontSize: 11, dx: 3 },
        encoding: { x: { field: 'x0', type: 'quantitative' }, y: { value: base }, text: { field: 'label' } },
      },
    ],
  };
}

function darkArea() {
  const dark: HouseTokens = { ...t, background: BLACK, text: '#ffffff', muted: '#ffffff', grid: '#555555', gridDash: [] };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(dark),
    title: { text: 'Unemployment rate', subtitle: 'United States, %' },
    width: W,
    height: H,
    data: { values: UNEMPLOYMENT },
    layer: [
      {
        mark: { type: 'area', color: RED, opacity: 1 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', labelColor: '#fff', labelFontWeight: 'bold', grid: false }, scale: { nice: false } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, axis: { labelColor: '#fff', tickCount: 5 } },
        },
      },
      {
        mark: { type: 'point', filled: true, color: RED, stroke: '#ffffff', strokeWidth: 1.2, size: 26, opacity: 1 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } },
      },
    ],
  };
}

/** The shared population probe leaves the value axis to Vega-Lite, which crowds “1,400 1,600”. */
function evenAxis<T extends { expectedSpec?: Record<string, unknown> }>(probe: T): T {
  const views = (probe.expectedSpec?.vconcat ?? []) as { encoding?: { x?: { axis?: Record<string, unknown> } } }[];
  const x = views[0]?.encoding?.x;
  if (x) x.axis = { ...(x.axis ?? {}), values: [0, 500, 1000, 1500], format: ',d' };
  return probe;
}

const header = (label: string, sub: string, inverse = false) => ({ headerHtml: wordmark(label, sub, inverse) });

const grouped = groupedProbe(theme, t, { palette: [RED, GREEN, BLUE], padding: 0.35 });
const groupedSpec = grouped.expectedSpec as { config: { legend: Record<string, unknown> } };
groupedSpec.config.legend = { ...groupedSpec.config.legend, symbolType: 'circle', symbolSize: 110, labelFontSize: 12, orient: 'top', offset: 6 };

const sonos: StyleGuideTheme = {
  id: 'sonos',
  org: 'Sonos (Data visualisation guidelines by Agency SR)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'The guideline document is not public; everything here was read from photographs of a dozen of its spreads. It is an infographic system for presentations: white (or reversed black) pages, the SONOS wordmark, a very large bold chart title, flat fields of coral red, teal and ultramarine plus black, Regular labels and Bold values. Built from scratch.',
    'Stated directly: the secondary palette `#FD4F57`, `#00948E`, `#2B2AA8` and black, with the 80/60/40% tints as the extended set (the guide prefers tints and patterns to new hues) and the blue tint ramp as the sequential scale; a 26px bold headline; Regular axis and key labels, Bold value labels; dotted value-axis gridlines, no axis lines or ticks; flat opaque areas with white-ringed vertex markers; white rules between wedges and stacked pieces; a top, untitled key; no y-axis titles. The face is a neo-grotesque that the spreads do not name; it is set in Helvetica Neue with Arial behind it.',
    'Not stated: the SONOS wordmark and page header, round key swatches, a label and a value with different weights inside one mark, value size that grows with the section, white increment rules drawn over the areas, the reversed black version, pattern fills, and the house’s “hero data” chart forms (fan and radial bars, bubble clusters).',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall: a full-bleed stacked area',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'Stacked area graph (spread 69): SONOS wordmark and chart name top-left; flat areas in blue (bottom), teal and coral red filling the page to its edges; thin white vertical markers at each x increment running up to the highest value; coloured circular markers with a white outline at every data point, with small bold values; x labels in bold white inside the bottom area, to the right of their marker except the last; short y labels at the left; round key swatches top-right.',
      current: 'Flint stacks the three sources in the house inks inside the usual chart box: a value ruler and a year axis outside the plot, a key row on top. Nothing in ThemeSpec asks for a full-bleed plot, increment rules over the data, value labels at area vertices or a wordmark.',
      expected: 'The spread re-drawn on world electricity: full-bleed blue/teal/red stack, white rules at each decade, ringed markers with values, bold white years inside the blue band, round key at the top right, wordmark header.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: MIX,
        semantic_types: { Year: 'Year', Source: 'Category', 'Generation (TWh)': 'Quantity' },
        encodings: { x: 'Year', y: 'Generation (TWh)', color: 'Source' },
        title: 'Coal still tops the mix',
        subtitle: 'World electricity from coal, gas and hydro, TWh',
      }),
      expectedSpec: signature(),
      expectedFrame: header('Stacked area graph', 'hero data'),
      observed: 'Flint (left) gets the inks, the stacking order (blue at the base, red on top), flat fills, dotted gridlines and round key swatches right. It differs in the frame: the stack sits inside an axis box with a 0–25,000 ruler and a year axis below it, the key is a row across the top, there are no vertex markers on the areas although `marks.point` asks for white-ringed dots, no white increment rules, no values, and the deck gains “; Generation (TWh)”. Expected (right): the stack running to the panel edges with white rules at each decade, ringed markers with bold values, the years in white inside the blue band, the key top-right and the SONOS header.',
    },
    {
      id: 'wordmark',
      addressed: { stage: 'F2', note: 'The SONOS wordmark is `text` furniture on the line above the title.' },
      title: 'SONOS wordmark and chart name head every graphic',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'brand-mark',
      rule: 'Every spread and graphic carries the SONOS wordmark top-left (top-right on dashboards), with the chart-type name in Bold and its role (“hero data”) in Regular beside it.',
      current: 'Flint’s title block holds a headline and a deck; `furniture` has tabs and rules but no wordmark or logo, and there is no slot for a chart label beside it.',
      expected: 'The letter-spaced SONOS wordmark with “Bar chart / hero data” beside it, above the bold title.',
      proposal: '`furniture: { kind: "wordmark", text | svg, anchor: "topLeft", letterSpacing }` and a `chart_spec.label` slot (kicker) set in `type.kicker`.',
      ...evenAxis(footerProbe(theme, t, { footer: [] })),
      expectedFrame: header('Bar chart', 'hero data'),
      observed: 'Flint: the 26px bold headline (broken over two lines at this width), white bold values inside the long bars — and no wordmark or chart name. Expected: the letter-spaced SONOS wordmark and “Bar chart / hero data” above the headline.',
    },
    {
      id: 'round-key',
      title: 'Round key swatches, set under the title',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: '“Legend for sections set in ‘Regular’ weight with circular swatches aligned underneath the title.”',
      current: 'The key sits on top and left-aligned as asked, but its swatch is the renderer’s choice for the mark — `legend.swatch` accepts only `auto`.',
      expected: 'Circular swatches in red, teal and blue directly under the deck.',
      proposal: '`legend.swatch: { shape: "circle" | "square" | "roundedSquare" | "line", size }`.',
      ...grouped,
      observed: 'Flint puts the key under the title, left-aligned, as asked, but with square swatches. Expected: round swatches in the same place.',
    },
    {
      id: 'label-and-value',
      title: 'Label in Regular, value in Bold, value sized to its section',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'value-label-placement',
      rule: 'Large stacked bar: “No gap between sections … Graph scaled to the full dimensions of the page”; label and value at the bottom-left of each section, the label in Regular and the value in Bold, the value’s size proportional to the section.',
      current: 'Flint draws a stacked bar inside axes with a key; a data label is one string in one type role (`valueLabel`), so it cannot pair a Regular name with a Bold number, place itself at a section’s corner, or scale with the section.',
      expected: 'One bar filling the panel, sections touching, each with its browser name in Regular and its share in Bold, Chrome’s 65% far larger than Edge’s 12%.',
      proposal: '`dataLabels.content: ["label", "value"]` with `labelRole` / `valueRole`, `dataLabels.placement: "cornerBottomStart"`, and `dataLabels.sizeBy: "markArea"` with a min/max px.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: BROWSERS.map((row) => ({ ...row, Platform: 'Desktop' })),
        semantic_types: { Platform: 'Category', Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { y: 'Platform', x: 'Share', color: 'Browser' },
        title: 'Chrome dominates desktop browsing',
      }),
      expectedSpec: bigStack(),
      observed: 'Flint: a thin 100% bar on a 0–100 axis with a five-entry key above it and bold white numbers (65, 12, 12, 6) inside the sections — names only in the key. Expected: one block filling the panel, each section naming itself in Regular above its Bold share, Chrome’s 65% several times the size of Edge’s 12%.',
      expectedFrame: { headerHtml: `<div style="font-family:${FONT};font-size:26px;font-weight:700;margin:0 0 10px">Chrome dominates desktop browsing</div>` },
    },
    {
      id: 'reversed',
      title: 'Every chart also exists reversed, on black',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'dark-mode',
      rule: 'Charts, icons and dashboards are shown in a white and a reversed black version (the “Listenership dashboard” print example): white type, the same coral red, white-ringed markers.',
      current: 'A ThemeSpec describes one surface; `ink.text.inverse` exists but there is no dark variant to switch to, so Flint draws the white version only.',
      expected: 'Coral-red area on black with white type and white-ringed markers.',
      proposal: '`variants` keyed on a host signal (`colorScheme: "dark"`) that may carry `ink` (today `ink` may not vary), or a `modes: { dark: { ink } }` block.',
      flint: flintInput(theme, {
        chartType: 'Area Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment rate',
        subtitle: 'United States, %',
      }),
      expectedSpec: darkArea(),
      observed: 'Flint draws the white version only (and, again, without the vertex markers). Expected: the reversed chart — black ground, white type and gridlines, the same coral area with white-ringed markers, the SONOS header reversed out.',
      expectedFrame: { style: { background: BLACK, padding: '10px 0 4px' }, ...header('Area graph', 'reversed', true) },
    },
    {
      id: 'patterns',
      title: 'Pattern fills before another colour',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'pattern-fill',
      rule: '“Before using an additional color, consider if a pattern fill would instead be best suited”: hatch, dotted and waves, over the palette colours.',
      current: '`marks.redundantChannels` allows `texture`, but there is no way to name the house’s three patterns, and past four series Flint moves to the tints rather than to patterns.',
      expected: 'The fifth to seventh series drawn as red, teal and blue with hatch, dots and waves.',
      proposal: '`ink.series.patterns: ["hatch", "dots", "waves"]` and `ink.series.exhaustion: "pattern"` (realised with SVG pattern defs).',
    },
    {
      id: 'axis-weights',
      title: 'Bold x increments, Regular y labels; white increment rules over the data',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'type-weight-scale',
      rule: '“Horizontal axis increments labeled at the bottom of the graph in ‘Bold’ weight”; vertical axis labels Regular; “white vertical line markers for each increment of the horizontal axis stretching to the highest value”; where data overlaps the axis, labels reverse out in white.',
      current: '`type.axisLabel` is one role for both axes; gridlines are drawn under the marks in `ink.structure.grid`, so a white rule over the areas cannot be stated, nor labels that turn white where they sit on data.',
      expected: 'See the signature panel: bold white years inside the blue band, white rules through the stack.',
      proposal: 'Split `type.axisLabel` into `categoricalAxisLabel` / `measureAxisLabel` (or per-role overrides in `structure.axis.*.label`), and `structure.grid.category: { layer: "overData", ink: "surface" }`.',
    },
    {
      id: 'hero-forms',
      title: 'The house’s hero forms: fan bars, radial bars, bubble clusters',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'chart-type-policy',
      rule: 'Fan and radial stacked bars ranked by size with large gaps and labels that rotate past 90°; bubbles clustered large to small with no gap; treemaps with white gaps and labels bottom-left; no stacked bars with more than six sets.',
      current: 'Flint has a rose chart but no fan, stacked-radial or packed-bubble template; a theme cannot ask for these forms or discourage others, and the gallery draws the house’s colours into standard charts.',
      expected: 'The hero forms available as templates, and a house policy that steers to them.',
      proposal: '`chartPolicy: { preferred, discouraged, maxSeries: { stackedBar: 6 } }`; new radial/fan bar and packed-bubble templates.',
    },
  ],
};

export default sonos;
