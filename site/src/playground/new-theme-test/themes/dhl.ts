import type { ThemeSpec } from 'flint-chart';
import research from '../research/dhl.json';
import { EV_SHARE, flintInput, highlightProbe, POPULATION } from '../probes';
import { titled, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Unverified: the Brand Hub is login-only. Values from Brandfetch / brand-palette summaries.
const YELLOW = '#FFCC00';
const RED = '#D40511';
const BLACK = '#191919';
const FONT = "Delivery, Frutiger, 'Helvetica Neue', Arial, sans-serif";

const t: HouseTokens = {
  font: FONT,
  text: BLACK,
  muted: '#4D4D4D',
  grid: '#D9D9D9',
  axis: null,
  background: '#FFFFFF',
  palette: [RED, BLACK, YELLOW],
  highlight: RED,
  context: '#CCCCCC',
  titleSize: 18,
  titleWeight: 'bold',
  subtitleSize: 13,
  labelSize: 11,
  sourceSize: 10,
};

const theme: ThemeSpec = {
  id: 'dhl',
  label: 'DHL (brand colours only)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: BLACK, secondary: '#4D4D4D', muted: '#4D4D4D' },
    structure: { grid: '#D9D9D9', axis: BLACK },
    series: {
      single: RED,
      // Only the corporate colours: red, black, yellow. No extended set and no overflow ink —
      // the Office theme manual says the other palette colours “are not” corporate.
      categorical: [RED, BLACK, YELLOW],
    },
    accent: YELLOW,
  },
  type: {
    headline: { family: FONT, size: 18, weight: 'bold', color: BLACK },
    deck: { family: FONT, size: 13, color: BLACK },
    axisLabel: { family: FONT, size: 11, color: '#4D4D4D' },
    axisTitle: { family: FONT, size: 11, color: '#4D4D4D' },
    keyLabel: { family: FONT, size: 11, color: BLACK },
    valueLabel: { family: FONT, size: 11, color: BLACK },
    footnote: { family: FONT, size: 10, color: '#4D4D4D' },
  },
  layout: { titleBlock: { anchor: 'start' } },
};

/** A placeholder DHL mark (not the brand artwork): red bold italic letters on a yellow field. */
function dhlMark(x: number, y: number, w = 58, h = 20) {
  return [
    {
      data: { values: [{}] },
      mark: { type: 'rect', clip: false, color: YELLOW },
      encoding: { x: { value: x - w }, x2: { value: x }, y: { value: y - h / 2 }, y2: { value: y + h / 2 } },
    },
    {
      data: { values: [{}] },
      mark: { type: 'text', clip: false, text: 'DHL', color: RED, fontWeight: 'bold', fontStyle: 'italic', fontSize: 15, align: 'center', baseline: 'middle', font: FONT },
      encoding: { x: { value: x - w / 2 }, y: { value: y + 1 } },
    },
  ];
}

/** A yellow brand band across the top with a placeholder DHL mark (red bold italic letters, not the artwork). */
const yellowBand = `<div style="display:flex;justify-content:flex-end;align-items:center;height:26px;background:${YELLOW};margin:0 14px 4px;padding:0 10px">`
  + `<span style="font-family:${FONT};font-weight:800;font-style:italic;font-size:19px;letter-spacing:-0.5px;color:${RED}">DHL</span></div>`;

const bars = (color: unknown = { value: RED }) => ({
  data: { values: POPULATION },
  mark: { type: 'bar' },
  encoding: {
    y: { field: 'Country', type: 'nominal', sort: null, title: null },
    x: { field: 'Population', type: 'quantitative', title: null, axis: { values: [0, 500, 1000, 1500], format: ',d' } },
    color,
  },
});

/** The shared population probe leaves the value axis to Vega-Lite, which crowds “1,400 1,600”. */
function evenAxis<T extends { expectedSpec?: Record<string, unknown> }>(probe: T): T {
  const views = (probe.expectedSpec?.vconcat ?? []) as { encoding?: { x?: { axis?: Record<string, unknown> } } }[];
  const x = views[0]?.encoding?.x;
  if (x) x.axis = { ...(x.axis ?? {}), values: [0, 500, 1000, 1500], format: ',d' };
  return probe;
}

const SIG_TITLE = 'India and China hold over a third of humanity';
const SIG_SUB = 'Population, millions, 2023';

const EV4 = EV_SHARE.filter((row) => ['Norway', 'China', 'Germany', 'United States'].includes(row.Country));
const EV3 = EV_SHARE.filter((row) => ['Norway', 'China', 'Germany'].includes(row.Country));

