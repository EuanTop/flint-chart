import type { ThemeSpec } from 'flint-chart';
import research from '../research/cfpb.json';
import { ANOMALY, EV_SHARE, flintInput, POPULATION, signedProbe } from '../probes';
import { houseConfig, titled, W, H as HEIGHT, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FONT = "'Source Sans 3', 'Source Sans 3 Variable', Arial, sans-serif";
const HEAD = "'Avenir Next', 'Source Sans 3', Arial, sans-serif";
const GREY = '#5a5d61';
const BLACK = '#101820';
const RULE = '#d2d3d5';
const GREEN = '#20aa3f';
const NAVY = '#254b87';
const PACIFIC = '#7eb7e8';
const GOLD = '#ffb858';
const PURPLE = '#c55998';
const PALETTE = [GREEN, NAVY, PACIFIC, GOLD, PURPLE];
/** Highcharts dash styles in the guide's order: solid, short dash, dot, dash, long dash. */
const DASHES = [[1, 0], [5, 3], [1.5, 2.5], [9, 4], [15, 5]];

const t: HouseTokens = {
  font: FONT,
  titleFont: HEAD,
  text: BLACK,
  muted: GREY,
  grid: RULE,
  axis: RULE,
  background: '#ffffff',
  palette: PALETTE,
  titleSize: 22,
  titleWeight: 700,
  subtitleSize: 16,
  subtitleColor: BLACK,
  labelSize: 16,
  sourceSize: 12,
  lineWidth: 2,
  legendOrient: 'top',
};

const theme: ThemeSpec = {
  id: 'cfpb',
  label: 'Consumer Financial Protection Bureau',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: BLACK, secondary: GREY, muted: GREY },
    structure: { axis: RULE, grid: RULE },
    series: {
      single: GREEN,
      categorical: PALETTE,
      // “Include no more than five data types”: no extended set; anything past five is the chart's problem.
      overflow: '#b4b5b6',
      diverging: { stops: ['#d14124', '#e79e8e', '#f7f8f9', '#89b6b5', '#257675'], neutral: '#f7f8f9', space: 'lab' },
      status: { positive: '#257675', negative: '#d14124', neutral: '#b4b5b6' },
      selection: { signed: 'status', statusUse: 'anySigned' },
    },
    accent: GREEN,
  },
  type: {
    headline: { family: HEAD, size: 22, weight: 'bold', case: 'asIs', color: BLACK },
    deck: { family: FONT, size: 16, weight: 'regular', color: BLACK },
    axisLabel: { family: FONT, size: 16, color: GREY },
    axisTitle: { family: FONT, size: 16, weight: 'regular', color: GREY },
    keyLabel: { family: FONT, size: 16, color: GREY },
    valueLabel: { family: FONT, size: 12, color: GREY },
    footnote: { family: FONT, size: 12, color: BLACK },
  },
  structure: {
    axis: {
      categorical: { line: 'full', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'full', lineWeight: 1, ticks: 'omit' },
    },
    grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'full',
  },
  marks: {
    bandFraction: 0.6,
    strokeWeight: 2,
    redundantEncoding: 'always',
    redundantChannels: ['dash', 'texture'],
    // The house patterns in order: solid, white dots, white diagonal hatch (R13).
    texture: { patterns: ['solid', 'dots', 'diagonal'], ink: 'white' },
  },
  geometry: {
    line: { width: 2 },
    point: { presence: 'full', size: 28, fill: 'solid' },
    band: { fraction: 0.6, cornerRadius: 0 },
  },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['top', 'bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start', suppressWhenAxisNames: true },
  dataLabels: { show: 'never' },
  annotation: {
    axisTitles: 'always',
    axisTitlePlacement: 'rotated',
    unit: 'never',
    numberFormat: { thousands: 'suffix', precision: 'auto', compact: { style: 'upper', threshold: 1000 } },
  },
  layout: { titleBlock: { anchor: 'start', gap: 'normal' } },
  compileDefaults: { baseSize: { width: 670, height: 500 } },
  variants: [
    {
      when: { canvasWidth: { lte: 540 } },
      then: { annotation: { axisTitlePlacement: 'flatAboveAxis' }, legend: { align: 'start' } },
      because: 'At 540px and below the production chart turns the y title flat above the axis and left-aligns the key.',
    },
  ],
};

