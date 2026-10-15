import type { ThemeSpec } from 'flint-chart';
import research from '../research/dallas-morning-news.json';
import { BROWSERS, EV_SHARE, flintInput, footerProbe, pieProbe, UNEMPLOYMENT, valueLabelProbe } from '../probes';
import { houseConfig, W, H, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

// Print sizes in pt × 4/3: a two-column graphic (22p9.6 ≈ 273pt) is ≈ 364px, the page's chart width.
const HEAD = "'Gotham Condensed', 'Arial Narrow', 'Roboto Condensed', 'Helvetica Neue', sans-serif";
const BODY = "Gotham, Montserrat, 'Helvetica Neue', Arial, sans-serif";
const CREDIT = "'Miller Text', Georgia, 'Times New Roman', serif";
const RED = '#bf0000';
const BLUE = '#53a6a6';
const BEIGE = '#cccc8f';
const OCRE = '#cca33d';
const GREEN = '#567345';
const BLACK = '#000000';
const GRID = '#808080';
const BEIGE_BOX = '#e6e6cf';
const BAR_ORDER = [RED, BLUE, BEIGE, OCRE, GREEN];
const LINE_ORDER = [RED, BLUE, OCRE, GREEN, BLACK];
const PIE = ['#a6a68d', '#d9d9c4', '#b8ccb8', '#ced9d9', '#bfbfac'];

const t: HouseTokens = {
  font: BODY,
  titleFont: HEAD,
  text: BLACK,
  muted: BLACK,
  grid: GRID,
  gridWidth: 0.5,
  axis: BLACK,
  background: '#FFFFFF',
  palette: BAR_ORDER,
  highlight: RED,
  context: BEIGE,
  titleSize: 21,
  titleWeight: 700,
  subtitleSize: 11,
  subtitleColor: BLACK,
  labelSize: 9.5,
  sourceSize: 7.5,
  lineWidth: 4,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'dallas-morning-news',
  label: 'The Dallas Morning News (2005)',
  ink: {
    surface: { source: 'house', canvas: '#FFFFFF' },
    text: { primary: BLACK, secondary: BLACK, muted: BLACK, inverse: '#FFFFFF' },
    structure: { grid: GRID, axis: BLACK, rule: BLACK, connector: BLACK },
    series: {
      single: RED,
      categorical: BAR_ORDER,
      // Fever lines swap the pale beige for ocre; pies take the pastel map tones (R7).
      byMark: { line: { categorical: LINE_ORDER }, arc: { categorical: PIE } },
      categoricalExtended: [...BAR_ORDER, '#ff8000', BLACK],
      sequential: { stops: ['#f2f2e6', '#e6e6cf', '#d9d9c4', '#ccccb8', '#b3b398'], space: 'lab' },
    },
    accent: RED,
  },
  type: {
    headline: { family: HEAD, size: 21, weight: 'bold', case: 'upper', color: BLACK },
    deck: { family: BODY, size: 11, weight: 'regular', color: BLACK },
    axisLabel: { family: BODY, size: 9.5, color: BLACK },
    axisTitle: { family: BODY, size: 9.5, style: 'italic', weight: 'regular', color: BLACK },
    keyLabel: { family: BODY, size: 9.5, color: BLACK },
    valueLabel: { family: BODY, size: 11, weight: 'bold', color: BLACK },
    annotation: { family: BODY, size: 11, weight: 'bold', color: BLACK },
    footnote: { family: BODY, size: 7.5, color: BLACK },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', suppressWhenValuesPrinted: true },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 0.5 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: { bandFraction: 0.5, strokeWeight: 4, strokeCap: 'butt' },
  geometry: {
    line: { width: 4 },
    point: { presence: 'omit', fill: 'hollow', size: 45, outlineWidth: 2 },
    band: { fraction: 0.5 },
    arc: { gap: 1, gapStyle: 'rule' },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
  dataLabels: { show: 'never', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: {
    unit: 'lastTick',
    axisTitles: 'whenAmbiguous',
    axisTitlePlacement: 'flatAboveAxis',
    numberFormat: { thousands: 'separator' },
    pointEmphasis: 'endpoints',
    pointLabels: 'never',
  },
  layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'normal' }, density: 'airy' },
  variants: [
    {
      when: { hasBandedAxis: false },
      then: { structure: { grid: { measure: 'full', category: 'full', weight: 0.5 } } },
      because: 'Fever charts are ruled both ways; bar charts horizontally only (stylebook pp. 16–17).',
    },
  ],
};

/** The graphic box: a hairline black rule around head, chart and source, 8pt inside. */
const BOX = { border: '0.75px solid #000000', padding: '10px 10px 6px', marginBottom: '22px', overflow: 'visible' };

const head = (title: string, intro: string) =>
  `<div style="margin:0 14px 2px">`
  + `<div style="font-family:${HEAD};font-weight:700;font-size:23px;line-height:1.05;letter-spacing:0.03em;text-transform:uppercase;font-stretch:condensed;color:#000">${title}</div>`
  + `<div style="font-family:${BODY};font-size:11px;line-height:1.35;color:#000;margin-top:6px;max-width:330px">${intro}</div></div>`;

const foot = (source: string, credit: string, note?: string) =>
  `<div style="position:relative;margin:0 14px">`
  + (note ? `<div style="font-family:${BODY};font-size:9.5px;line-height:1.35;color:#000;margin-bottom:4px">${note}</div>` : '')
  + `<div style="font-family:${BODY};font-size:7.5px;color:#000;letter-spacing:0.02em">SOURCE: ${source}</div>`
  + `<div style="position:absolute;right:-24px;bottom:-28px;font-family:${CREDIT};font-size:9.5px;color:#000;white-space:nowrap">${credit}</div></div>`;

/** Plain axis config for the print panels: labels black, grid 50% K hairline. */
function config(extra: Record<string, unknown> = {}) {
  const base = houseConfig(t);
  return { ...base, padding: { left: 14, right: 14, top: 6, bottom: 6 }, legend: { ...(base.legend as object), orient: 'top', symbolType: 'square', symbolSize: 60, labelFontSize: 9.5, labelColor: BLACK, offset: 10 }, ...extra };
}

/** Black reversed-out callout box with a white bold number, anchored above-left of a point. */
function callout(row: Record<string, unknown>, x: string, y: string, text: string, o: { dx?: number; dy?: number; w?: number } = {}) {
  const w = o.w ?? 44;
  const dx = o.dx ?? -w / 2;
  const dy = o.dy ?? -26;
  return [
    {
      data: { values: [row] },
      mark: { type: 'rect', color: BLACK, xOffset: dx - w / 2, x2Offset: dx + w / 2, yOffset: dy - 8, y2Offset: dy + 8 },
      encoding: { x: { field: x, type: 'quantitative' }, x2: { field: x }, y: { field: y, type: 'quantitative' }, y2: { field: y } },
    },
    {
      data: { values: [row] },
      mark: { type: 'text', color: '#FFFFFF', font: BODY, fontWeight: 'bold', fontSize: 11, align: 'center', baseline: 'middle', dx, dy, text },
      encoding: { x: { field: x, type: 'quantitative' }, y: { field: y, type: 'quantitative' } },
    },
  ];
}

const hollowEnds = (rows: Record<string, unknown>[], x: string, y: string, color: unknown) => ({
  data: { values: rows },
  mark: { type: 'point', shape: 'circle', filled: true, fill: '#FFFFFF', strokeWidth: 2, size: 50, opacity: 1 },
  encoding: { x: { field: x, type: 'quantitative' }, y: { field: y, type: 'quantitative' }, stroke: color },
});

const RECOVERY = UNEMPLOYMENT.filter((row) => row.Year >= 2009 && row.Year <= 2019);
const SIG_TITLE = 'Fewer jobless';
const SIG_INTRO = 'The U.S. unemployment rate fell every year after the 2009 recession.';

/** The stylebook's “FEWER TAKERS”: one thick red line on a beige box, hollow ends, labels on the gridlines, black callout. */
function signature() {
  const first = RECOVERY[0];
  const last = RECOVERY[RECOVERY.length - 1];
  const ticks = [2, 4, 6, 8, 10];
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    width: W - 20,
    height: H,
    layer: [
      {
        data: { values: [{ a: 2009, b: 2019 }] },
        mark: { type: 'rect', color: BEIGE_BOX },
        encoding: { x: { field: 'a', type: 'quantitative', scale: { domain: [2007.6, 2019.3], nice: false } }, x2: { field: 'b' }, y: { datum: 0 }, y2: { datum: 10 } },
      },
      {
        data: { values: [0, ...ticks].map((v) => ({ v })) },
        mark: { type: 'rule', color: GRID, strokeWidth: 0.5 },
        encoding: { y: { field: 'v', type: 'quantitative', title: null } },
      },
      {
        data: { values: RECOVERY },
        mark: { type: 'rule', color: GRID, strokeWidth: 0.5 },
        encoding: { x: { field: 'Year', type: 'quantitative', title: null }, y: { datum: 0, title: null }, y2: { datum: 10 } },
      },
      {
        data: { values: RECOVERY },
        mark: { type: 'line', strokeWidth: 4, color: RED, strokeJoin: 'miter' },
        encoding: {
          x: {
            field: 'Year', type: 'quantitative', title: null,
            axis: {
              values: RECOVERY.map((row) => row.Year), domain: false, grid: false, labelColor: BLACK, labelFontSize: 9.5,
              labelExpr: "datum.value === 2009 ? '2009' : '\\u2019' + slice(format(datum.value, 'd'), 2)",
            },
          },
          y: {
            field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 10] },
            axis: null,
          },
        },
      },
      {
        data: { values: ticks.map((v) => ({ v, label: v === 10 ? '10%' : String(v) })) },
        mark: { type: 'text', align: 'left', baseline: 'bottom', dy: -1, font: BODY, fontSize: 9.5, color: BLACK },
        encoding: { x: { value: 0 }, y: { field: 'v', type: 'quantitative', title: null }, text: { field: 'label' } },
      },
      hollowEnds([first, last], 'Year', 'Unemployment (%)', { value: RED }),
      {
        data: { values: [first] },
        mark: { type: 'text', align: 'left', dx: 6, dy: 13, font: BODY, fontSize: 9.5, color: BLACK, text: '9.3' },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' } },
      },
      ...callout(last, 'Year', 'Unemployment (%)', '3.7%', { dx: -6, dy: -24, w: 42 }),
    ],
  };
}

