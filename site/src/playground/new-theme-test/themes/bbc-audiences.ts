import type { ThemeSpec } from 'flint-chart';
import research from '../research/bbc-audiences.json';
import { BROWSERS, EV_SHARE, MEDALS, POPULATION, flintInput, withChartSource } from '../probes';
import { houseConfig, type HouseTokens } from '../vl';
import type { ResearchRecord, StyleGuideTheme } from '../types';

const REITH = "'BBC Reith Sans', 'Open Sans', Arial, sans-serif";
const TEAL = '#21a9be';
const PANE = '#f5f5f5';
const AXIS_TEXT = '#898989';
const MID = '#cccccc';
const LIGHT = '#eaeaea';

const t: HouseTokens = {
  font: REITH,
  text: '#000000',
  muted: AXIS_TEXT,
  grid: '#ffffff',
  axis: null,
  background: '#ffffff',
  palette: [TEAL, MID, LIGHT],
  highlight: TEAL,
  context: MID,
  titleSize: 16,
  titleWeight: 'normal',
  subtitleSize: 13,
  subtitleColor: TEAL,
  labelSize: 12,
  sourceSize: 13,
  lineWidth: 2,
  legendOrient: 'none',
};

const theme: ThemeSpec = {
  id: 'bbc-audiences',
  label: 'BBC Audiences (Tableau)',
  ink: {
    surface: { source: 'house', canvas: '#ffffff', plot: PANE },
    text: { primary: '#000000', secondary: AXIS_TEXT, muted: AXIS_TEXT, inverse: '#ffffff' },
    structure: { grid: '#ffffff', axis: AXIS_TEXT },
    series: {
      single: TEAL,
      // One dominant colour; secondary categories mid grey, the least important light grey.
      categorical: [TEAL, MID, LIGHT],
      overflow: LIGHT,
    },
    accent: TEAL,
  },
  type: {
    headline: { family: REITH, size: 16, weight: 'regular', color: '#000000' },
    deck: { family: REITH, size: 13, weight: 'regular', color: TEAL },
    axisLabel: { family: REITH, size: 12, color: AXIS_TEXT },
    axisTitle: { family: REITH, size: 12, color: AXIS_TEXT },
    keyLabel: { family: REITH, size: 13, weight: 'bold' },
    valueLabel: { family: REITH, size: 12, color: '#404040' },
    annotation: { family: REITH, size: 13, style: 'italic', color: '#000000' },
    footnote: { family: REITH, size: 13, color: '#000000' },
  },
  structure: {
    axis: {
      categorical: { line: 'omit', ticks: 'omit' },
      measure: { line: 'omit', ticks: 'omit', tickDensity: 'sparse', suppressWhenValuesPrinted: true },
    },
    grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1 },
    frame: 'omit',
    baseline: 'omit',
  },
  marks: { bandFraction: 0.67, strokeWeight: 2 },
  geometry: { line: { width: 2 }, point: { presence: 'omit' } },
  labels: { truncation: 'ellipsis' },
  legend: { show: 'always', placement: ['seriesEnd', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start', suppressWhenValuesPrinted: true },
  dataLabels: { show: 'whenTheyFit', placement: 'outsideMark', inkMode: 'fixed' },
  annotation: { axisTitles: 'omit', unit: 'everyTick', numberFormat: { thousands: 'suffix', precision: 'auto', compact: { style: 'upper', per: 'value', threshold: 1000 } } },
  layout: { titleBlock: { anchor: 'start', gap: 'tight', deckGap: 'tight' } },
  variants: [
    {
      when: { isTemporal: true },
      then: { dataLabels: { show: 'never' } },
      because: 'Line charts name and value each series once, at its end; they do not print every reading.',
    },
  ],
  // The source line, as the guide sets it (S1); the chart gives the words.
  source: { rule: { width: 1, color: '#DDDDDD' }, credit: { text: 'Contact the team', placement: 'end' } },
};

/** The pane look: a light grey plot rectangle, white gridlines, grey axis text, no axis lines. */
const paneConfig = (extra: Record<string, unknown> = {}) => {
  const base = houseConfig(t);
  return {
    ...base,
    padding: { left: 14, right: 14, top: 4, bottom: 8 },
    view: { stroke: null, fill: PANE },
    legend: { disable: true },
    ...extra,
  };
};

const header = (title: string, deck: string) =>
  `<div style="font-family:${REITH};margin:4px 14px 6px;line-height:1.3">`
  + `<div style="font-size:16px;color:#000">${title}</div>`
  + `<div style="font-size:13px;color:${TEAL}">${deck}</div></div>`;

const teal = (text: string) => `<span style="color:${TEAL}">${text}</span>`;

/** The 35px dashboard footer: source at the left, the contact link at the right. */
const dashFooter = (source: string) =>
  `<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 14px 6px;padding-top:8px;border-top:1px solid #eaeaea;font-family:${REITH};font-size:12px;color:#000">`
  + `<span>Source: ${source}</span><span>Contact the team <span style="display:inline-block;width:12px;height:9px;border:1.5px solid #000;vertical-align:-1px;margin-left:4px"></span></span></div>`;

const vl = (spec: Record<string, unknown>, extraConfig: Record<string, unknown> = {}) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  config: paneConfig(extraConfig),
  ...spec,
});