// ---------------------------------------------------------------------------
// The guide's “required information” specimen: five lines of credit card debt.

const SERIES = ['Did not have trouble', 'Did have trouble', 'Third line', 'Fourth line', 'Fifth line'];
const DATES = ['2018-06-15', '2018-09-15', '2018-12-15', '2019-03-15', '2019-06-15', '2019-09-15'];
const DATE_LABELS = ['June 2018', 'Sept 2018', 'Dec 2018', 'March 2019', 'June 2019', 'Sept 2019'];
const TOP = [6500, 6300, 7000, 5900, 6700, 5500];
const DEBT = SERIES.flatMap((Series, s) => DATES.map((Date, i) => ({
  Date, Label: DATE_LABELS[i], Series, 'Credit card debt (in dollars)': TOP[i] - s * 1000,
})));
const DEBT_FLINT = DEBT.map(({ Date, Series, 'Credit card debt (in dollars)': v }) => ({ Date, Series, 'Credit card debt (in dollars)': v }));
const SIG_TITLE = 'Average credit card debt';
const SIG_DECK = 'Average credit card debt by whether respondent reported having “difficulty paying a bill or expense” in the 12 months before June 2019';

/** The ≤540px rule: the y title flat, left-aligned above the axis. */
const FLAT_Y_TITLE = { titleAngle: 0, titleAlign: 'left', titleAnchor: 'end', titleBaseline: 'bottom', titleX: -30, titleY: -10 };

const dashScale = (domain: string[]) => ({ domain, range: DASHES.slice(0, domain.length) });
const colorScale = (domain: string[]) => ({ domain, range: PALETTE.slice(0, domain.length) });

/** Five dashed lines with small dots, wide pattern swatches in a key above, a rotated y title. */
function linesView(rows: Record<string, unknown>[], o: { domain: string[]; x: Record<string, unknown>; yField: string; yTitle: string | null; yDomain?: number[]; points?: boolean; flatTitle?: boolean }) {
  const y = {
    field: o.yField, type: 'quantitative', title: o.yTitle,
    ...(o.yDomain ? { scale: { domain: o.yDomain } } : {}),
    axis: {
      format: ',.0f', domain: true, domainColor: RULE, titleColor: GREY, titleFontSize: 14, titlePadding: 10,
      ...(o.flatTitle ? FLAT_Y_TITLE : {}),
    },
  };
  return {
    data: { values: rows },
    layer: [
      {
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: o.x, y,
          color: {
            field: 'Series', type: 'nominal', scale: colorScale(o.domain),
            legend: { orient: 'top', direction: 'horizontal', symbolType: 'stroke', symbolStrokeWidth: 5, symbolSize: 700, labelFontSize: 13, labelColor: GREY, columnPadding: 12, labelLimit: 160, offset: o.flatTitle ? 30 : 10 },
          },
          strokeDash: { field: 'Series', type: 'nominal', scale: dashScale(o.domain), legend: null },
        },
      },
      ...(o.points === false ? [] : [{
        mark: { type: 'circle', size: 30, opacity: 1 },
        encoding: { x: o.x, y, color: { field: 'Series', type: 'nominal', scale: colorScale(o.domain), legend: null } },
      }]),
    ],
  };
}

function signatureExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), axis: { ...(houseConfig(t).axis as object), labelFontSize: 13, titleFontSize: 14 } },
    width: 480,
    height: 250,
    ...linesView(DEBT, {
      domain: SERIES,
      x: { field: 'Label', type: 'ordinal', sort: DATE_LABELS, title: 'Date', scale: { padding: 0.1 }, axis: { labelAngle: 0, domain: true, domainColor: RULE, titlePadding: 8 } },
      yField: 'Credit card debt (in dollars)',
      yTitle: 'Credit card debt (in dollars)',
      yDomain: [1000, 8000],
    }),
  };
}

const header = (figure: string, title: string, deck?: string) =>
  `<div style="margin:0 14px 10px;font-family:${FONT};color:${BLACK}">`
  + `<div style="font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">${figure}</div>`
  + `<div style="font-family:${HEAD};font-size:26px;font-weight:700;margin-top:6px;line-height:1.15">${title}</div>`
  + (deck ? `<div style="font-size:16px;line-height:1.375;margin-top:8px;max-width:540px">${deck}</div>` : '')
  + '</div>';