/** “UNEMPLOYMENT” on p. 17: narrow red columns, the unit note in italics, % only on the top label, one black callout with a pointer. */
function columnCallout() {
  const rows = UNEMPLOYMENT.filter((row) => row.Year >= 2006);
  const peak = rows.find((row) => row.Year === 2010)!;
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config(),
    width: W - 20,
    height: H - 20,
    layer: [
      {
        data: { values: rows },
        mark: { type: 'bar', color: RED, width: 9 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2005.3, 2023.7], nice: false }, axis: { values: rows.map((r) => r.Year).filter((y) => y % 2 === 0), labelExpr: "datum.value === 2006 ? '2006' : '\\u2019' + slice(format(datum.value, 'd'), 2)", grid: false, domainColor: BLACK, labelColor: BLACK } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: null, scale: { domain: [0, 12] }, axis: { values: [0, 3, 6, 9, 12], labelExpr: "datum.value === 12 ? '12%' : datum.label", labelColor: BLACK, labelAlign: 'left', labelPadding: 22 } },
        },
      },
      {
        data: { values: [peak] },
        mark: { type: 'rule', color: BLACK, strokeWidth: 0.7 },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'Unemployment (%)', type: 'quantitative' }, y2: { datum: 11.2 } },
      },
      ...callout({ ...peak, top: 11.2 }, 'Year', 'top', '9.6%', { dx: 0, dy: 0, w: 42 }),
      {
        data: { values: [{}] },
        mark: { type: 'text', align: 'left', baseline: 'bottom', font: BODY, fontStyle: 'italic', fontSize: 9.5, color: BLACK, text: '(In percent)', dx: -22, dy: -12 },
        encoding: { x: { value: 0 }, y: { value: 0 } },
      },
    ],
  };
}