const evLines = (rows: typeof EV_SHARE, domain: string[], range: string[], extra: Record<string, unknown>[] = []) => ({
  layer: [
    ...extra,
    {
      data: { values: rows },
      mark: { type: 'line', strokeWidth: 2 },
      encoding: {
        x: { field: 'Year', type: 'quantitative', title: null, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023] } },
        y: { field: 'EV share (%)', type: 'quantitative', title: null },
        color: { field: 'Country', type: 'nominal', scale: { domain, range }, legend: { symbolType: 'stroke', symbolStrokeWidth: 2.5 } },
      },
    },
  ],
});

const dhl: StyleGuideTheme = {
  id: 'dhl',
  org: 'DHL (DHL Group Brand Hub)',
  research: research as ResearchRecord,
  theme,
  notes: [
    '**No chart rules could be read.** DHL’s “Tables and Charts” page sits behind the Brand Hub login; the only public document, the Office colour-theme manual, says chart colours must come from the official PowerPoint theme and that only its top-row colours are corporate. The hex values here (DHL Yellow `#FFCC00`, DHL Red `#D40511`, near-black `#191919`) come from brand-palette sites and are unverified; the proprietary Delivery typeface falls back to Arial.',
    'So this theme states only the brand basics: white canvas, black type, red as the single-series ink, a categorical set of red, black and yellow with nothing after it (the manual says the other colours “are not” corporate), yellow as the accent. Everything else is Flint’s default, deliberately.',
    'The expected panels are therefore reconstructions from those basics, not copies of a DHL specimen. The gaps are the places where even these few facts cannot be carried: what happens when the three corporate inks run out, yellow on white, the logo, the Office theme as the source of truth.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The brand basics in a chart (reconstructed, no specimen)',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'DHL’s chart page could not be read; the brand is DHL Yellow and DHL Red with black type, the red-on-yellow logo, and the Office theme’s corporate colours for charts.',
      current: 'Flint draws red bars, black type, the house’s light grid — a plain chart in DHL’s red with no yellow and no mark.',
      expected: 'A DHL-yellow band across the top carrying the mark (placeholder letters) at the right, a black headline, red bars, a source line.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: SIG_TITLE,
        subtitle: SIG_SUB,
      }),
      expectedSpec: titled(t, bars(), { title: SIG_TITLE, subtitle: SIG_SUB, footer: ['Source: UN World Population Prospects'] }),
      expectedFrame: { headerHtml: yellowBand },
      observed: 'Flint (left): black bold headline, red bars, a faint vertical grid and a “Population” axis title — DHL red on an otherwise generic chart; nothing yellow, no mark, no source. Expected (right): the same bars under a yellow band carrying the mark, with a source line.',
    },
    {
      id: 'corporate-only',
      addressed: { stage: 'R1', note: 'Past the corporate inks the tail takes a grey derived from the house, not Vega’s scheme.' },
      title: 'When the corporate inks run out, Flint brings in its own',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'count-palette',
      rule: '“Only the colors highlighted … are corporate colors(!). All other colors from the palette are not.” Charts must take their colours from the corporate set.',
      current: 'The theme names three corporate inks and nothing after them. With four series the house set is “exhausted” and Flint drops it altogether for the renderer’s default categorical scheme — four non-corporate colours, not even the three the house named. ThemeSpec cannot say “never introduce a colour the house did not name”.',
      expected: 'Norway, China and Germany in red, black and yellow; the fourth series in a neutral grey — still only brand colours.',
      proposal: '`ink.series.exhaustion: "overflow" | "repeatWithDash" | "rendererDefault"` with a house default that never leaves the brand, and a report when it triggers; `overflow` alone does not say this, because it is also read as permission to fold series.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV4,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      expectedSpec: titled(t, evLines(EV4, ['Norway', 'China', 'Germany', 'United States'], [RED, BLACK, YELLOW, '#999999']), {
        title: 'Norway leads electric-car sales',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      observed: 'Flint: Norway steel blue, China orange, Germany red, United States teal — the renderer’s default scheme, not one corporate colour among them. The gallery shows the same in every chart with four or more series (the browser pie, the electricity-mix area, the Gapminder scatter). Expected: red, black and yellow for the first three, grey for the fourth.',
    },
    {
      id: 'yellow-on-white',
      addressed: { stage: 'R5', note: 'A yellow line too faint on white is darkened in its hue just enough to read.' },
      title: 'DHL Yellow as a thin line on white barely reads',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'per-mark-palette',
      rule: 'Yellow is one of DHL’s two brand colours and in the corporate chart set; on a white page `#FFCC00` has a contrast of about 1.6:1.',
      current: 'Flint draws the third series as a 2px `#FFCC00` line on white with no check: ThemeSpec’s only contrast guard is `endpointsAgainstSurface`, for ramps. A theme cannot say that an ink is fine as a fill but needs help as a stroke.',
      expected: 'The yellow series kept yellow but cased in a thin black edge so it holds against the white (one possible treatment; DHL’s own rule could not be read).',
      proposal: '`ink.series.minContrast: 3` with a per-ink remedy (`casing`, `darkenForStrokes`), or `geometry.line.palette` so strokes can skip an ink that only works as a fill.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV3,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Electric cars took off in China and Germany',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      expectedSpec: titled(t, evLines(EV3, ['Norway', 'China', 'Germany'], [RED, BLACK, YELLOW], [{
        data: { values: EV3.filter((row) => row.Country === 'Germany') },
        mark: { type: 'line', strokeWidth: 3.6, color: BLACK },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' } },
      }]), {
        title: 'Electric cars took off in China and Germany',
        subtitle: 'Share of new cars sold that are electric, %',
      }),
      observed: 'Flint: Germany’s 2px `#FFCC00` line on white is the faintest thing on the chart, weaker than the gridlines’ labels; where it crosses the black China line it nearly disappears. Expected: the same yellow with a hairline black casing, which holds against the page.',
    },
    {
      id: 'logo',
      title: 'The DHL mark on the chart',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'brand-mark',
      rule: 'Brand material carries the red-on-yellow DHL logo; DHL Group, DHL and Post & Parcel share one colour theme but not one logo.',
      current: '`furniture` offers a masthead tab and header/footer rules; there is no kind for a logo or wordmark, and no way to bind one per sub-brand.',
      expected: 'The mark at the bottom right of the chart block (placeholder letters, not the artwork).',
      proposal: '`furniture: { kind: "logo", svg | url, anchor, height }`, so a group theme can be extended per brand with only the logo changed.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: SIG_TITLE,
        subtitle: SIG_SUB,
      }),
      expectedSpec: titled(t, { layer: [bars(), ...dhlMark(W, H + 34)] }, { title: SIG_TITLE, subtitle: SIG_SUB }),
      observed: 'Flint: the chart ends at its axis title; no mark. Expected: the placeholder red-on-yellow DHL mark at the bottom right of the block.',
    },
    {
      id: 'highlight',
      title: 'One bar in DHL Red, the rest grey',
      kind: 'chart-spec',
      severity: 'low',
      probe: 'highlight',
      rule: 'Not readable from DHL; inferred from the brand: red is the emphasis colour, the others recede.',
      current: 'Every bar takes `ink.series.single`; nothing in the theme or chart spec marks the subject.',
      expected: 'Nigeria in red, the other bars light grey.',
      proposal: '`chart_spec.emphasis` with `ink.series.emphasis` / `ink.series.context`.',
      observed: 'Flint: eight red bars; the headline’s Nigeria is not picked out. Expected: Nigeria red, the rest light grey. (In the gallery the temperature-anomaly chart shows the cost of a three-ink set with no status colours: the cold decades are red and the warm ones black.)',
      ...evenAxis(highlightProbe(theme, t)),
    },
    {
      id: 'office-theme',
      title: 'The Office theme is the source of truth for chart colours',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'office-theme-import',
      rule: 'Chart colours in Office documents must come from the official DHL Group theme saved from the PowerPoint template; DHL Group, DHL and Post & Parcel share it.',
      current: 'A ThemeSpec is written by hand; it cannot be read from (or kept in step with) a `.thmx` colour theme, so a Flint chart and a PowerPoint chart from the same template can drift.',
      expected: 'A theme whose ink is taken from the template’s theme colours (dark 1/2, light 1/2, accents 1–6).',
      proposal: 'An importer from Office theme XML to `ink` (accents → `categorical`, dk1 → `text.primary`, lt1 → `surface.canvas`), with the top row flagged as the corporate subset.',
    },
    {
      id: 'typeface',
      title: 'The Delivery typeface is proprietary',
      kind: 'visual-quality',
      severity: 'low',
      probe: 'font-source',
      rule: 'DHL sets brand communication in its own Delivery family (unverified here).',
      current: 'The theme names `Delivery` first; where it is not installed every panel falls back to Arial.',
      expected: 'The brand face, or a declared metric-compatible fallback.',
      proposal: '`type.fontSources: [{ family, url }]` so a theme can ship (or point to) its webfont, and a `fallback` the compiler measures with.',
    },
  ],
};

export default dhl;
