import type { ThemeSpec } from 'flint-chart';
import research from '../research/bbc.json';
import { BROWSERS, EV_SHARE, POPULATION, UNEMPLOYMENT, flintInput, highlightProbe, withChartSource } from '../probes';
import { H, W, houseConfig, titled, type HouseTokens } from '../vl';
import { realLogo } from '../house-logos';

const bbcLogo = realLogo('bbc');
import type { ResearchRecord, StyleGuideTheme } from '../types';

const REITH = "'BBC Reith Sans', Helvetica, Arial, sans-serif";
const BLUE = '#1380A1';
const AMBER = '#FAAB18';
const INK = '#222222';
const BASE = '#333333';
const NOTE = '#555555';
const GRID = '#cbcbcb';

const t: HouseTokens = {
  font: REITH,
  text: INK,
  muted: INK,
  grid: GRID,
  axis: null,
  background: '#ffffff',
  palette: [BLUE, AMBER, '#990000', '#588300'],
  highlight: BLUE,
  context: '#dddddd',
  titleSize: 28,
  titleWeight: 'bold',
  subtitleSize: 22,
  subtitleColor: INK,
  labelSize: 18,
  sourceSize: 16,
  lineWidth: 2,
  legendOrient: 'top-left',
};

// The shipped `bbc` preset, at bbplot's own page size and type (640 × 450, 28/22/18px), with the
// block logo the gallery has on hand.
const theme: ThemeSpec = {
  extends: 'bbc',
  id: 'bbc',
  label: 'BBC News (bbplot)',
  type: {
    headline: { size: 28 },
    deck: { size: 22 },
    axisLabel: { size: 18 },
    axisTitle: { size: 18 },
    keyLabel: { size: 18 },
    valueLabel: { size: 17 },
    annotation: { size: 17 },
    footnote: { size: 16 },
  },
  compileDefaults: { baseSize: { width: 640, height: 450 } },
  source: { credit: { text: 'BBC', placement: 'end', weight: 'bold', ...(bbcLogo ? { image: { src: bbcLogo, width: 66, height: 19 } } : {}) } },
};

/** finalise_plot's footer: a thin full-width rule, the source at the left, the BBC blocks at the right. */
const blocks = ['B', 'B', 'C'].map((letter) =>
  `<span style="display:inline-block;width:19px;height:19px;margin-left:2px;background:#4a4a4a;color:#fff;font:700 14px/19px Helvetica,Arial,sans-serif;text-align:center">${letter}</span>`).join('');
const footer = (source: string) =>
  `<div style="margin:0 14px 10px;border-top:1px solid ${INK};padding-top:6px;display:flex;justify-content:space-between;align-items:center;font-family:${REITH};font-size:16px;color:${INK}">`
  + `<span>${source}</span><span style="white-space:nowrap">${blocks}</span></div>`;

const SIG_W = 560;
const SIG_H = 300;
const SIG_ROWS = EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China');
const SIG_TITLE = 'Norway races ahead';
const SIG_SUBTITLE = 'Share of new cars sold that are electric, 2018-2023';

/** The heavy dark line at zero every bbplot chart carries (geom_hline(yintercept = 0, size = 1)). */
const zeroRule = (axis: 'x' | 'y') => ({
  data: { values: [{ zero: 0 }] },
  mark: { type: 'rule', color: BASE, strokeWidth: 2.2 },
  encoding: { [axis]: { field: 'zero', type: 'quantitative' } },
});

function signature() {
  const domain = ['Norway', 'China'];
  const color = { field: 'Country', type: 'nominal', scale: { domain, range: [BLUE, AMBER] }, legend: null };
  return titled(t, {
    layer: [
      {
        data: { values: SIG_ROWS },
        mark: { type: 'line', strokeWidth: 2.2 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023], nice: false }, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023], grid: false, domain: false, labelPadding: 10 } },
          y: { field: 'EV share (%)', type: 'quantitative', title: null, scale: { domain: [0, 100] }, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.value === 100 ? '100%' : datum.label", labelPadding: 8 } },
          color,
        },
      },
      zeroRule('y'),
      {
        data: { values: SIG_ROWS.filter((row) => row.Year === 2023) },
        mark: { type: 'text', align: 'left', dx: 8, fontSize: 18, font: REITH },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'EV share (%)', type: 'quantitative' }, text: { field: 'Country' }, color },
      },
    ],
  }, { title: SIG_TITLE, subtitle: SIG_SUBTITLE, width: SIG_W, height: SIG_H });
}