const EV_TWO = EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China');

/** Two fever lines keyed by small solid squares; hollow end circles; line order red, blue. */
function squareKey() {
  const color = { field: 'Country', type: 'nominal', scale: { domain: ['Norway', 'China'], range: [RED, BLUE] } };
  const ends = EV_TWO.filter((row) => row.Year === 2018 || row.Year === 2023);
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: config({ legend: { ...(config().legend as object), orient: 'top', direction: 'vertical', symbolType: 'square', symbolSize: 55, symbolStrokeWidth: 0, rowPadding: 2 } }),
    width: W - 20,
    height: H,
    layer: [
      {
        data: { values: EV_TWO },
        mark: { type: 'line', strokeWidth: 4 },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2017.6, 2023.3], nice: false }, axis: { values: [2018, 2019, 2020, 2021, 2022, 2023], labelExpr: "datum.value === 2018 ? '2018' : '\\u2019' + slice(format(datum.value, 'd'), 2)", grid: true, gridColor: GRID, gridWidth: 0.5, domain: false, labelColor: BLACK } },
          y: { field: 'EV share (%)', type: 'quantitative', title: null, scale: { domain: [0, 100] }, axis: { values: [0, 25, 50, 75, 100], labelExpr: "datum.value === 100 ? '100%' : datum.label", labelAlign: 'left', labelPadding: 24, labelColor: BLACK } },
          color: { ...color, legend: { symbolType: 'square', symbolSize: 14, symbolStrokeWidth: 5 } },
        },
      },
      hollowEnds(ends, 'Year', 'EV share (%)', { ...color, legend: null }),
      ...callout(ends.find((r) => r.Country === 'Norway' && r.Year === 2023)!, 'Year', 'EV share (%)', '93%', { dx: -8, dy: -22, w: 40 }),
    ],
  };
}

