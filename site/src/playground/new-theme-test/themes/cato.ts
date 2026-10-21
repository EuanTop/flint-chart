import type { ThemeSpec } from 'flint-chart';
import research from '../research/cato.json';
import { BROWSERS, EV_SHARE, MEDALS, POPULATION, UNEMPLOYMENT, flintInput, withChartSource } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const FRANKLIN = "'ITC Franklin Gothic Std', 'Libre Franklin', 'Franklin Gothic Book', Arial, sans-serif";
const INK = '#222222';
const PURPLE = '#28223C';
const ORANGE = '#ED8B00';
const GREY = '#C7C7C7';
const LIGHT_PURPLE = '#716A8A';
const PALETTE = [PURPLE, ORANGE, GREY, LIGHT_PURPLE];

const t: HouseTokens = {
  font: FRANKLIN,
  text: INK,
  muted: INK,
  grid: null,
  axis: GREY,
  background: '#ffffff',
  palette: PALETTE,
  highlight: ORANGE,
  context: GREY,
  titleSize: 19,
  titleWeight: 'bold',
  subtitleSize: 19,
  subtitleColor: INK,
  labelSize: 16,
  sourceSize: 15,
  lineWidth: 2.5,
  legendOrient: 'bottom',
};

const theme: ThemeSpec = {
  id: 'cato',
  label: 'Cato Institute',
  ink: {
    surface: { source: 'house', canvas: '#ffffff' },
    text: { primary: INK, secondary: INK, muted: INK, inverse: '#ffffff' },
    structure: { axis: GREY, grid: '#E5E5E5', rule: GREY },
    series: {
      single: PURPLE,
      // 1 group: purple; 2: + orange; 3: + grey; 4: + light purple. Five or more is not allowed.
      categorical: PALETTE,
      sequential: { stops: ['#D0CDDB', '#A9A4BD', '#716A8A', '#28223C'], space: 'lab' },
    },
    accent: ORANGE,
  },
  type: {
    // “FIGURE 1” in uppercase ITC Franklin Gothic 13pt above the title (F2).
    kicker: { family: FRANKLIN, size: 13, weight: 'regular', case: 'upper', color: INK },
    headline: { family: FRANKLIN, size: 19, weight: 'bold', case: 'asIs', color: INK },
    deck: { family: FRANKLIN, size: 19, weight: 'regular', color: INK },
    axisLabel: { family: FRANKLIN, size: 16, color: INK },
    axisTitle: { family: FRANKLIN, size: 17, weight: 'regular', color: INK },
    keyLabel: { family: FRANKLIN, size: 16, color: INK },
    valueLabel: { family: FRANKLIN, size: 16, color: INK },
    footnote: { family: FRANKLIN, size: 15, color: INK },
  },
  structure: {
    axis: {
      categorical: { line: 'quiet', lineWeight: 1, ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse' },
    },
    grid: { measure: 'omit', category: 'omit' },
    frame: 'omit',
    baseline: 'quiet',
  },
  // Columns in a group touch; the groups keep the 0.8 band fraction between them (G1).
  marks: { bandFraction: 0.8, strokeWeight: 2.5, cornerRadius: 0, group: { gap: 0 } },
  geometry: { line: { width: 2.5 }, point: { presence: 'omit' } },
  labels: { truncation: 'wrap' },
  legend: { show: 'always', placement: ['bottom'], direction: 'horizontal', title: 'whenAmbiguous', align: 'center' },
  dataLabels: { show: 'whenTheyFit', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'always', axisTitlePlacement: 'rotated', axisTitleGap: 10, unit: 'never', numberFormat: { thousands: 'separator' } },
  layout: { targetWidth: 750, titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' } },
  variants: [
    {
      when: { isTemporal: true },
      then: { dataLabels: { show: 'never' } },
      because: 'Data labels go outside bars and columns; line charts carry none.',
    },
  ],
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { leadInWeight: 'bold' },
};

/** The print header stack: “FIGURE n” in caps, the bold title, the regular subtitle. */
const header = (n: number, title: string, subtitle: string) =>
  `<div style="font-family:${FRANKLIN};color:${INK};margin:2px 14px 4px;line-height:1.3">`
  + `<div style="font-size:17px;text-transform:uppercase;letter-spacing:.3px">Figure ${n}</div>`
  + `<div style="font-size:19px;font-weight:700">${title}</div>`
  + `<div style="font-size:19px">${subtitle}</div></div>`;

/** Notes with an asterisk, then “Source:” bold and underlined, both flush left under the legend. */
const footer = (note: string | null, source: string) =>
  `<div style="font-family:${FRANKLIN};color:${INK};margin:8px 14px 8px;line-height:1.35">`
  + (note ? `<div style="font-size:13px">*${note}</div>` : '')
  + `<div style="font-size:15px;margin-top:4px"><b style="text-decoration:underline">Source</b>: ${source}</div></div>`;

const config = (extra: Record<string, unknown> = {}) => {
  const base = houseConfig(t) as Record<string, any>;
  return {
    ...base,
    padding: { left: 14, right: 14, top: 6, bottom: 4 },
    axis: { ...base.axis, labelColor: INK, titleColor: INK, titleFontSize: 17, labelFontSize: 16, grid: false },
    axisX: { ...base.axisX, grid: false, domain: true, domainColor: GREY, ticks: false },
    axisY: { ...base.axisY, grid: false, domain: false },
    legend: { ...base.legend, orient: 'bottom', direction: 'horizontal', symbolType: 'circle', symbolSize: 200, labelFontSize: 16, columnPadding: 22, offset: 18, labelColor: INK },
    ...extra,
  };
};

const vl = (spec: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  config: config(extra),
  ...spec,
});

const SIG_ROWS = MEDALS.filter((row) => ['United States', 'China', 'Japan'].includes(row.Country));
const SIG_TITLE = 'The US topped the Paris medal table';
const SIG_SUBTITLE = 'Medals won at the 2024 Summer Olympics, by type';

function groupedColumns() {
  const x = { field: 'Country', type: 'nominal', sort: null, title: 'Country', axis: { labelAngle: 0, titlePadding: 12 }, scale: { paddingInner: 0.35 } };
  const xOffset = { field: 'Medal', sort: ['Gold', 'Silver', 'Bronze'], scale: { paddingInner: 0 } };
  const y = { field: 'Count', type: 'quantitative', title: 'Medals', scale: { domain: [0, 50] }, axis: { values: [0, 10, 20, 30, 40, 50], titlePadding: 12 } };
  return vl({
    width: 620,
    height: 230,
    data: { values: SIG_ROWS },
    encoding: { x, xOffset, y },
    layer: [
      { mark: { type: 'bar' }, encoding: { color: { field: 'Medal', type: 'nominal', sort: ['Gold', 'Silver', 'Bronze'], scale: { range: PALETTE.slice(0, 3) } } } },
      { mark: { type: 'text', baseline: 'bottom', dy: -4, fontSize: 16, color: INK, font: FRANKLIN }, encoding: { text: { field: 'Count', type: 'quantitative' } } },
    ],
  });
}

const POP_ALPHA = POPULATION.slice(0, 6).slice().sort((a, b) => a.Country.localeCompare(b.Country));

const catoColumns = (rows: typeof POPULATION) => vl({
  width: 620,
  height: 230,
  data: { values: rows.slice().sort((a, b) => b.Population - a.Population) },
  encoding: {
    x: { field: 'Country', type: 'nominal', sort: null, title: 'Country', axis: { labelAngle: 0, titlePadding: 12, labelLimit: 90 }, scale: { paddingInner: 0.3 } },
    y: { field: 'Population', type: 'quantitative', title: 'Millions of people', scale: { domain: [0, 1600] }, axis: { values: [0, 400, 800, 1200, 1600], titlePadding: 12 } },
  },
  layer: [
    { mark: { type: 'bar', color: PURPLE } },
    { mark: { type: 'text', baseline: 'bottom', dy: -4, fontSize: 16, color: INK, font: FRANKLIN }, encoding: { text: { field: 'Population', type: 'quantitative', format: ',.0f' } } },
  ],
});

const EV_TWO = EV_SHARE.filter((row) => row.Country === 'Norway' || row.Country === 'China');

const cato: StyleGuideTheme = {
  id: 'cato',
  org: 'Cato Institute',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from Cato’s “Data Visualization Guidelines” pocket stylebook. Print sizes are in points on a 750px Policy Analysis figure; they are used here at 4/3 (13pt → 17px, 14pt → 19px, 12pt → 16px, 11pt → 15px), and the signature panels are drawn at that width.',
    'Stated directly: everything in #222222; a bold 19px title and a regular 19px subtitle, left-aligned; the colour order by group count (dark purple, orange, grey, light purple — a single list, since each count’s set is a prefix of the next); no gridlines, no y-axis line, a thin light-grey baseline; rotated y title and centred x title; data labels outside the bar end; an untitled key centred at the bottom; the purple sequential ramp for maps; and no extended palette, because five or more groups are not allowed.',
    'Approximated: ITC Franklin Gothic is proprietary and falls back to Libre Franklin. Not stated: the “FIGURE n” line above the title, the notes and bold-underlined source under the key, round key swatches, the four-group limit, highest-first column order, touching bars within a group, and the web variant (labels off, values on hover) — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'A left-aligned stack — “FIGURE 1”, a short bold title, a short regular subtitle — over a chart with no gridlines and no y-axis line, a thin grey baseline, touching columns within each group, values just above each column, rotated y title, centred x title, a round-dot key centred below, then the asterisked note and “Source:” (bold, underlined), all in #222222.',
      current: 'Flint states the type, the palette order, the bare axes, outside labels, the axis titles and the bottom key. It has no figure number, notes or source, and keys the bars with squares.',
      expected: 'The guide’s page-10 print specification with the medal data.',
      flint: flintInput(theme, {
        chartType: 'Grouped Bar Chart',
        data: SIG_ROWS,
        semantic_types: { Country: 'Country', Medal: 'Category', Count: 'Quantity' },
        encodings: { x: 'Country', y: 'Count', group: 'Medal' },
        title: SIG_TITLE,
        subtitle: SIG_SUBTITLE,
        baseSize: { width: 750, height: 450 },
      }),
      expectedSpec: groupedColumns(),
      expectedFrame: {
        headerHtml: header(1, SIG_TITLE, SIG_SUBTITLE),
        footerHtml: footer('Medal counts as of the closing ceremony on August 11, 2024.', 'International Olympic Committee, Paris 2024 Medal Table (Lausanne: IOC, 2024).'),
      },
      observed: 'Flint (left) is close in substance: purple/orange/grey columns touching within each group, values above each column, no gridlines, a light baseline, rotated “Count” and centred “Country” titles, a centred key below. It differs in the y axis ruled every 5 (eleven labels) against the guide’s sparse scale, square key swatches, and no “FIGURE 1”, note or source.',
    },
    {
      id: 'figure-number',
      addressed: { stage: 'F2', note: 'The chart’s `label` (“Figure 1”) is set above the title in `type.kicker` (uppercase).' },
      title: '“FIGURE n” above the title',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'figure-number',
      rule: 'Every figure is numbered: “FIGURE 1” in uppercase ITC Franklin Gothic 13pt #222222, on its own line above the title.',
      current: 'The chart spec has `title` and `subtitle` only; there is no slot for a figure label, and no type role for one.',
      expected: '“FIGURE 2” in small caps above the bold title.',
      proposal: '`chart_spec.label` (“Figure 2”) drawn above the headline in a new `type.kicker` role (`case: "upper"`).',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POPULATION.slice(0, 6),
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { x: 'Country', y: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population in millions, 2023',
        baseSize: { width: 750, height: 420 },
      }),
      expectedSpec: catoColumns(POPULATION.slice(0, 6)),
      expectedFrame: { headerHtml: header(2, 'India and China hold over a third of humanity', 'Population in millions, 2023') },
      observed: 'Flint starts the block with the bold title; there is no figure line above it. Expected: “FIGURE 2” in caps, then the bold title and regular subtitle.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: '“Source:” bold, then the citation, flush left. The asterisk notes line and the underline stay open.' },
      title: 'Notes with an asterisk, then a bold, underlined “Source:”',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'source-line',
      rule: 'Below the legend, flush left: a notes line starting with “*” in 10pt, then “Source: Author, Title (Publisher, year).” in 11pt with “Source” bold and underlined.',
      current: 'No chart-spec slot for notes or a source; `type.footnote` is stated but nothing draws it.',
      expected: 'The unemployment line closed by an asterisked note and the citation.',
      proposal: '`chart_spec.notes[]` and `chart_spec.source`, drawn in `type.footnote`, with `annotation.sourceLabel: { text: "Source", weight: "bold", decoration: "underline" }` in the theme.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: UNEMPLOYMENT,
        semantic_types: { Year: 'Year', 'Unemployment (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'Unemployment (%)' },
        title: 'Unemployment spiked twice since 2000',
        subtitle: 'US unemployment rate, annual average',
        baseSize: { width: 750, height: 420 },
      }),
      expectedSpec: vl({
        width: 620,
        height: 220,
        data: { values: UNEMPLOYMENT },
        mark: { type: 'line', strokeWidth: 2.5, color: PURPLE },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: 'Year', scale: { domain: [2000, 2023], nice: false }, axis: { format: 'd', values: [2000, 2005, 2010, 2015, 2020], titlePadding: 12 } },
          y: { field: 'Unemployment (%)', type: 'quantitative', title: 'Percent', scale: { domain: [0, 12] }, axis: { values: [0, 3, 6, 9, 12], titlePadding: 12 } },
        },
      }),
      expectedFrame: {
        headerHtml: header(3, 'Unemployment spiked twice since 2000', 'US unemployment rate, annual average'),
        footerHtml: footer('Annual averages of monthly, seasonally adjusted rates.', 'Bureau of Labor Statistics, “Labor Force Statistics from the Current Population Survey” (Washington: BLS, 2024).'),
      },
      observed: 'Flint ends with the x-axis title (and starts the y scale at 3). Expected: an asterisked note in small type, then “Source” bold and underlined before the citation.',
    },
    {
      id: 'legend-swatch',
      title: 'Round key dots, centred under the chart',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'legend-swatch',
      rule: '“Legends should be placed at the bottom of the chart”: an untitled row of round dots with labels, centred under the x-axis title — for bars and for lines alike.',
      current: 'Placement, direction, alignment and title are stated (`legend.placement: ["bottom"]`, `align: "center"`, `title: "omit"`). `legend.swatch` only accepts `auto`, so Flint chooses the shape — a stroke for lines, a square for bars.',
      expected: 'Two lines keyed by round dots, centred below.',
      proposal: '`legend.swatch: { shape: "circle" | "square" | "line" | "auto" }`.',
      flint: flintInput(theme, {
        chartType: 'Line Chart',
        data: EV_TWO,
        semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
        title: 'Norway is far ahead on electric cars',
        subtitle: 'Share of new cars sold that are electric',
        baseSize: { width: 750, height: 420 },
      }),
      expectedSpec: vl({
        width: 620,
        height: 220,
        data: { values: EV_TWO },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: 'Year', scale: { domain: [2018, 2023], nice: false }, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023], titlePadding: 12 } },
          y: { field: 'EV share (%)', type: 'quantitative', title: 'Percent', scale: { domain: [0, 100] }, axis: { values: [0, 20, 40, 60, 80, 100], titlePadding: 12 } },
          color: { field: 'Country', type: 'nominal', sort: ['Norway', 'China'], scale: { range: [PURPLE, ORANGE] } },
        },
        layer: [
          { mark: { type: 'line', strokeWidth: 2.5 } },
          { mark: { type: 'point', filled: true, opacity: 0 } },
        ],
      }, { legend: { ...(config().legend as object), symbolOpacity: 1, symbolStrokeWidth: 0 } }),
      expectedFrame: { headerHtml: header(4, 'Norway is far ahead on electric cars', 'Share of new cars sold that are electric') },
      observed: 'Flint keys the two lines with short strokes in a small bottom-centred key; expected: filled round dots.',
    },
    {
      id: 'four-group-limit',
      addressed: { stage: 'R1', note: 'The house colours are kept and the tail takes the house grey; a cap on the number of groups (asking the author to consolidate) is not part of this.' },
      title: 'Five or more groups are not allowed — Flint drops the house colours instead',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'count-palette',
      rule: '“There should not be five or more groups in a single figure. Consider consolidating categories or breaking up the one chart into two or three different charts.” A pie chart has no more than four slices.',
      current: 'The house names four inks and, true to the guide, no extended set or overflow. With five browsers the set is “exhausted” and Flint hands the pie Vega’s default scheme (steel blue, orange, red, teal, green) — none of them Cato’s — without telling the author to consolidate.',
      expected: 'Four slices in the house order: the two smallest browsers folded into “Other”.',
      proposal: 'A theme `ink.series.maxGroups: 4` with a stated response (`"fold"` the tail into the last ink, or `"report"` a departure asking the author to consolidate), instead of a silent palette swap.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome dominates desktop browsing',
        subtitle: 'Desktop browser market share, 2024, percent',
        baseSize: { width: 750, height: 420 },
      }),
      expectedSpec: vl({
        width: 620,
        height: 230,
        data: { values: [{ Browser: 'Chrome', Share: 65 }, { Browser: 'Safari', Share: 12 }, { Browser: 'Edge', Share: 12 }, { Browser: 'Other', Share: 11 }] },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          color: { field: 'Browser', type: 'nominal', sort: ['Chrome', 'Safari', 'Edge', 'Other'], scale: { range: PALETTE } },
          order: { field: 'Share', type: 'quantitative', sort: 'descending' },
        },
        layer: [
          { mark: { type: 'arc', outerRadius: 95, stroke: '#ffffff', strokeWidth: 1 } },
          { mark: { type: 'text', radius: 115, fontSize: 16, font: FRANKLIN }, encoding: { text: { field: 'Share', type: 'quantitative' }, color: { value: INK } } },
        ],
      }),
      expectedFrame: { headerHtml: header(5, 'Chrome dominates desktop browsing', 'Desktop browser market share, 2024, percent') },
      observed: 'Flint’s five-slice pie is steel blue, orange, red, teal and green — Vega’s default scheme — with a five-entry key, and nothing reports that the house allows four. The gallery’s six-source area chart falls back the same way. Expected: four slices in purple, orange, grey and light purple.',
    },
    {
      id: 'sort-policy',
      title: 'Highest column on the left, always',
      kind: 'expressiveness',
      severity: 'medium',
      probe: 'sort-policy',
      rule: '“Always create a column chart placing the highest value on the left and lower values to the right.”',
      current: 'Order is the chart spec’s decision and ThemeSpec deliberately has no field for it, so a house rule about order cannot travel with the house: data that arrives alphabetically is drawn alphabetically. (When the author does ask — `sortBy: "y"` — Flint keeps the sort even with the theme’s value labels on.)',
      expected: 'India, China, United States, Indonesia, Pakistan, Nigeria — highest first, labelled above.',
      proposal: 'A house default the chart spec can override: `annotation.categoryOrder: "asGiven" | "byValueDescending"` applied only to nominal (unordered) category axes, reported when it fires.',
      flint: flintInput(theme, {
        chartType: 'Bar Chart',
        data: POP_ALPHA,
        semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
        encodings: { x: 'Country', y: 'Population' },
        title: 'India and China hold over a third of humanity',
        subtitle: 'Population in millions, 2023',
        baseSize: { width: 750, height: 420 },
      }),
      expectedSpec: catoColumns(POP_ALPHA),
      expectedFrame: { headerHtml: header(6, 'India and China hold over a third of humanity', 'Population in millions, 2023') },
      observed: 'Flint draws the columns in the order the data arrived — China, India, Indonesia, Nigeria, Pakistan, United States — with labels above. Expected: India first, falling to Nigeria.',
    },
    {
      id: 'web-variant',
      title: 'Web figures: no data labels, values on hover',
      kind: 'product-ui',
      severity: 'low',
      probe: 'focus-hover-state',
      rule: 'Print figures print values outside the bars; web figures (Infogram) turn data labels off and show values on hover, at fixed widths of 650px (web) and 750px or 1,000px (print).',
      current: 'Variants switch on chart facts (series count, canvas width, temporal…), not on the medium, and a theme cannot ask for a hover tooltip to replace labels.',
      expected: 'One house, two media: labels in print, tooltips on the web.',
      proposal: 'A `medium: "print" | "web"` guard for `variants`, and `interaction.tooltip` as the stated replacement when `dataLabels.show` is `never`.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(cato, 'World Bank, World Development Indicators (2024).', ['source-line']);

export default cato;