const DL_ICON = `<svg width="11" height="12" viewBox="0 0 11 12" style="vertical-align:-1px;margin-left:3px"><rect x="0.5" y="0.5" width="10" height="11" rx="1" fill="none" stroke="#0072ce"/><path d="M5.5 3v5M3.5 6l2 2 2-2" stroke="#0072ce" fill="none"/></svg>`;

const footer = (source: string, notes: string) =>
  `<div style="margin:12px 14px 6px;padding-top:14px;border-top:1px solid #b4b5b6;font-family:${FONT};font-size:12px;line-height:1.5;color:${BLACK}">`
  + `<div><b>Source:</b> ${source}</div>`
  + `<div><b>Date published:</b> October 1, 2024</div>`
  + `<div><b>Download:</b> <a href="#" style="color:#0072ce;text-decoration:none;border-bottom:1px dotted #0072ce">Source data spreadsheet</a>${DL_ICON}</div>`
  + `<div><b>Notes:</b> ${notes}</div></div>`;

const debtFlint = (rows: Record<string, unknown>[], multi: boolean, extra: { title?: string; subtitle?: string; baseSize?: { width: number; height: number } } = {}) => flintInput(theme, {
  chartType: 'Line Chart',
  data: rows,
  semantic_types: { Date: 'Date', Series: 'Category', 'Credit card debt (in dollars)': { semanticType: 'Amount', unit: 'USD' } },
  encodings: multi
    ? { x: 'Date', y: 'Credit card debt (in dollars)', color: 'Series' }
    : { x: 'Date', y: 'Credit card debt (in dollars)' },
  ...extra,
});

// ---------------------------------------------------------------------------
// Stacked columns with pattern fills, as the guide's stacked-bar specimen.

const FARE = [
  ['Sep 2024', 350, 28, 18], ['Oct 2024', 400, 30, 22], ['Nov 2024', 575, 45, 30], ['Dec 2024', 450, 35, 24],
].flatMap(([Month, base, tax, fee]) => [
  { Month, Component: 'Base fare', 'Total cost': base },
  { Month, Component: 'Taxes', 'Total cost': tax },
  { Month, Component: 'Fees', 'Total cost': fee },
]);

/** SVG patterns the expected panel's fills point at (`url(#…)`), defined once in the frame. */
const PATTERNS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
  + `<pattern id="cfpb-dots" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${NAVY}" fill-opacity="0.75"/><circle cx="1.75" cy="1.75" r="0.9" fill="#ffffff" fill-opacity="0.65"/><circle cx="5.25" cy="5.25" r="0.9" fill="#ffffff" fill-opacity="0.65"/></pattern>`
  + `<pattern id="cfpb-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${PACIFIC}"/><rect width="2.2" height="6" fill="#ffffff" fill-opacity="0.75"/></pattern>`
  + '</defs></svg>';

function stackedExpected() {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...houseConfig(t), axis: { ...(houseConfig(t).axis as object), labelFontSize: 13, titleFontSize: 14 }, legend: { ...(houseConfig(t).legend as object), orient: 'bottom', labelColor: GREY, labelFontSize: 13 } },
    title: { text: 'November fares cost the most', subtitle: 'Average total cost of a ticket, dollars' },
    width: W,
    height: HEIGHT,
    data: { values: FARE },
    mark: { type: 'bar', width: { band: 0.68 } },
    encoding: {
      x: { field: 'Month', type: 'ordinal', sort: null, title: 'Date', axis: { labelAngle: 0, domain: true, domainColor: RULE } },
      y: { field: 'Total cost', type: 'quantitative', title: 'Total cost', axis: { grid: false, domain: true, domainColor: RULE } },
      color: {
        field: 'Component', type: 'nominal', sort: ['Base fare', 'Taxes', 'Fees'],
        scale: { domain: ['Base fare', 'Taxes', 'Fees'], range: ['#74b86c', 'url(#cfpb-dots)', 'url(#cfpb-hatch)'] },
        legend: { symbolType: 'square', symbolSize: 260, title: null },
      },
      order: { field: 'stackOrder', type: 'quantitative' },
    },
    transform: [{ calculate: "indexof(['Base fare', 'Taxes', 'Fees'], datum.Component)", as: 'stackOrder' }],
  };
}