/** The stylebook pie: pastel map tones from 12 o’clock clockwise, every label outside on a 0.5pt black pointer. */
function pastelPie() {
  const rows = BROWSERS.slice().sort((a, b) => b.Share - a.Share);
  const total = rows.reduce((sum, row) => sum + row.Share, 0);
  const cx = W / 2;
  const cy = H / 2;
  const r = 72;
  let acc = 0;
  const pointers = rows.map((row) => {
    const mid = ((acc + row.Share / 2) / total) * 2 * Math.PI;
    acc += row.Share;
    const at = (radius: number) => ({ x: cx + radius * Math.sin(mid), y: cy - radius * Math.cos(mid) });
    const a = at(r - 4);
    const b = at(r + 14);
    const right = Math.sin(mid) >= 0;
    return { x: a.x, y: a.y, x2: b.x, y2: b.y, lx: b.x + (right ? 3 : -3), ly: b.y, align: right ? 'left' : 'right', label: `${row.Browser} ${row.Share}%` };
  });
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...config(), legend: { disable: true } },
    width: W,
    height: H,
    layer: [
      {
        data: { values: rows },
        mark: { type: 'arc', outerRadius: r, stroke: '#FFFFFF', strokeWidth: 1 },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          order: { field: 'Share', type: 'quantitative', sort: 'descending' },
          color: { field: 'Browser', type: 'nominal', sort: rows.map((row) => row.Browser), scale: { range: PIE } },
        },
      },
      {
        data: { values: pointers },
        mark: { type: 'rule', color: BLACK, strokeWidth: 0.7 },
        encoding: { x: { field: 'x', type: 'quantitative', scale: null }, y: { field: 'y', type: 'quantitative', scale: null }, x2: { field: 'x2' }, y2: { field: 'y2' } },
      },
      ...(['left', 'right'] as const).map((align) => ({
        data: { values: pointers.filter((p) => p.align === align) },
        mark: { type: 'text', align, baseline: 'middle', font: BODY, fontSize: 9.5, color: BLACK },
        encoding: { x: { field: 'lx', type: 'quantitative', scale: null }, y: { field: 'ly', type: 'quantitative', scale: null }, text: { field: 'label' } },
      })),
    ],
  };
}