/** Ranked horizontal bars as the cookbook draws them: vertical gridlines, a heavy line at zero, white values inside the bar ends. */
function rankedBars(o: { labels: boolean; title: string; subtitle: string }) {
  const encoding = {
    y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { grid: false, domain: false, labelPadding: 8 } },
    x: { field: 'Population', type: 'quantitative', title: null, axis: { grid: true, gridColor: GRID, domain: false, tickCount: 4 } },
  };
  return titled(t, {
    layer: [
      { data: { values: POPULATION }, mark: { type: 'bar', color: BLUE, height: { band: 0.9 } }, encoding },
      zeroRule('x'),
      ...(o.labels ? [{
        data: { values: POPULATION },
        mark: { type: 'text', align: 'right', dx: -6, fontSize: 17, color: '#ffffff', font: REITH },
        encoding: { ...encoding, text: { field: 'Population', type: 'quantitative', format: ',.0f' } },
      }] : []),
    ],
  }, { title: o.title, subtitle: o.subtitle, width: W + 60, height: H + 40 });
}

const populationFlint = (title: string, subtitle: string, chartProperties?: Record<string, unknown>) => flintInput(theme, {
  chartType: 'Bar Chart',
  data: POPULATION,
  semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
  encodings: { y: 'Country', x: 'Population' },
  title,
  subtitle,
  chartProperties,
  baseSize: { width: W + 120, height: H + 90 },
});

const unemploymentFlint = (title: string, subtitle: string) => flintInput(theme, {
  chartType: 'Line Chart',
  data: UNEMPLOYMENT,
  semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'Unemployment (%)' },
  title,
  subtitle,
  baseSize: { width: W + 120, height: H + 90 },
});

const unemploymentLine = {
  data: { values: UNEMPLOYMENT },
  mark: { type: 'line', strokeWidth: 2.2, color: BLUE },
  encoding: {
    x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], grid: false, domain: false, labelPadding: 10 } },
    y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 12] }, axis: { values: [0, 4, 8, 12], labelExpr: "datum.value === 12 ? '12%' : datum.label" } },
  },
};

/** A bbplot annotation: grey box-less text, a thin curved leader ending in a small arrowhead. */
function curvedNote(o: { text: string[]; tx: number; ty: number; path: [number, number][]; head: number }) {
  const [hx, hy] = o.path[o.path.length - 1];
  return [
    {
      data: { values: o.path.map(([x, y], i) => ({ x, y, i })) },
      mark: { type: 'line', interpolate: 'basis', color: NOTE, strokeWidth: 1 },
      encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' }, order: { field: 'i' } },
    },
    {
      data: { values: [{ x: hx, y: hy }] },
      mark: { type: 'point', shape: 'triangle-up', filled: true, size: 34, color: NOTE, angle: o.head },
      encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' } },
    },
    {
      data: { values: [{ x: o.tx, y: o.ty }] },
      mark: { type: 'text', align: 'left', baseline: 'top', color: NOTE, fontSize: 15, font: REITH, lineHeight: 17, text: o.text },
      encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' } },
    },
  ];
}