const evRows = (names: string[]) => EV_SHARE.filter((row) => names.includes(row.Country));
const THREE = ['Norway', 'China', 'Germany'];
const FOUR = ['Norway', 'China', 'Germany', 'United States'];
const evFlint = (title: string, subtitle: string, names = THREE) => flintInput(theme, {
  chartType: 'Line Chart',
  data: evRows(names),
  semantic_types: { Year: 'Year', Country: 'Country', 'EV share (%)': { semanticType: 'Percentage', unit: '%' } },
  encodings: { x: 'Year', y: 'EV share (%)', color: 'Country' },
  title,
  subtitle,
  baseSize: { width: 460, height: 280 },
});

/** Three lines in one hue, each named and valued at its end — the guide's line specimen. */
function oneHueLines(names = THREE, width = 400, height = 200) {
  const LINE_ROWS = evRows(names);
  const last = LINE_ROWS.filter((row) => row.Year === 2023).map((row) => ({ ...row, label: [row.Country, `${row['EV share (%)']}%`] }));
  return vl({
    width,
    height,
    layer: [
      {
        data: { values: LINE_ROWS },
        mark: { type: 'line', strokeWidth: 2, color: TEAL },
        encoding: {
          x: { field: 'Year', type: 'quantitative', title: null, scale: { domain: [2018, 2023], nice: false }, axis: { format: 'd', values: [2018, 2019, 2020, 2021, 2022, 2023], grid: false, labelColor: '#404040', labelPadding: 8 } },
          y: { field: 'EV share (%)', type: 'quantitative', title: null, scale: { domain: [0, 100] }, axis: { values: [25, 50, 75, 100], labelExpr: "datum.label + '%'", labelColor: AXIS_TEXT, labelFontSize: 11 } },
          detail: { field: 'Country' },
        },
      },
      {
        data: { values: last },
        mark: { type: 'text', align: 'left', baseline: 'middle', dx: 6, fontSize: 12, color: TEAL, lineHeight: 14, font: REITH },
        encoding: { x: { field: 'Year', type: 'quantitative' }, y: { field: 'nudge', type: 'quantitative' }, text: { field: 'label' } },
        transform: [{ calculate: "datum.Country === 'China' ? datum['EV share (%)'] + 6 : datum.Country === 'United States' ? datum['EV share (%)'] - 8 : datum['EV share (%)']", as: 'nudge' }],
      },
    ],
  });
}

const SELFIE_TOP = POPULATION.slice(0, 6);
const popFlint = () => flintInput(theme, {
  chartType: 'Bar Chart',
  data: SELFIE_TOP,
  semantic_types: { Country: 'Country', Population: { semanticType: 'Quantity', unit: 'm' } },
  encodings: { y: 'Country', x: 'Population' },
  title: 'Most populous countries',
  subtitle: 'Population, 2023',
  baseSize: { width: 460, height: 260 },
});

/** The bar specimen: no value axis, no gridlines, names right-aligned against the bars, values at the ends. */
function labelledBars() {
  const rows = SELFIE_TOP.map((row) => ({ ...row, label: row.Population >= 1000 ? `${(row.Population / 1000).toFixed(1)}B` : `${Math.round(row.Population)}M` }));
  const y = { field: 'Country', type: 'nominal', sort: null, title: null, axis: { grid: false, labelColor: '#000000', labelFontSize: 12, labelPadding: 6, labelLimit: 110 } };
  return vl({
    width: 330,
    height: 170,
    data: { values: rows },
    layer: [
      { mark: { type: 'bar', color: TEAL, height: { band: 0.67 } }, encoding: { y, x: { field: 'Population', type: 'quantitative', axis: null, scale: { domain: [0, 1800] } } } },
      { mark: { type: 'text', align: 'left', dx: 4, fontSize: 11, color: '#404040', font: REITH }, encoding: { y, x: { field: 'Population', type: 'quantitative' }, text: { field: 'label' } } },
    ],
  });
}