/** Bars with their numbers in Gotham Bold and no scale. */
function numbersNoScale() {
  const spec = valueLabelProbe(theme, { ...t, grid: null }, { placement: 'outside', hideAxis: true }).expectedSpec as Record<string, unknown>;
  const layer = (spec.layer as Record<string, unknown>[]).map((l, i) => (i === 1 ? { ...l, mark: { ...(l.mark as object), fontWeight: 'bold', fontSize: 11, font: BODY } } : l));
  const rest = Object.fromEntries(Object.entries(spec).filter(([key]) => key !== 'title'));
  return { ...rest, config: config(), layer };
}

const dmn: StyleGuideTheme = {
  id: 'dallas-morning-news',
  org: 'The Dallas Morning News',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the October 2005 print Graphics Stylebook. Its sizes are points for print; they were scaled by 4/3, which makes a two-column graphic (22p9.6) the page’s 360px chart. Its colours are CMYK only; the hexes are the naive conversions the research sampled from the PDF.',
    'Stated directly: an UPPERCASE bold condensed headline (Gotham Condensed is proprietary and falls back to Arial Narrow) over a short Gotham Book intro (Montserrat stands in); black text; DMN red `#bf0000` as the single-series ink and first of the bar order red, blue, beige, ocre, green; 0.5px 50%-grey gridlines, horizontal for bars and both ways for fever charts (a `variants` entry on `hasBandedAxis`); a black baseline and no y-axis line; 4px (3pt) lines with hollow circles at both ends (`pointEmphasis: endpoints`, `point.fill: hollow`); bars half their band; a small square key above the chart; the unit only on the top tick (`unit: lastTick`) with an italic unit note above the axis; and “if you put the numbers on the bars, delete the scale” (`suppressWhenValuesPrinted`).',
    'The stated sequential ramp is the stylebook’s neutral map tints; it reads weakly on a heatmap (see the gallery), but it is what the guide gives.\n\nNot stateable: the thin black box round the whole graphic, the SOURCE line inside it and the staff credit outside, black callout boxes, the beige plot box that only single-line fever charts get, a separate line order (ocre third, not beige) and pie palette, square keys for lines, the headline’s tracking and condensed width — see the gaps. Years abbreviated after the first (2000 ’01 ’02) have no field either; the signature panel shows them.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'The stylebook’s “FEWER TAKERS” fever chart: a 0.25pt black box round the graphic; UPPERCASE Gotham Condensed Bold head and a one-sentence Gotham Book intro; y labels left-aligned on top of 50%-grey hairline gridlines (both directions); a single 3pt red line on a beige plot box; 5pt hollow circles at the ends; the first value as a plain label and the key value in a black box with a white bold number; years “2000 ’01 ’02”; “SOURCE:” tiny inside the box at the bottom left, “NAME/Staff Artist” in Miller outside it at the right.',
      current: 'The theme states the uppercase head, red, the gridlines both ways, the 4px line with hollow end circles and % on the top label. It has no field for the box, the beige plot, the callout or the credit; of what it states, Flint draws the red line and the grid but not the capitals, the hollow ends or the %.',
      expected: 'The stylebook specimen applied to US unemployment, 2009–19.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: RECOVERY,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: SIG_TITLE,
        subtitle: SIG_INTRO,
      }),
      expectedSpec: signature(),
      expectedFrame: { style: BOX, headerHtml: head(SIG_TITLE, SIG_INTRO), footerHtml: foot('U.S. Bureau of Labor Statistics', 'JANE DOE/Staff Artist') },
      observed: 'Flint (left): a condensed bold head (the Arial Narrow fallback) but in mixed case; a regular-weight intro; the 4px red line with gridlines both ways — the `hasBandedAxis` variant works — but on white, with no beige box; a flat “Unemployment (%)” title and no % on the top label (Flint drops the unit because the title names it); every second year in full; small solid end dots; no callout, box, source or credit. Expected (right): the specimen — beige box, labels on the gridlines, hollow ends, “9.3” plain and “3.7%” reversed out of black, 2009 ’11 ’13 …, SOURCE inside the box and the credit outside.',
    },
    {
      id: 'source-box',
      title: 'SOURCE inside the box, staff credit outside it',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: '“SOURCE: Army National Guard” in Gotham Book 5.5/7pt with the lead word in capitals, inside the box at the bottom left; notes (“Note: …”, under 20 words) above it; the credit “NAME/Staff Artist” (or “Associated Press”) in Miller Text Roman 7pt outside the box, bottom right.',
      current: 'The chart spec has no source, note or credit slot, and the theme has no furniture that sits outside the chart’s own frame.',
      expected: 'Note and SOURCE inside the box at the bottom left; the serif credit hanging under the box’s bottom-right corner.',
      proposal: '`chart_spec.source`, `chart_spec.notes[]`, `chart_spec.credit`; a theme `annotation.sourceLabel: { text: "SOURCE:", case: "upper" }` and `furniture: { kind: "credit", anchor: "outsideBottomRight", type }`.',
      flint: footerProbe(theme, t, { title: 'Most populous', subtitle: 'India and China together hold more than a third of humanity.', footer: [] }).flint,
      expectedSpec: { ...(footerProbe(theme, t, { title: '', subtitle: '', footer: [] }).expectedSpec as Record<string, unknown>), config: config() },
      expectedFrame: {
        style: BOX,
        headerHtml: head('Most populous', 'India and China together hold more than a third of humanity.'),
        footerHtml: foot('United Nations World Population Prospects', 'JANE DOE/Staff Artist', 'Note: Population in millions, 2023.'),
      },
      observed: 'Flint (left): no box, note, source or credit, and the head in mixed case; the value axis ends “1,500 m”, the unit on the last tick only, as stated. Expected (right): note and SOURCE inside a hairline box, the serif credit hanging outside its bottom-right corner.',
    },
    {
      id: 'graphic-box',
      title: 'A 0.25pt black box round the whole graphic',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'card-container',
      rule: '“Box: 0.25pt, 100K” around head, intro, chart and source, with 8pt inner spacing for one- and two-column graphics (10pt for three to four, one pica for five to six); dropped only for large graphics with Miller heads.',
      current: '`structure.frame` frames the *plot* (Vega-Lite’s view stroke), not the graphic; there is no container rule that encloses the title block and the footer. This theme leaves `frame: omit` rather than draw a box in the wrong place.',
      expected: 'See the signature, source and callout panels: one hairline rectangle round everything, the credit outside it.',
      proposal: '`layout.container: { rule: { weight, ink }, padding }` (or a `furniture: { kind: "graphicRule" }`), drawn by the realizer as a group stroke on the outermost bounds, with padding stepping by column width through `variants` on `canvasWidth`.',
    },
    {
      id: 'black-callout',
      title: 'Key numbers in black boxes with white bold figures',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'annotation',
      rule: '“Black callout is the standard”: the key value reversed out of a black box in Gotham Bold 8/9pt (never smaller), joined by a 0.5pt black pointer; white callouts once there are more than three. If the graphic has a scale, no numbers on the bars “except the callout”.',
      current: 'The chart spec has no way to mark the value that matters, and the theme no callout style; Flint prints no numbers (the house asks for none) and nothing marks 2010.',
      expected: 'Red columns with one black “9.6%” box over the 2010 column on a thin pointer; the italic “(In percent)” note above the axis and % on the top label only.',
      proposal: '`chart_spec.annotations[{ kind: "callout", at }]` with a theme `annotation.callout: { fill: "inverse", ink, weight: "bold", pointer: { weight }, maxBeforeLight: 3 }`.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: UNEMPLOYMENT.filter((row) => row.Year >= 2006),
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment',
        subtitle: 'The jobless rate peaked in 2010 after the financial crisis.',
      }),
      expectedSpec: columnCallout(),
      expectedFrame: { style: BOX, headerHtml: head('Unemployment', 'The jobless rate peaked in 2010 after the financial crisis.'), footerHtml: foot('U.S. Department of Labor', 'Associated Press') },
      observed: 'Flint (left): red columns at half their band, as stated, but every second year turned 45°, a flat “Unemployment (%)” title instead of an italic “(In percent)” note, no % on the top label, and nothing marks 2010. Expected (right): a black “9.6%” box on a pointer over 2010, “(In percent)” above the axis, “12%” on the top label, years ’08 ’10 … flat.',
    },
    {
      id: 'square-key',
      title: 'Every key is a small solid square — lines too',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'legend-swatch',
      rule: 'Keys are ITC Zapf Dingbats ■ 8/12 squares in the series colour, set above the chart under the intro, for bar and fever charts alike.',
      current: '`legend.swatch` only accepts `auto`, and Flint chooses the symbol per mark.',
      expected: 'Norway and China keyed by small red and blue squares, stacked above the plot; thick lines ending in hollow circles; the key value in a black callout.',
      proposal: '`legend.swatch: { all: "square" }` with a size, as a house-wide override of the per-mark default.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_TWO,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Electric takeover',
        subtitle: 'Nearly all new cars sold in Norway are electric.',
      }),
      expectedSpec: squareKey(),
      expectedFrame: { style: BOX, headerHtml: head('Electric takeover', 'Nearly all new cars sold in Norway are electric.'), footerHtml: foot('International Energy Agency', 'JANE DOE/Staff Artist') },
      observed: 'Flint (left): the key uses filled circles, the end markers are small solid dots and the years are printed in full. Expected (right): small solid squares stacked above the plot, hollow rings at the line ends, a black “93%” callout.',
    },
    {
      id: 'per-mark-palette',
      addressed: { stage: 'R7', note: 'Line and pie orders are stated as `ink.series.byMark.line` and `.arc`; bars keep the general order.' },
      title: 'Lines, bars and pies each have their own colour order',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'per-mark-palette',
      rule: 'Bars: red, blue, beige, ocre, green. Fever lines: red, blue, **ocre**, green, black (beige is too pale for a 3pt line). Pies: pastel map tones — Country `#a6a68d`, Land, Park, Silver, Neighbor — first slice from 12 o’clock, labels outside with 0.5pt black pointers, never more than five slices.',
      current: 'ThemeSpec has one categorical list for every mark, and `variants` may not change `ink`; this theme states the bar order, so a pie takes red, blue and beige and a third line would be pale beige.',
      expected: 'The browser pie in the five pastel tones with outside labels.',
      proposal: 'Per-geometry palettes (`geometry.arc.palette`, `geometry.line.palette`), or let `variants` keyed on `markChannel` carry `ink.series`.',
      flint: pieProbe(theme, t).flint,
      expectedSpec: pastelPie(),
      expectedFrame: { style: BOX, headerHtml: head('Chrome dominates desktop browsing', 'Desktop browser market share, %, 2024'), footerHtml: foot('StatCounter', 'JANE DOE/Staff Artist') },
      observed: 'Flint (left): the pie in the bar order — red, teal, beige, ocre, green — with a key above instead of labels outside. In the gallery the four-line EV chart draws Germany as a pale beige line, and the scatter’s dots (hollow, because `geometry.point.fill` also reaches them) almost vanish in beige and ocre. Expected (right): the five pastel tones from 12 o’clock, every label outside on a black pointer.',
    },
    {
      id: 'scale-or-numbers',
      addressed: { stage: 'L6', note: 'With the ruler gone, its title moves into the deck — or goes, where the headline or deck already names the quantity — instead of floating under the bars (L6). The unit on every value stays open.' },
      title: 'Numbers on the bars delete the scale — but its title stays',
      kind: 'realization',
      severity: 'low',
      probe: 'labels-replace-axis',
      rule: '“If you use a scale (axis) on the graphic, don’t put numbers on the bars (except the callout). If you put the numbers on the bars, delete the scale.”',
      current: 'Stated as `structure.axis.measure.suppressWhenValuesPrinted: true`; the chart asks for labels with `showTextLabels`. Flint deletes the ruler but not the axis title, and prints the unit with every value.',
      expected: 'Bold numbers at the bar ends; no value axis, gridlines or axis title; the unit stated once (here in the intro).',
      proposal: 'Suppressing an axis should suppress its title with it (or move it to the deck, as `axisTitles: omit` does); `annotation.unit` should govern printed values as well as ticks (`firstOnly`).',
      flint: valueLabelProbe(theme, t, { placement: 'outside' }).flint,
      expectedSpec: numbersNoScale(),
      expectedFrame: { style: BOX, headerHtml: head('India and China hold over a third of humanity', 'Population, millions, 2023'), footerHtml: foot('United Nations', 'JANE DOE/Staff Artist') },
      observed: 'Flint (left): the value axis and its gridlines are deleted — the rule is honoured — but the “Population” axis title stays, floating under the bars with nothing to name, and every number carries the unit (“1,429 m”). Expected (right): bold numbers, no scale, no title; the unit stated once in the intro.',
    },
    {
      id: 'beige-box',
      title: 'Single-line fever charts sit on a beige box; multi-line charts do not',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'plot-fill',
      rule: '“Fever charts with only one line should have beige box. Charts with more than one line shouldn’t.” (0C 0M 10Y 10K).',
      current: '`ink.surface.plot` could paint the plot beige, but for every chart; `variants` can test `seriesCount` but may not vary `ink`. The theme leaves the plot white.',
      expected: 'See the signature panel: beige behind the single line, from its first year to its last; the two-line panel on white.',
      proposal: 'Allow `ink.surface` in a variant (`when: { seriesCount: { eq: 1 }, markChannel: "position" }`), or a `structure.plotFill: { when: "singleSeries", ink }`.',
    },
    {
      id: 'upper-head',
      addressed: { stage: 'T3', note: 'The headline is set in capitals (`headline.case: "upper"`), measured as drawn.' },
      title: 'The UPPERCASE head is drawn in mixed case, and cannot be condensed or tracked',
      kind: 'realization',
      severity: 'high',
      probe: 'type-case',
      rule: '“Graphic heads are always UPPERCASE. Gotham Cond Bold 16pt, AV30, T 110%” — 16pt for one or two columns, 20pt for three or four, 24pt for five or six.',
      current: 'Stated as `type.headline.case: "upper"`, but the compiled title keeps the author’s case: “Fewer jobless”, “Most populous”. `TypeRole` also has no tracking (AV30 ≈ +0.03em) or width, and the size cannot step with the column count, because `variants` may not vary `type`.',
      expected: 'FEWER JOBLESS — narrow, bold, slightly letter-spaced capitals.',
      proposal: 'Realise `case` on the title and deck text (`upper` → transform the string, as Vega has no text-transform); add `TypeRole.tracking` (em) and `TypeRole.stretch`; let a `canvasWidth` variant vary `type.headline.size`.',
      observed: 'Every Flint panel on this page sets its head in mixed case (“Fewer jobless”, “Unemployment”, “Electric takeover”); the Arial Narrow fallback does draw it condensed and bold. Every expected panel sets it in capitals.',
    },
    {
      id: 'hollow-ends',
      addressed: { stage: 'M5', note: 'End markers follow the house’s hollow dots: a ring in the series ink round the surface. Their size is the emphasis size, not the house’s 45px².' },
      title: 'Line ends are hollow circles, not solid dots',
      kind: 'realization',
      severity: 'medium',
      probe: 'point-visibility',
      rule: 'Fever lines end in a 5pt circle with a 1.5pt stroke and a white fill (“5pt circle, 1.5 stroke, White fill”).',
      current: 'Stated as `annotation.pointEmphasis: "endpoints"` with `geometry.point.fill: "hollow"` and `outlineWidth: 2`. Flint draws the end markers but filled, and small: `point.fill` is not read by the endpoint layer.',
      expected: 'A white-filled ring in the line’s colour at each end, about as wide as the line is thick ×2.',
      proposal: 'Let the point-emphasis layer read `geometry.point.fill`, `size` and `outlineWidth` like any other point.',
      observed: 'Signature and square-key panels (left): solid red and teal dots at the ends, smaller than the 4px line is thick. Expected (right): hollow rings with white centres.',
    },
  ],
};

export default dmn;