/** A GEL pointer label: a filled chip with a dark underline, a stem, and an open circle on the reading. */
function pointerLabel(o: { x: number; y: number; text: string; fill: string; ink: string; lift: number }) {
  const top = o.y + o.lift;
  return [
    { data: { values: [{ x: o.x, y: o.y, y2: top }] }, mark: { type: 'rule', color: INK, strokeWidth: 1.2 }, encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' }, y2: { field: 'y2' } } },
    { data: { values: [{ x: o.x, y: o.y }] }, mark: { type: 'point', filled: true, fill: '#ffffff', stroke: INK, strokeWidth: 1.2, size: 46 }, encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' } } },
    { data: { values: [{ x: o.x, y: top }] }, mark: { type: 'rect', color: o.fill, stroke: null, xOffset: -46, x2Offset: 46, yOffset: -24, y2Offset: 0 }, encoding: { x: { field: 'x', type: 'quantitative' }, x2: { field: 'x' }, y: { field: 'y', type: 'quantitative' }, y2: { field: 'y' } } },
    { data: { values: [{ x: o.x, y: top }] }, mark: { type: 'rule', color: INK, strokeWidth: 1.5, xOffset: -46, x2Offset: 46 }, encoding: { x: { field: 'x', type: 'quantitative' }, x2: { field: 'x' }, y: { field: 'y', type: 'quantitative' } } },
    { data: { values: [{ x: o.x, y: top }] }, mark: { type: 'text', align: 'center', baseline: 'middle', dy: -12, fontSize: 16, font: REITH, color: o.ink, text: o.text }, encoding: { x: { field: 'x', type: 'quantitative' }, y: { field: 'y', type: 'quantitative' } } },
  ];
}

const bbc: StyleGuideTheme = {
  id: 'bbc',
  org: 'BBC News',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from `bbc_style()` and `finalise_plot()` in bbplot (the BBC Visual and Data Journalism cookbook), with the GEL infographics guideline for the label styles. bbplot sizes are points on a 640×450px export, so they are used here as px and the signature panels are drawn wide enough for them to keep their proportion.',
    'Stated directly: a 28px bold headline and 22px regular deck in #222222, flush left; 18px axis and key labels; teal-blue #1380A1 as the single-series ink with amber, dark red and green after it; light grey #cbcbcb gridlines across the measure only; no axis lines, ticks or axis titles (units move to the deck, or to the top tick via `annotation.unit: lastTick`); an emphasised #333333 zero line and baseline; a top-left, untitled key, with series-end labels preferred; and a thin footer rule (`furniture: footerRule`).',
    "Approximated: BBC Reith Sans is proprietary, so every panel falls back to Helvetica/Arial — bbplot itself uses Helvetica. The baseline's weight (ggplot `size = 1`, about 2px) has no number in the schema, only the `emphasised` presence. Not stated: the source line and BBC logo under the footer rule, the grey curved-arrow annotations, the GEL chip labels, and highlight-vs-grey — see the gaps.",
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'Big bold headline stating the finding, regular deck naming measure and period, both flush with the graphic’s left edge; #cbcbcb horizontal gridlines only; no axis lines, ticks or titles; a heavy #333333 line at zero; unit on the top tick; series labelled at their ends in their own colour; a thin full-width rule, “Source: …” bottom-left and the BBC blocks bottom-right.',
      current: 'The theme states the type, the grid, the emphasised zero line, the top-tick unit and the footer rule, and asks for series-end labels. Flint has no source line or logo to put under the rule, and does not draw the zero line on a chart whose floor is zero (see the zero-line gap).',
      expected: 'The bbplot composite’s line charts applied to the EV data: headline, deck, teal and amber lines named at their ends, “100%” on the top tick, heavy zero line, footer rule with source and BBC blocks.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: SIG_ROWS,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: SIG_TITLE,
        subtitle: SIG_SUBTITLE,
        baseSize: { width: SIG_W + 80, height: SIG_H + 150 },
      }),
      expectedSpec: signature(),
      expectedFrame: { footerHtml: footer('Source: IEA Global EV Outlook') },
      observed: 'Flint (left) gets the 28px bold headline, the series-end names in their own colours and “100%” on the top tick (`unit: lastTick` works). It differs in four places: the 22px deck wraps and gains “; EV share (%)”; the y axis is ruled every 10 points (eleven labels against the guide’s four or five); there is no heavy line at zero — the floor gridline is as pale as the rest and its “0” collides with the “2018” label; and the footer rule runs under the plot only, with nothing written beneath it. Expected (right): quarters on y, a dark 2px baseline, a full-width rule with the source and the BBC blocks.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: '“Source: …” bottom-left under the house’s footer rule, the BBC credit bottom-right (`credit.placement: "end"`); the block logo itself stays a wordmark stand-in.' },
      title: '“Source: …” under a full-width rule, bottom-left',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: '`finalise_plot()` closes every chart with a thin full-width rule, then the source text (“Source: Gapminder”) in 16pt at the bottom left, on the same line as the logo.',
      current: 'The footer rule is stated (`furniture: [{ kind: "footerRule" }]`), but the chart spec has no source slot, so nothing is written under it.',
      expected: 'The rule, then “Source: UN World Population Prospects” left and the BBC blocks right, in the footnote role.',
      proposal: '`chart_spec.source` rendered with `type.footnote`, and a footer layout in the theme that seats it under the `footerRule` (`layout.footer: { rule: true, source: "start", brand: "end" }`).',
      flint: populationFlint('Two population giants', 'Population, millions, 2023'),
      expectedSpec: rankedBars({ labels: false, title: 'Two population giants', subtitle: 'Population, millions, 2023' }),
      expectedFrame: { footerHtml: footer('Source: UN World Population Prospects') },
      observed: 'Flint draws the stated footer rule, but it starts at the bars rather than at the graphic’s left edge (it does not run under the country names or the headline) and nothing sits under it; the deck also gains “; Population (m)”. Expected: the rule across the whole block, “Source: UN World Population Prospects” left, BBC blocks right.',
    },
    {
      id: 'brand-mark',
      addressed: { stage: 'S1', note: '`source.credit.image` draws the block logo at the footer’s right end, level with the source (S1). The real artwork is used from the local, gitignored logos folder when present; otherwise the credit’s words stand in.' },
      title: 'The BBC block logo bottom-right',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'brand-mark',
      rule: 'The BBC block logo (three boxed letters) sits bottom-right in the footer, level with the source (`rasterGrob(logo, x = 0.944)`).',
      current: '`ThemeFurniture.kind` is `mastheadTab | footerRule | headerRule`; there is no kind for a logo or wordmark, so the theme cannot place one.',
      expected: 'The three grey blocks at the right end of the footer line — see the expected panels of the signature and source-line gaps.',
      proposal: '`furniture: [{ kind: "logo", src | svg, anchor: "bottomRight", height }]`, aligned to the footer line the source sits on.',
    },
    {
      id: 'value-label-placement',
      addressed: { stage: 'L1', note: 'Measured as printed (L1), 241, 224, 216 and 173 fit inside their bars, as the guide prints them. A label that does move past a short bar now takes an ink that reads on the plot (L4) instead of vanishing white.' },
      title: 'White values inside the bar ends: the short bars lose theirs',
      kind: 'realization',
      severity: 'medium',
      probe: 'value-label-placement',
      rule: 'Ranked horizontal bars print their values in white inside the bar end (`geom_label(hjust = 1, colour = "white", fill = NA, label.size = NA)`); the gridlines swap to vertical #cbcbcb and the zero line becomes a heavy vertical rule.',
      current: 'The theme states `dataLabels: { placement: "atMark", inkMode: "contrastWithMark" }` and a white `valueLabel`; the chart asks for labels with `showTextLabels`. Flint puts white numbers inside the long bars, but below its `insideMinValue` threshold it prints nothing at all — neither inside nor outside.',
      expected: 'Every bar carries its value in white inside its end; the 17px numbers fit even the shortest bar.',
      proposal: 'Measure the label against the bar’s pixel length rather than a conservative value threshold, and when it truly does not fit, fall back to `outsideMark` in `type.text.primary` instead of dropping it.',
      flint: populationFlint('Two population giants', 'Population, millions, 2023', { showTextLabels: true }),
      expectedSpec: rankedBars({ labels: true, title: 'Two population giants', subtitle: 'Population, millions, 2023' }),
      observed: 'Flint prints white 1,429 / 1,426 / 340 / 278 inside the four longest bars and nothing at all on Pakistan, Nigeria, Brazil and Bangladesh, although the expected panel fits 241, 224, 216 and 173 inside the same bars at the same type size. Flint also keeps the value axis and draws no vertical rule at zero.',
    },
    {
      id: 'zero-line',
      addressed: { stage: 'A7', note: 'The house’s `structure.baseline: "emphasised"` is drawn: a dark #222222 rule along the floor the chart chose (3%), where it was a pale gridline (A7). Whether the axis starts at zero stays the chart’s decision.' },
      title: 'The heavy #333333 baseline is not drawn where zero is the floor',
      kind: 'realization',
      severity: 'high',
      probe: 'zero-line',
      rule: '“Our design style … is to add a vertical or horizontal baseline to our charts: `geom_hline(yintercept = 0, size = 1, colour = "#333333")`” — on every chart, about 2px, darker than any gridline; the axis itself has no line.',
      current: 'Stated as `structure.baseline: "emphasised"`, `structure.grid.zero: "emphasised"` and `ink.structure.zero: #333333`. Grounding resolves `baseline` but no realizer reads it; the zero rule is drawn only when the data runs both sides of zero (it assumes the axis line already marks a floor at zero, which this house omits). On a line chart Flint also lets the y scale start above zero.',
      expected: 'A ~2px #333333 rule along zero under the line, the scale running down to it.',
      proposal: 'Draw `structure.baseline` at the measure’s zero (or its floor) whenever the axis line is omitted, and give it a weight: `structure.baselineWeight` / `grid.zeroWeight` in px.',
      flint: unemploymentFlint('Two shocks in 20 years', 'US unemployment rate, 2000-2023'),
      expectedSpec: titled(t, { layer: [unemploymentLine, zeroRule('y')] }, { title: 'Two shocks in 20 years', subtitle: 'US unemployment rate, 2000-2023', width: W + 60, height: H + 40 }),
      observed: 'Flint’s y scale runs 2–10, the floor gridline is the same pale #cbcbcb as the others, and the “2” tick label sits on top of the “2000” year label because no axis line separates them. In the gallery’s signed temperature chart the dark zero rule is drawn, so only the floor case fails.',
    },
    {
      id: 'palette-overflow',
      addressed: { stage: 'R1', note: 'Series past the four inks keep the house set and take a grey derived from the house, never Vega’s scheme.' },
      title: 'Past four series the house colours disappear',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'count-palette',
      rule: 'bbplot’s inks are teal-blue, amber, dark red and green; GEL asks for a neutral palette with colour reserved for what matters, and the house context grey is #dddddd.',
      current: 'The house names four inks and no overflow ink, so a five-slice pie is “exhausted”: Flint stops imposing the house set and hands the chart Vega’s default categorical scheme (steel blue, orange, red, teal, green).',
      expected: 'The four house inks in order, the remainder in the neutral grey.',
      proposal: 'When the house set is exhausted, keep it and fold the tail into a neutral (`ink.series.overflow`, defaulting to the context grey) rather than falling back to the renderer’s scheme; or report the fallback so the author can merge categories.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome dominates',
        subtitle: 'Desktop browser market share, %, 2024',
        baseSize: { width: W + 120, height: H + 90 },
      }),
      expectedSpec: titled({ ...t, legendOrient: 'top' }, {
        data: { values: BROWSERS },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          order: { field: 'Share', type: 'quantitative', sort: 'descending' },
          color: { field: 'Browser', type: 'nominal', sort: BROWSERS.map((row) => row.Browser), scale: { range: [BLUE, AMBER, '#990000', '#588300', '#dddddd'] }, legend: { orient: 'top', direction: 'horizontal', title: null, symbolType: 'square', labelFontSize: 18, columns: 3 } },
        },
        layer: [{ mark: { type: 'arc', outerRadius: 100, stroke: '#ffffff', strokeWidth: 1 } }],
      }, { title: 'Chrome dominates', subtitle: 'Desktop browser market share, %, 2024', width: W + 60, height: H + 40 }),
      observed: 'Flint’s pie is steel blue, orange, red, teal and green — not one of them a BBC ink — with round key swatches. The expected keeps teal-blue, amber, dark red and green and greys the last slice. The same fallback colours the six-source area chart in the gallery.',
    },
    {
      id: 'highlight',
      title: 'Colour reserved for the story, the rest neutral',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'highlight',
      rule: 'GEL: “Use a neutral colour palette so important information stands out more in comparison” and set highlight colours; bbplot charts put the subject in teal-blue against #dddddd.',
      current: 'Nothing in the chart spec names the subject and nothing in the theme names a context grey; every bar takes `ink.series.single`.',
      expected: 'Nigeria in #1380A1, the other countries in #dddddd.',
      proposal: '`chart_spec.emphasis: { field, values }` with `ink.series.emphasis` / `ink.series.context` in the theme.',
      ...highlightProbe(theme, t, { title: 'Nigeria leads Africa', subtitle: 'Population, millions, 2023' }),
      observed: 'Flint: every bar teal-blue, the deck extended with “; Population (m)”, the value axis thinned to 0 and 1,500 m. Expected: Nigeria alone in teal-blue against #dddddd bars.',
    },
    {
      id: 'annotation',
      title: 'Grey box-less notes with curved arrows',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'annotation',
      rule: 'Annotations are plain #555555 text (`geom_label(…, label.size = NA)`, size 6) with thin #555555 curved leaders and small arrowheads (`geom_curve(curvature = -0.2, arrow = …)`).',
      current: 'The theme can state the annotation type role (#555555, 17px), but the chart spec has nowhere to say what to annotate, and there is no leader style (curved, arrowed) in either.',
      expected: 'Two grey notes on the unemployment line, each joined to its peak by a curved arrow.',
      proposal: '`chart_spec.annotations: [{ at: { x, y }, text, dx, dy }]`, drawn with `type.annotation` and a theme `annotation.leader: { shape: "curve" | "straight" | "elbow", arrow: true, weight, color }`.',
      flint: unemploymentFlint('Two shocks in 20 years', 'US unemployment rate, 2000-2023'),
      expectedSpec: titled(t, {
        layer: [
          unemploymentLine,
          zeroRule('y'),
          ...curvedNote({ text: ['Financial crisis'], tx: 2001, ty: 11.6, path: [[2006.6, 11.15], [2008.8, 11.3], [2009.85, 9.95]], head: 165 }),
          ...curvedNote({ text: ['Covid-19', 'lockdowns'], tx: 2014.5, ty: 11.6, path: [[2018.7, 10.9], [2019.8, 10.6], [2019.97, 8.55]], head: 180 }),
        ],
      }, { title: 'Two shocks in 20 years', subtitle: 'US unemployment rate, 2000-2023', width: W + 60, height: H + 40 }),
      observed: 'Flint draws the bare line (scale from 2, no zero rule). Expected: grey “Financial crisis” and “Covid-19 lockdowns” notes, each joined to its peak by a thin curved leader with a small arrowhead.',
    },
    {
      id: 'label-chip',
      title: 'GEL pointer labels: a coloured chip on a stem',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'label-chip',
      rule: 'GEL label styles: beaked chips (grey, or BBC red with white text) and pointer labels — a grey, teal or yellow chip with a dark underline and a stem ending in a filled or open circle on the point.',
      current: '`type.annotation` is a type role only: it has no fill, underline, stem or end marker, and Flint draws no labels of this kind.',
      expected: 'A teal “Covid-19” chip with white text and a dark underline, its stem dropping to an open circle on the 2020 reading.',
      proposal: '`annotation.labelStyle: { fill, ink, underline, stem: { end: "dot" | "ring" | "none" }, beak }` in the theme, applied to chart-spec annotations.',
      flint: unemploymentFlint('Two shocks in 20 years', 'US unemployment rate, 2000-2023'),
      expectedSpec: titled(t, {
        layer: [
          unemploymentLine,
          zeroRule('y'),
          ...pointerLabel({ x: 2020, y: 8.1, text: 'Covid-19', fill: '#007A7A', ink: '#ffffff', lift: 2.6 }),
          ...pointerLabel({ x: 2010, y: 9.6, text: 'Crash', fill: '#c8c8c8', ink: INK, lift: 1.6 }),
        ],
      }, { title: 'Two shocks in 20 years', subtitle: 'US unemployment rate, 2000-2023', width: W + 60, height: H + 40 }),
      observed: 'Flint draws the bare line. Expected: a grey “Crash” chip and a teal “Covid-19” chip, each with a dark underline and a stem down to an open circle on the 2010 and 2020 readings.',
    },
    {
      id: 'date-label-format',
      title: 'Years shortened after the first: 2009, 10, 11 … 2016',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'date-label-format',
      rule: 'The GEL line-graph example labels its x axis “2009 10 11 12 13 14 15 2016” — full years only at the ends.',
      current: 'No ThemeSpec field governs temporal tick text; Flint prints every year in full.',
      expected: 'First and last year in full, two digits between.',
      proposal: '`annotation.dateLabels: { abbreviateRepeated: true, fullAt: "ends" | "centuries" }`.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(bbc, 'Gapminder', ['source-line']);

export default bbc;