const STACK_COUNTRIES = ['United States', 'China', 'Japan', 'Australia'];
const STACK_ROWS = STACK_COUNTRIES.flatMap((country) => {
  const rows = MEDALS.filter((row) => row.Country === country);
  const total = rows.reduce((sum, row) => sum + row.Count, 0);
  return rows.map((row) => ({ Country: country, Medal: row.Medal, Share: Math.round((row.Count / total) * 100) }));
});
const MEDAL_ORDER = ['Gold', 'Silver', 'Bronze'];

function stackedShares() {
  const color = { field: 'Medal', type: 'nominal', scale: { domain: MEDAL_ORDER, range: [TEAL, MID, LIGHT] }, legend: null };
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: { ...paneConfig(), view: { stroke: null } },
    width: 360,
    height: 200,
    data: { values: STACK_ROWS },
    transform: [
      { calculate: "indexof(['Gold','Silver','Bronze'], datum.Medal)", as: 'rank' },
      { stack: 'Share', groupby: ['Country'], sort: [{ field: 'rank', order: 'ascending' }], as: ['y0', 'y1'] },
      { calculate: '(datum.y0 + datum.y1) / 2', as: 'mid' },
    ],
    encoding: {
      x: { field: 'Country', type: 'nominal', sort: STACK_COUNTRIES, title: null, axis: { labelAngle: 0, labelColor: '#000000', labelFontSize: 12, grid: false, labelPadding: 6 }, scale: { paddingInner: 0.35 } },
    },
    layer: [
      { mark: { type: 'bar' }, encoding: { y: { field: 'y0', type: 'quantitative', axis: null, scale: { domain: [0, 100] } }, y2: { field: 'y1' }, color } },
      {
        mark: { type: 'text', fontSize: 11, font: REITH, baseline: 'middle' },
        encoding: {
          y: { field: 'mid', type: 'quantitative' },
          text: { field: 'label' },
          color: { condition: { test: "datum.Medal === 'Gold'", value: '#ffffff' }, value: '#7a7a7a' },
        },
        transform: [{ calculate: "datum.Share + '%'", as: 'label' }],
      },
    ],
  };
}

const PIE_ROWS = [
  { Browser: 'Chrome', Share: 65 },
  { Browser: 'Everything else', Share: 35 },
];