// ---------------------------------------------------------------------------
// Four lines told apart by dash as well as colour.

const EV_DOMAIN = ['Norway', 'China', 'Germany', 'United States'];
const EV_LABELS: Record<number, string> = { 2018: '2018', 2020: '2020', 2022: '2022', 2023: '2023' };

const cfpb: StyleGuideTheme = {
  id: 'cfpb',
  org: 'Consumer Financial Protection Bureau (CFPB)',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the design-system guidance and the production Highcharts settings on consumerfinance.gov. Stated directly: Source Sans 3 for every chart role, all chart text at 16px in Gray `#5a5d61`; Gray 20 `#d2d3d5` for gridlines, axis lines and ticks (horizontal grid only, no ticks drawn); the five-colour series order (CFPB Green, Navy, Pacific 60, Gold 80, Purple 80) with no extended set because the guide caps a chart at five data types; teal/red status and diverging inks instead of green/red; 2px lines; rotated axis titles on both axes because the guide *requires* labelled X and Y axes; K/M/B thousands suffixes; and a `canvasWidth ≤ 540` variant that lays the y title flat above the axis as the site does on phones.',
    'Approximated: the headline face. The guide’s own images set titles in Avenir Next (proprietary), production in Source Sans 3; the theme names Avenir Next with Source Sans 3 as the fallback. The line specimens show small round markers although production code turns them off; the theme follows the specimens.',
    'Not stated: the chart’s editorial wrapper — the uppercase “FIGURE 1” eyebrow and the Source / Date published / Download / Notes block under a grey rule — has no slot anywhere; the pattern fills that are the house’s accessibility signature (dots and hatching on bars) have no ThemeSpec ink; and the downloadable data and alt text the guide makes mandatory are outside Flint. See the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'high',
      probe: 'signature',
      rule: 'Required information, in order: an uppercase bold “FIGURE 1” eyebrow, a one-line bold title, intro text; a key above the plot whose wide swatches show each series’ dash pattern; five 2px lines in green, navy, light blue, gold and purple, each with its own dash; grey 16px labels with comma thousands; a rotated y title with the unit (“Credit card debt (in dollars)”) and an x title; then a thin grey rule and bold-labelled “Source:”, “Date published:”, “Download:” and “Notes:” lines.',
      current: 'Flint draws the title and deck, the five-colour order with a distinct dash per line, the light grid, the rotated y title and the x title. It has no figure eyebrow and no footer block, puts the key at the right as a column of dots, and labels dates “July, October, 2019, April”.',
      expected: 'The guide’s “required information” figure redrawn with its own data.',
      flint: debtFlint(DEBT_FLINT, true, { title: SIG_TITLE, subtitle: SIG_DECK, baseSize: { width: 600, height: 340 } }),
      expectedSpec: signatureExpected(),
      expectedFrame: {
        headerHtml: header('Figure 1', SIG_TITLE, SIG_DECK),
        footerHtml: footer('Text about the source', 'These data reflect publicly available information for enforcement actions as of the date of publication.'),
      },
      observed: 'Flint (left) is recognisably CFPB in ink and type, with dashes per line, but the key sits at the right as round dots, the x axis reads “July, October, 2019, April, July”, and there is no FIGURE 1 eyebrow, rule or Source / Date published / Download / Notes block. Expected (right) has the eyebrow, a top key of dashed line samples, “June 2018 … Sept 2019”, comma thousands, and the four-line footer under a grey rule.',
    },
    {
      id: 'figure-footer',
      title: 'Figure eyebrow above, Source / Date published / Download / Notes below',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: '“Figure number … will appear as text above the chart’s title”; below the chart, after a thin grey rule, bold “Source:”, “Date published:”, “Download:” (a link to the source-data spreadsheet, required) and “Notes:” in small text.',
      current: 'The chart spec has `title` and `subtitle` only. There is no figure label, no source, no publication date, no download link and no notes; `type.footnote` is stated but nothing uses it.',
      expected: 'The eyebrow over the title; the four labelled lines under a rule.',
      proposal: '`chart_spec.label` (“Figure 2”), `chart_spec.source`, `chart_spec.notes[]`, `chart_spec.meta: [{ label, text, href? }]`; the theme states their order and lead-in weight (`annotation.footer: { rule: true, leadWeight: "bold", order: ["source", "published", "download", "notes"] }`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
      }),
      expectedSpec: titled({ ...t, labelSize: 13 }, {
        data: { values: POPULATION },
        mark: { type: 'bar', color: GREEN },
        encoding: {
          y: { field: 'Country', type: 'nominal', sort: null, title: null, axis: { domain: true, domainColor: RULE } },
          x: { field: 'Population', type: 'quantitative', title: 'Population (millions)', axis: { grid: true, domain: true, domainColor: RULE, titleFontSize: 14, titleColor: GREY, values: [0, 500, 1000, 1500], format: ',.0f' } },
        },
      }, {}),
      expectedFrame: {
        headerHtml: header('Figure 2', 'India and China hold over a third of humanity'),
        footerHtml: footer('UN World Population Prospects 2022', 'Estimates for mid-2023.'),
      },
      observed: 'Flint shows only the headline, and also turns on a “Country” title over the row labels and a “Population” title under the axis at 16px — larger than the bar labels. Expected adds “FIGURE 2” above, the footer block below, and names the measure once (“Population (millions)”).',
    },
    {
      id: 'dash-patterns',
      addressed: { stage: 'M3', note: 'The dashes and marker shapes now take the colour scale’s order, so the first series is solid (and keeps the first shape) whatever its name (M3). The house’s own dash list and the dash samples in the key stay open.' },
      title: 'Dash patterns are drawn, but not in the house order and not in the key',
      kind: 'realization',
      severity: 'high',
      probe: 'line-dash-redundancy',
      rule: '“Differentiate data types with patterning as well as colour”: solid, short dash, dot, dash and long dash on lines; key swatches are wide (30px) samples of the line’s pattern.',
      current: 'The theme states `marks.redundantEncoding: "always"` with `redundantChannels: ["dash", "texture"]`. Flint does give each line its own dash, but in its own order (Norway dotted, China solid, Germany dot-dash, United States solid again — two of four lines share “solid”), and the key shows coloured dots, not dash samples, so the reader cannot match a dash to a name.',
      expected: 'Four lines in the house order, each with a distinct dash, the key showing wide dashed samples.',
      proposal: 'Let `redundantChannels` be an ordered list of styles, not channel names: `ink.series.dashes: [[ ], [5, 3], [1.5, 2.5], [9, 4], [15, 5]]` that index with the palette, and draw line keys as wide stroke samples.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_SHARE,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway leads electric-car sales',
      }),
      expectedSpec: {
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        config: { ...houseConfig(t), axis: { ...(houseConfig(t).axis as object), labelFontSize: 13, titleFontSize: 14 } },
        title: { text: 'Norway leads electric-car sales' },
        width: W - 20,
        height: HEIGHT,
        ...linesView(EV_SHARE.map((row) => ({ ...row, Series: row.Country, Label: EV_LABELS[row.Year] })), {
          domain: EV_DOMAIN,
          x: { field: 'Year', type: 'quantitative', title: 'Year', axis: { format: 'd', values: [2018, 2020, 2022, 2023], domain: true, domainColor: RULE } },
          yField: 'EV share (%)',
          yTitle: 'Share of new cars (%)',
          flatTitle: true,
        }),
      },
      observed: 'Flint’s four lines: Norway green dotted, China navy solid, Germany light-blue dot-dash, United States gold solid — two solids, and the key is four filled dots in a 2×2 block with “EV share (%)” jammed under it. Expected: solid, short dash, dot, long dash in the house order with matching line samples in a single row.',
    },
    {
      id: 'pattern-fills',
      addressed: { stage: 'R13', note: 'Segments take the house order: solid, white dots, white diagonal hatch (`marks.texture.patterns`); the key swatches carry the same fills.' },
      title: 'Stacked segments carry dot and hatch patterns',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'pattern-fill',
      rule: '“We’ve built the following patterns into our CMS and Excel template: square dot, round dot, dash, and long dash”: in the stacked-bar specimen the base is solid green, the middle navy with white dots, the top light blue with white diagonal hatching; the key shows the same fills.',
      current: '`redundantChannels: ["texture"]` is accepted by the schema, but there is no ink for a texture: no pattern list, no density, no stroke. Flint fills each segment with a flat colour.',
      expected: 'Solid, dotted and hatched segments, the key swatches carrying the same patterns.',
      proposal: '`ink.series.patterns: [{ kind: "solid" }, { kind: "dots", size, gap }, { kind: "hatch", angle: 45, width, gap }]` indexed with the categorical palette, realised as SVG `<pattern>` fills (Vega-Lite needs a `url(#id)` fill and the defs alongside).',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: FARE,
        semantic_types: { Month: 'Category', Component: 'Category', 'Total cost': { semanticType: 'Amount', unit: 'USD' } },
        encodings: { x: 'Month', y: 'Total cost', color: 'Component' },
        title: 'November fares cost the most',
        subtitle: 'Average total cost of a ticket, dollars',
      }),
      expectedSpec: stackedExpected(),
      expectedFrame: { headerHtml: PATTERNS },
      observed: 'Flint fills Base fare, Taxes and Fees flat green, navy and light blue; the key shows flat squares and the flat y title “Total cost” collides with “Base fare” in the key. Its month labels also overlap (“Sep 2024Oct 2024Nov 2024…”). Expected carries solid, dotted and hatched segments, with the same fills in a key below.',
    },
    {
      id: 'thousands-k',
      addressed: { stage: 'A6', note: '`compact: { style: "upper", threshold: 1000 }` — $0, $2K … $8K on the currency axis, its sign kept (A6).' },
      title: 'Y labels abbreviate thousands as K',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: '“If chart data is above 1 thousand return "K" in y-axis” (and M, B above a million and a billion).',
      current: 'The theme states `annotation.numberFormat.thousands: "suffix"`. On a currency measure Flint prints “$2,000 … $8,000”: the currency formatter wins and the suffix is ignored.',
      expected: 'Y labels 0, 2K, 4K, 6K, 8K.',
      proposal: 'Honour `numberFormat.thousands` on axes for every measure semantic, including currency amounts, with the house’s suffix letters (`K` vs `k`).',
      flint: debtFlint(DEBT_FLINT.filter((row) => row.Series === SERIES[0]), false, { title: 'Average credit card debt', subtitle: 'Respondents who did not have trouble paying a bill' }),
      expectedSpec: titled({ ...t, labelSize: 13 }, {
        data: { values: DEBT.filter((row) => row.Series === SERIES[0]) },
        mark: { type: 'line', strokeWidth: 2, color: GREEN, point: { filled: true, size: 28, color: GREEN } },
        encoding: {
          x: { field: 'Label', type: 'ordinal', sort: DATE_LABELS, title: 'Date', axis: { labelAngle: 0, domain: true, domainColor: RULE, titleFontSize: 14, labelFontSize: 11 } },
          y: { field: 'Credit card debt (in dollars)', type: 'quantitative', title: 'Credit card debt (in dollars)', scale: { domain: [0, 8000] }, axis: { labelExpr: "datum.value >= 1000 ? format(datum.value / 1000, '~g') + 'K' : datum.label", domain: true, domainColor: RULE, titleFontSize: 13 } },
        },
      }, { title: 'Average credit card debt', subtitle: 'Respondents who did not have trouble paying a bill' }),
      observed: 'Flint prints “$0 … $8,000” with a flat “Credit card debt (in dollars)” title floating above the plot, and the vertex dots are Vega-Lite blue on a green line (see the vertex-dot gap). Expected: “0, 1K … 8K” with the title rotated beside the axis.',
    },
    {
      id: 'teal-red',
      addressed: { stage: 'R2', note: 'A single signed series of bars takes the status inks by sign (teal above zero, red below).' },
      title: 'Positive and negative in teal and red, never green and red',
      kind: 'realization',
      severity: 'medium',
      probe: 'per-mark-palette',
      rule: '“Instead of a green/red color combination, use a teal/red color combination” — Teal `#257675` for positive, Red `#d14124` for negative, keeping green for the brand.',
      current: 'Stated as `ink.series.status` with `selection.signed: "status"`. Flint ignores both on a one-series signed bar chart and paints every bar in the single-series CFPB Green — the green-for-change reading the guide forbids. (When the chart has an explicit Direction colour field, as in the gallery, the teal/red status inks do apply.)',
      expected: 'Warm decades in teal above zero, cool decades in red below.',
      ...signedProbe(theme, { ...t, labelSize: 13 }, { positive: '#257675', negative: '#d14124' }),
      observed: 'Flint: every decade in CFPB Green, negatives included, with rotated decade labels and a flat “Anomaly (°C)” title. Expected: red below zero, teal above, horizontal labels.',
    },
    {
      id: 'responsive-title',
      title: 'The phone-width variant fires on a desktop-width chart',
      kind: 'realization',
      severity: 'medium',
      probe: 'responsive-variant',
      rule: 'Y-axis title rotated 270° and centred on desktop; only at 540px and below does it turn flat, left-aligned above the axis (`maxWidth: 540 → rotation: 0, align: "high"`).',
      current: 'Stated as a variant `when: { canvasWidth: { lte: 540 } }`. Grounding fills the `canvasWidth` signal from the *plot* width (`subplotWidth`) rather than the canvas, so a 600px chart whose plot is narrowed by its row labels (or a side key) is treated as a phone chart.',
      expected: 'At 600px wide: the y title rotated and centred beside the axis, as on the desktop site.',
      proposal: 'Guard on the canvas the caller asked for (`canvasWidth` = `baseSize.width`), and add `plotWidth` as a separate guard for houses that do mean the plot.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { y: 'Country', x: 'Population' },
        title: 'India and China hold over a third of humanity',
        baseSize: { width: 600, height: 300 },
      }),
      expectedSpec: titled({ ...t, labelSize: 14 }, {
        data: { values: POPULATION },
        mark: { type: 'bar', color: GREEN, height: { band: 0.6 } },
        encoding: {
          y: { field: 'Country', type: 'nominal', sort: null, title: 'Country', axis: { domain: true, domainColor: RULE, titleColor: GREY, titleFontSize: 14, titlePadding: 12 } },
          x: { field: 'Population', type: 'quantitative', title: 'Population (millions)', axis: { grid: true, domain: true, domainColor: RULE, titleColor: GREY, titleFontSize: 14, values: [0, 500, 1000, 1500], format: ',.0f' } },
        },
      }, { title: 'India and China hold over a third of humanity', width: 470, height: 260 }),
      observed: 'Confirmed: on a 600px canvas Flint lays the y title flat (“Country” above the rows) — the phone rule — because the variant guard reads the plot width; the same theme without the variant gives a rotated, centred title. Expected keeps “Country” rotated beside the axis.',
    },
    {
      id: 'flat-title-overlap',
      addressed: { stage: 'A2', note: 'The key stands clear of the flat title by its lift, line and a gap (A2), and the decades sit flat at 13px in wider bands (A1): key row, title row, plot.' },
      title: 'The flat y title is drawn on top of the key',
      kind: 'realization',
      severity: 'high',
      probe: 'flat-title-overlap',
      rule: 'On narrow screens the key sits above the plot, left-aligned, and the y title lies flat above the axis — two separate rows.',
      current: 'With `legend.placement: ["top"]` and `axisTitlePlacement: "flatAboveAxis"`, Flint puts the flat title and the top key in the same band: the title’s text runs through the key entries.',
      expected: 'The key on its own row, then the flat y title, then the plot.',
      proposal: 'Reserve the flat title’s row in layout before placing a top key (or place the key above the title row), and report the clash if neither fits.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: ANOMALY,
        semantic_types: { Decade: 'Category', 'Anomaly (°C)': { semanticType: 'Quantity', unit: '°C' }, Direction: 'Category' },
        encodings: { x: 'Decade', y: 'Anomaly (°C)', color: 'Direction' },
        title: 'The world has warmed every decade since the 1960s',
      }),
      expectedSpec: {
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        config: { ...houseConfig({ ...t, labelSize: 13 }), legend: { ...(houseConfig(t).legend as object), labelFontSize: 13, labelColor: GREY, offset: 34 } },
        title: { text: 'The world has warmed every decade since the 1960s' },
        width: W,
        height: HEIGHT,
        data: { values: ANOMALY },
        mark: { type: 'bar', width: { band: 0.6 } },
        encoding: {
          x: { field: 'Decade', type: 'ordinal', title: 'Decade', axis: { labelAngle: 0, domain: true, domainColor: RULE, titleColor: GREY, titleFontSize: 13 } },
          y: { field: 'Anomaly (°C)', type: 'quantitative', title: 'Anomaly (°C)', axis: { domain: true, domainColor: RULE, titleColor: GREY, titleFontSize: 13, ...FLAT_Y_TITLE } },
          color: { field: 'Direction', type: 'nominal', scale: { domain: ['Below average', 'Above average'], range: ['#d14124', '#257675'] } },
        },
      },
      observed: 'Flint stacks the key (“Below average”, “Above average”) in a column whose second entry runs straight through the flat “Anomaly (°C)” title. The same overlap shows in the gallery’s anomaly and electricity-mix tiles. Expected puts the key on one row and the flat title on its own row beneath it.',
    },
    {
      id: 'vertex-dot-ink',
      addressed: { stage: 'R3', note: 'Dots on a single-series line take the line’s ink, not Vega-Lite blue.' },
      title: 'Dots on a single-series line fall back to Vega-Lite blue',
      kind: 'realization',
      severity: 'medium',
      probe: 'per-mark-palette',
      rule: 'Single-series charts are CFPB Green `#20aa3f`; the specimen lines carry small round markers in the line’s own colour.',
      current: 'With `geometry.point.presence: "full"`, Flint draws the line in `ink.series.single` (green) but the vertex dots in `#4c78a8`, Vega-Lite’s default mark colour: the point layer does not inherit the single-series ink. Multi-series lines are unaffected (their dots follow the colour scale); dense lines (the 24-year unemployment series) drop their dots altogether.',
      expected: 'Green dots on the green line.',
      proposal: 'Give the line’s `point` the same resolved single ink as the line (or emit `config.point.color`/`config.line.color` from `ink.series.single`).',
      flint: debtFlint(DEBT_FLINT.filter((row) => row.Series === SERIES[1]), false, { title: 'Average credit card debt', subtitle: 'Respondents who did have trouble paying a bill' }),
      expectedSpec: titled({ ...t, labelSize: 13 }, {
        data: { values: DEBT.filter((row) => row.Series === SERIES[1]) },
        mark: { type: 'line', strokeWidth: 2, color: GREEN, point: { filled: true, size: 28, color: GREEN } },
        encoding: {
          x: { field: 'Label', type: 'ordinal', sort: DATE_LABELS, title: 'Date', axis: { labelAngle: 0, domain: true, domainColor: RULE, titleFontSize: 14, labelFontSize: 11 } },
          y: { field: 'Credit card debt (in dollars)', type: 'quantitative', title: 'Credit card debt (in dollars)', scale: { domain: [0, 7000] }, axis: { format: '$,.0f', domain: true, domainColor: RULE, titleFontSize: 13 } },
        },
      }, { title: 'Average credit card debt', subtitle: 'Respondents who did have trouble paying a bill' }),
      observed: 'Flint’s green line carries blue dots at each of the six dates (confirmed in the SVG: line stroke `#20aa3f`, point fill `#4c78a8`); the same blue dots appear in the thousands-K panel. Expected: green dots on the green line.',
    },
    {
      id: 'download-alt',
      title: 'Downloadable data and alt text are required',
      kind: 'product-ui',
      severity: 'medium',
      probe: 'accessible-table',
      rule: '“You must include a title, axis labels, downloadable source data, and alt text”: alt text names the chart type, the data and the main takeaway in at most 250 characters; the data link uses descriptive text.',
      current: 'Flint has no alt-text or data-download output and no slot for either in the chart spec.',
      expected: 'An `aria-label`/alt of ≤250 characters built from the title and the chart type, and a “Source data spreadsheet” link to the rows that drew the chart.',
      proposal: '`chart_spec.altText` (with a generated default from chart type + title + deck, length-checked against a theme `accessibility.altTextMax`), and a host-level “download data” affordance fed by the compiled data.',
    },
  ],
};

export default cfpb;