const audiences: StyleGuideTheme = {
  id: 'bbc-audiences',
  org: 'BBC Audiences',
  research: research as ResearchRecord,
  theme,
  notes: [
    'Built from scratch from the BBC Audiences Tableau style guide (read as static renders of each dashboard sheet). The non-data colours are stated on its Colour sheet; the data colours were measured from the examples, which change accent per chart (teal on lines, red on bars, blue-violet on stacks). The theme picks teal for every chart, as the guide asks a dashboard to keep one.',
    'Stated directly: white page with a #f5f5f5 plot pane (`ink.surface.plot`); white horizontal gridlines only; grey #898989 axis text, black text elsewhere; no axis lines, ticks or axis titles; units on every tick; a regular 16px title (Tableau 12pt) with the measure in a 13px teal deck; one dominant colour then mid and light greys; values printed at bar ends with the value axis dropped (`suppressWhenValuesPrinted`); K/M/B abbreviations; series named at their ends rather than in a key.',
    'Not stated: BBC Reith Sans is proprietary and falls back to Open Sans/Arial. The coloured words in the title and deck that replace the legend, every line in the same accent, the most important stack segment at the bottom, the one-slice pie, the 2:1 plot aspect ratio and the dashboard’s own header and footer chrome — see the gaps.',
  ].join('\n\n'),
  gaps: [
    {
      id: 'signature',
      title: 'The house look, overall',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'signature',
      rule: 'A regular-weight title with the series names in the accent colour, the measure in a teal deck; a light grey pane with white horizontal gridlines; grey tick labels with % on every one; no axes, ticks or legend; every line in the same teal, labelled at its end with name and last value; a 2:1 plot; “Source: …” bottom-left of the dashboard footer.',
      current: 'Flint draws the pane, the white gridlines, % on every tick, the regular title and the teal deck from the theme. The lines take the categorical teal, mid grey and light grey, and the coloured names in the title cannot be asked for.',
      expected: 'The guide’s “Household take-up” specimen applied to EV sales.',
      flint: evFlint('Electric car share in Norway, China and Germany', 'Share of new cars sold that are electric'),
      expectedSpec: oneHueLines(),
      expectedFrame: {
        headerHtml: header(`Electric car share in ${teal('Norway, China')} and ${teal('Germany')}`, 'Share of new cars sold that are electric'),
        footerHtml: dashFooter('IEA Global EV Outlook'),
      },
      observed: 'Flint (left) is close: the #f5f5f5 pane, white gridlines, grey tick labels with % on each, no axes, the regular black title, the teal deck and series names at the line ends. It differs in the colours — China in mid grey and Germany in #eaeaea, whose end label is all but invisible on the pane — in the bare names (no latest value under each), in a deck extended with “; EV share (%)”, and in a squarer plot than the guide’s 2:1. The title’s series names cannot be coloured and there is no dashboard footer.',
    },
    {
      id: 'one-hue-lines',
      title: 'Every line in the one accent, told apart by its end label',
      kind: 'expressiveness',
      severity: 'high',
      probe: 'per-mark-palette',
      rule: '“Use a single dominant colour to signal data”: the line specimen draws all three series in teal and names each at its end (“TV 94%”); greys are for secondary categories in stacks and pies.',
      current: 'ThemeSpec has one categorical sequence for every mark. Stating the stack rule (teal, #cccccc, #eaeaea, overflow #eaeaea) makes every line after the first grey — the light grey nearly vanishes on the #f5f5f5 pane; stating all-teal would break the stacks.',
      expected: 'Four teal lines on the pane, each with its name and latest value in teal at the right end.',
      proposal: 'Let a `variants` entry keyed on `markChannel: "position"` carry `ink.series` (variants may not vary `ink` today), or add `ink.series.lines: "single"` so path marks share the single ink when the series are directly labelled.',
      flint: evFlint('Electric car sales', 'Share of new cars sold that are electric', FOUR),
      expectedSpec: oneHueLines(FOUR, 400, 200),
      expectedFrame: { headerHtml: header('Electric car sales', 'Share of new cars sold that are electric') },
      observed: 'Flint: Norway teal, China #cccccc, Germany and United States #eaeaea (the overflow ink) — two of the four lines and their labels nearly disappear into the pane. Expected: four teal lines, each told apart by its teal name and value at the right end.',
    },
    {
      id: 'in-text-legend',
      title: 'The deck is the key: coloured words, most important segment at the bottom',
      kind: 'chart-spec',
      severity: 'high',
      probe: 'in-text-legend',
      rule: 'No legend box: the line under the title names the categories in their own colours, separated by “/” (“Entire Series / Individual Episode / Don’t Know”). Stacked bars keep to two or three categories, the most important at the bottom in the accent, the rest mid then light grey, with percentages inside the segments and no value axis.',
      current: 'The chart spec’s subtitle is plain text and the theme has no rule that turns the colour key into words in the deck, so Flint draws a separate key. Nothing marks which category matters most, so it does not stack at the bottom.',
      expected: 'Gold at the bottom of each column in teal, silver and bronze above in greys, each share printed inside; the deck “Gold / Silver / Bronze” in those colours, no key.',
      proposal: '`legend.placement: "deck"` — realised as styled runs in the subtitle — plus `chart_spec.emphasis` (or a sort on the colour field) so the subject category stacks first.',
      flint: flintInput(theme, {
        chartType: 'Stacked Bar Chart',
        data: STACK_ROWS,
        semantic_types: { Country: 'Country', Medal: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { x: 'Country', y: 'Share', color: 'Medal' },
        title: 'Share of medals by type, Paris 2024',
        subtitle: 'Gold / Silver / Bronze',
        baseSize: { width: 460, height: 280 },
      }),
      expectedSpec: stackedShares(),
      expectedFrame: {
        headerHtml: header('Share of medals by type, Paris 2024', `<b>${teal('Gold')}</b> <span style="color:#000">/</span> <b style="color:#9a9a9a">Silver</b> <span style="color:#000">/</span> <b style="color:#c4c4c4">Bronze</b>`),
      },
      observed: 'Flint stacks Gold at the top of each column, not the bottom, adds a square-swatch key under the deck and appends “; Share (%)” to a deck that was meant to be the key. It does print the shares inside the segments (white on teal, dark on grey) and drops the value axis, as the guide does. Expected: Gold in teal at the base, the deck “Gold / Silver / Bronze” coloured as the key.',
    },
    {
      id: 'number-format',
      title: 'Bars: the axis drops as stated, but values read “1429 m”, not “1.4B”',
      kind: 'realization',
      severity: 'medium',
      probe: 'number-format',
      rule: '“Use K to denote thousands, M for millions and B for billions”; round to the precision the audience needs. On the bar specimen the values sit just past each bar end in small dark text, the category names are dark and right-aligned against the bars, there is no horizontal axis and no gridlines, and bars fill about two-thirds of their band.',
      current: 'Stated as `annotation.numberFormat: { thousands: "suffix" }`, `dataLabels: { show: "whenTheyFit", placement: "outsideMark" }`, `structure.axis.measure.suppressWhenValuesPrinted: true` and `bandFraction: 0.67`. The field carries the unit `m` (millions).',
      expected: 'Six bars on the pane, “1.4B”, “340M” at their ends, dark category names, no x axis or gridlines.',
      proposal: 'Apply the house’s K/M/B rule after the declared unit scales the value (millions × 1,000 = billions), and when the unit is itself a magnitude (`m`, `bn`) re-express it in the house’s letters rather than appending it.',
      flint: popFlint(),
      expectedSpec: labelledBars(),
      expectedFrame: { headerHtml: header('Most populous countries', 'Population, 2023') },
      observed: 'Flint already drops the x axis and the gridlines and prints values past the bar ends, as stated. The values read “1429 m”, “340 m” — the declared unit appended to an unabbreviated number — instead of “1.4B”, “340M”; the category names are #898989 like axis text rather than dark, and “United States” wraps onto two lines where the guide truncates with “..”.',
    },
    {
      id: 'pie-rules',
      title: 'A pie only to call out one share: accent slice against grey',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'pie-rules',
      rule: 'Pies are allowed sparingly “to call out a particular” value: one slice in the accent, the remainder grey (#e1e1e1); “Anything beyond three categories in a pie chart” is discouraged.',
      current: 'The categorical teal / mid grey / light grey with a light-grey overflow already does half the job: the first slice is teal and the tail folds into an “Others” slice. But nothing says which slice is the subject, the cut-off is the palette length (three inks plus overflow) rather than the guide’s “one versus the rest”, and a key is drawn beside labels that already name the slices.',
      expected: 'Chrome in teal from 12 o’clock, the other 35% as one grey slice, both labelled directly.',
      proposal: '`chart_spec.emphasis` (the slice to call out) plus a theme pie policy `marks.slice.maxCount` with an “other” fold in the context grey.',
      flint: flintInput(theme, {
        chartType: 'Pie Chart',
        data: BROWSERS,
        semantic_types: { Browser: 'Category', Share: { semanticType: 'Percentage', unit: '%' } },
        encodings: { size: 'Share', color: 'Browser' },
        title: 'Chrome’s share of desktop browsing',
        subtitle: 'Desktop browser market share, 2024',
        baseSize: { width: 460, height: 280 },
      }),
      expectedSpec: {
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        config: { ...paneConfig(), view: { stroke: null } },
        width: 360,
        height: 200,
        data: { values: PIE_ROWS },
        encoding: {
          theta: { field: 'Share', type: 'quantitative', stack: true },
          order: { field: 'Share', type: 'quantitative', sort: 'descending' },
          color: { field: 'Browser', type: 'nominal', scale: { domain: ['Chrome', 'Everything else'], range: [TEAL, '#e1e1e1'] }, legend: null },
        },
        layer: [
          { mark: { type: 'arc', outerRadius: 85, stroke: '#ffffff', strokeWidth: 1 } },
          { mark: { type: 'text', radius: 48, fontSize: 12, font: REITH, lineHeight: 14 }, encoding: { text: { field: 'label' }, color: { condition: { test: "datum.Browser === 'Chrome'", value: '#ffffff' }, value: '#404040' } }, transform: [{ calculate: "[datum.Browser, datum.Share + '%']", as: 'label' }] },
        ],
      },
      expectedFrame: { headerHtml: header(`${teal('Chrome’s')} share of desktop browsing`, 'Desktop browser market share, 2024') },
      observed: 'Flint: Chrome teal, Safari mid grey, Edge light grey and an “Others (2)” slice, with a four-entry key and percentages outside. Expected: one teal Chrome slice against a single grey “Everything else”, labelled in place, no key.',
    },
    {
      id: 'source-line',
      addressed: { stage: 'S1', note: 'Source bottom-left under a light rule, “Contact the team” at the right (`credit.placement: "end"`).' },
      title: 'Dashboard footer: source left, contact right',
      kind: 'chart-spec',
      severity: 'medium',
      probe: 'source-line',
      rule: 'A fixed 35px footer “used for navigation, the source of your data”: “Source: Ofcom Communications Report 2017” bottom-left in small black text, “Contact the team ✉” bottom-right, under a thin light-grey rule.',
      current: 'No chart-spec slot for a source; no footer furniture beyond a plain rule.',
      expected: 'The bar chart closed by the footer line.',
      proposal: '`chart_spec.source` with `type.footnote`, and `layout.footer: { rule, start: "source", end: "contact" }` for the right-hand link.',
      flint: popFlint(),
      expectedSpec: labelledBars(),
      expectedFrame: { headerHtml: header('Most populous countries', 'Population, 2023'), footerHtml: dashFooter('UN World Population Prospects') },
      observed: 'Flint draws the bar chart with nothing under it. Expected: a light rule, “Source: UN World Population Prospects” at the left and “Contact the team ✉” at the right.',
    },
    {
      id: 'series-label-contrast',
      addressed: { stage: 'R4', note: 'Series names in a light ink are darkened in their hue to 3:1.' },
      title: 'Series-end labels take an ink too light to read',
      kind: 'visual-quality',
      severity: 'medium',
      probe: 'series-label-contrast',
      rule: 'Labels sit in the series colour at the line end (“TV 94%”) — and the guide only ever writes them in the accent, which reads on white and on the #f5f5f5 pane.',
      current: 'Flint writes every series-end name in its series ink. Under this palette the third and later series are #eaeaea, so “Germany”, “United States” and, on the area chart, “Hydro”, “Nuclear”, “Wind & solar”, “Other” are light grey text on a white or #f5f5f5 ground (about 1.2:1 contrast).',
      expected: 'Labels darkened toward `text.secondary` when the series ink fails text contrast against the surface, keeping the hue where it can.',
      proposal: 'Check label ink against the surface it sits on (WCAG 3:1 for 12px+) and fall back to `ink.text.secondary`; or let the theme state `legend.seriesEndInk: "series" | "text" | "seriesIfContrasting"`.',
      observed: 'Visible in the gallery’s EV-share and electricity-generation tiles, and in the one-hue gap’s current panel: the grey labels are barely legible against the pane.',
    },
    {
      id: 'brand-mark',
      title: 'Dashboard header: BBC AUDIENCES logo left, uppercase title right',
      kind: 'product-ui',
      severity: 'low',
      probe: 'brand-mark',
      rule: 'Every dashboard has a 65px header: the BBC block logo and “AUDIENCES” wordmark top-left; the dashboard title and section right-aligned, 20pt uppercase, section word bold (“CHARTS STYLE GUIDE”); a light-grey rule under it.',
      current: 'Dashboard chrome sits outside a single chart; ThemeSpec has no logo or wordmark furniture.',
      expected: 'Not drawn here: it frames a whole dashboard, not one chart.',
      proposal: 'Out of scope for a chart theme; a host-level dashboard template would carry it. A `furniture: { kind: "logo" }` would cover single exported charts.',
    },
    {
      id: 'plot-aspect',
      title: 'Line plots at 2:1',
      kind: 'expressiveness',
      severity: 'low',
      probe: 'plot-aspect',
      rule: '“Try to stick to an aspect ratio of 2:1 for the plot area. If that’s not an option try to make all the line charts in your dashboard have the same aspect ratio.”',
      current: '`compileDefaults.baseSize` fixes the whole canvas, not the plot; the plot’s shape then depends on the title, deck and labels around it.',
      expected: 'The plot rectangle twice as wide as it is tall, whatever the furniture.',
      proposal: '`layout.plotAspect: 2` (a preference the layout honours inside the canvas), optionally guarded by `isTemporal`.',
    },
  ],
};

// The source its source-line chart gives, so the house's source line shows (S1).
withChartSource(audiences, 'Ofcom Communications Report 2017', ['source-line']);

export default audiences;
