/**
 * The colour cases: each fix adds the few charts that show its rule, and every case stays in the
 * theme matrix from then on, so a later fix that moves an earlier one shows up in its diff.
 *
 * `before` says how the case's "before" is drawn:
 * - `{ strip }` — the fix is an option: the same chart with the option's fields removed from the
 *   theme (the matrix confirms that, with no theme stating them, the fix changes nothing);
 * - `{ input }` — the house as it was written before the stage opted it in;
 * - `'baseline'` — the fix changed a default: the chart compiled by a snapshot of the code from before.
 */
import type { ChartAssemblyInput, ThemeSpec } from 'flint-chart';
import type { StyleGuideTheme } from '../../new-theme-test/types';
import { PREVIEW_CASES } from '../../../shared/preview-cases';
import airbnb from '../../new-theme-test/themes/airbnb-visx';
import apple from '../../new-theme-test/themes/apple-hig';
import bbc from '../../new-theme-test/themes/bbc';
import cfpb from '../../new-theme-test/themes/cfpb';
import clarity from '../../new-theme-test/themes/clarity';
import dmn from '../../new-theme-test/themes/dallas-morning-news';
import datadog from '../../new-theme-test/themes/datadog';
import dell from '../../new-theme-test/themes/dell';
import dhl from '../../new-theme-test/themes/dhl';
import ebay from '../../new-theme-test/themes/ebay';
import economist from '../../new-theme-test/themes/economist';
import finastra from '../../new-theme-test/themes/finastra';
import goldman from '../../new-theme-test/themes/goldman-sachs';
import govCanada from '../../new-theme-test/themes/gov-canada';
import hdx from '../../new-theme-test/themes/hdx';
import carbon from '../../new-theme-test/themes/ibm-carbon';
import minnpost from '../../new-theme-test/themes/minnpost';
import morningstar from '../../new-theme-test/themes/morningstar';
import radx from '../../new-theme-test/themes/radx-up';
import salesforce from '../../new-theme-test/themes/salesforce';
import semrush from '../../new-theme-test/themes/semrush';
import polaris from '../../new-theme-test/themes/shopify-polaris';
import trafford from '../../new-theme-test/themes/trafford';
import unhcr from '../../new-theme-test/themes/unhcr';
import urban from '../../new-theme-test/themes/urban-institute';
import visa from '../../new-theme-test/themes/visa';
import visma from '../../new-theme-test/themes/visma';
import vtex from '../../new-theme-test/themes/vtex';

export interface FixCase {
  id: string;
  /** The stage that added the case. */
  stage: string;
  title: string;
  /** What to look at in the pair. */
  look: string;
  /** The house or preset, as shown. */
  theme: string;
  input: ChartAssemblyInput;
  /** `input`: an explicit before — the house as it was written before the stage opted it in. */
  before: { strip: string[] } | { input: ChartAssemblyInput } | 'baseline';
  /** `same`: a guard — the fix must leave this chart as it was. */
  expect?: 'change' | 'same';
}

export type Theme = ThemeSpec | string;
const SIZE = { width: 360, height: 220 };

export function preview(id: string, theme: Theme | undefined, extra: Record<string, unknown> = {}): ChartAssemblyInput {
  const c = PREVIEW_CASES.find((x) => x.id === id);
  if (!c) throw new Error(`no preview case ${id}`);
  return {
    data: { values: c.data },
    semantic_types: c.semantic_types,
    chart_spec: { chartType: c.chartType, encodings: c.encodings, baseSize: SIZE, title: c.title, ...(c.chartProperties ? { chartProperties: c.chartProperties } : {}), ...extra },
    ...(theme ? { theme_spec: theme } : {}),
  } as ChartAssemblyInput;
}

export function chart(chartType: string, values: Record<string, unknown>[], semantic_types: Record<string, unknown>, encodings: Record<string, string>, theme: Theme | undefined, title: string): ChartAssemblyInput {
  return { data: { values }, semantic_types, chart_spec: { chartType, encodings, baseSize: SIZE, title }, ...(theme ? { theme_spec: theme } : {}) } as ChartAssemblyInput;
}

/** A house's own gap chart, as the new-theme-test page draws it. */
export function gapChart(house: StyleGuideTheme, gapId: string): ChartAssemblyInput {
  const gap = house.gaps.find((g) => g.id === gapId);
  if (!gap?.flint) throw new Error(`no gap chart ${house.id}/${gapId}`);
  return gap.flint;
}

const REGIONS = ['North', 'South', 'East', 'West', 'Central', 'Coast', 'Highlands', 'Islands', 'Valley', 'Plains', 'Delta', 'Lakes', 'Forest', 'Desert'];
/** `n` regional series over six years, apart enough that every line is visible. */
const regionLines = (n: number) => REGIONS.slice(0, n).flatMap((Region, s) =>
  [2019, 2020, 2021, 2022, 2023, 2024].map((Year, i) => ({ Year, Region, Value: 20 + s * 9 + Math.round(6 * Math.sin(i + s)) })));
export const lines = (n: number, theme: Theme, title: string) =>
  chart('Line Chart', regionLines(n), { Year: 'Year', Region: 'Category', Value: 'Quantity' }, { x: 'Year', y: 'Value', color: 'Region' }, theme, title);
export const regionBars = (n: number, theme: Theme, title: string) =>
  chart('Bar Chart', REGIONS.slice(0, n).map((Region, i) => ({ Region, Value: 90 - i * 5 })), { Region: 'Category', Value: 'Quantity' }, { y: 'Region', x: 'Value', color: 'Region' }, theme, title);

const SHORT_LINE = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023].map((Year, i) => ({ Year, 'Debt ($)': [5400, 5600, 5900, 6100, 5700, 5500, 6000, 6300][i] }));
const SIGNED = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'].map((Year, i) => ({ Year, 'Return (%)': [9.5, 19.4, -6.2, 28.9, 16.3, 26.9, -19.4, 24.2][i] }));

const TEXTURE_OFF = ['marks.texture', 'marks.redundantChannels:texture'];

export const COLOUR_CASES: FixCase[] = [
  // R1–R5 were reviewed before cases came with each fix; these were added after, against the code before R1.
  {
    id: 'r1-pie-tail', stage: 'r1', theme: 'BBC', before: 'baseline',
    title: 'Five slices, four house inks, no overflow ink',
    look: 'Before: the house set is dropped for Vega’s default scheme. After: four BBC inks and a house grey for the smallest slice.',
    input: preview('browser-pie', bbc.theme),
  },
  {
    id: 'r1-line-tail', stage: 'r1', theme: 'DHL', before: 'baseline',
    title: 'More lines than the house names',
    look: 'Lines past DHL’s inks share one grey instead of bringing in Vega’s blue, orange and teal.',
    input: lines(5, dhl.theme, 'Five regions'),
  },
  {
    id: 'r1b-other', stage: 'r1b', theme: 'BBC', before: 'baseline',
    title: 'A tail of one keeps its name',
    look: 'The one slice past the palette is keyed by its own name, not “Others (1)”.',
    input: chart('Pie Chart', [{ Browser: 'Chrome', Share: 64 }, { Browser: 'Safari', Share: 19 }, { Browser: 'Edge', Share: 5 }, { Browser: 'Firefox', Share: 3 }, { Browser: 'Other', Share: 9 }],
      { Browser: 'Category', Share: 'Quantity' }, { color: 'Browser', size: 'Share' }, bbc.theme, 'Browser share'),
  },
  {
    id: 'r2-signed-bars', stage: 'r2', theme: 'Goldman Sachs', before: 'baseline',
    title: 'One signed series of bars',
    look: 'Losses take the house’s negative ink and gains the positive one, with no Direction column in the data.',
    input: chart('Bar Chart', SIGNED, { Year: 'Year', 'Return (%)': 'Quantity' }, { x: 'Year', y: 'Return (%)' }, goldman.theme, 'S&P 500 annual return'),
  },
  {
    id: 'r3-dot-ink', stage: 'r3', theme: 'CFPB', before: 'baseline',
    title: 'Dots on a single-series line',
    look: 'The dots take the line’s green instead of Vega-Lite blue.',
    input: chart('Line Chart', SHORT_LINE, { Year: 'Year', 'Debt ($)': 'Quantity' }, { x: 'Year', y: 'Debt ($)' }, cfpb.theme, 'Average credit card debt'),
  },
  {
    id: 'r3-hollow-dots', stage: 'r3', theme: 'Government of Canada', before: 'baseline',
    title: 'Hollow dots on a line',
    look: 'Hollow dots keep a ring in the line’s colour instead of vanishing into a page-coloured stroke.',
    input: chart('Line Chart', SHORT_LINE, { Year: 'Year', 'Debt ($)': 'Quantity' }, { x: 'Year', y: 'Debt ($)' }, govCanada.theme, 'Average credit card debt'),
  },
  {
    id: 'r4-end-labels', stage: 'r4', theme: 'pop', before: 'baseline',
    title: 'Series names in a light ink',
    look: 'Names written in a light ink are darkened in their hue until they read at 3:1; the lines keep their ink.',
    input: preview('ev-share', 'pop'),
  },
  {
    id: 'r5-faint-line', stage: 'r5', theme: 'nature', before: 'baseline',
    title: 'A pale ink on a white plot',
    look: 'The seventh line, Okabe-Ito yellow, is darkened in its hue just enough to see on white.',
    input: lines(7, 'nature', 'Seven regions'),
  },

  // R6 — a set written for a series count.
  ...[2, 3, 4, 5].map((n): FixCase => ({
    id: `r6-carbon-${n}`, stage: 'r6', theme: 'IBM Carbon', before: { strip: ['ink.series.categoricalByCount'] },
    title: `${n} series under Carbon`,
    look: n === 2 ? 'Purple 70 and Teal 50, Carbon’s pair — not the first two of its 14-colour sequence.'
      : n === 3 ? 'Purple 50, Teal 70, Magenta 70: the three-series set.'
      : n === 4 ? 'Magenta 70, Red 50, Red 90, Purple 50: the four-series set.'
      : 'Purple 70, Cyan 50, Teal 70, Magenta 70, Red 90: the five-series set.',
    input: lines(n, carbon.theme, `${n} regions`),
  })),
  {
    id: 'r6-trafford-2', stage: 'r6', theme: 'Trafford Data Lab', before: { strip: ['ink.series.categoricalByCount'] },
    title: 'Two series in orange and gold',
    look: 'Two lines take Lab orange and gold; three or more still take Set2.',
    input: lines(2, trafford.theme, 'Two regions'),
  },
  {
    id: 'r6-visma-2', stage: 'r6', theme: 'Visma', before: { strip: ['ink.series.categoricalByCount'] },
    title: 'Two series apart in lightness',
    look: 'Pink and light green, the guide’s accessible pair, instead of brown and red of similar lightness.',
    input: lines(2, visma.theme, 'Two regions'),
  },
  {
    id: 'r6-hdx-4', stage: 'r6', theme: 'HDX', before: { strip: ['ink.series.categoricalByCount'] },
    title: 'Four series reorder',
    look: 'Sapphire leads at four series; two and three keep mint first.',
    input: lines(4, hdx.theme, 'Four regions'),
  },
  {
    id: 'r6-urban-6', stage: 'r6', theme: 'Urban Institute', before: { strip: ['ink.series.categoricalByCount'] },
    title: 'Green enters before magenta at six',
    look: 'The fifth line is green and the sixth magenta; at five the order is unchanged.',
    input: lines(6, urban.theme, 'Six regions'),
  },
  {
    id: 'r6-dell-14', stage: 'r6', theme: 'Dell', before: { strip: ['ink.series.categoricalByCount'] },
    title: 'Fourteen series reach categorical20',
    look: 'Past twelve, the bars take Dell’s 20-colour set instead of folding the tail into grey.',
    input: regionBars(14, dell.theme, 'Fourteen regions'),
  },
  {
    id: 'r6-datadog-repeat', stage: 'r6', theme: 'Datadog', before: { strip: ['ink.series.repeat'] },
    title: 'Colours repeat after six',
    look: 'The seventh and eighth series start the Classic palette again, as the guide says, instead of turning grey.',
    input: lines(8, datadog.theme, 'Eight regions'),
  },

  // R8 — colours bound to values: the chart's own (field annotation `colors`), the house's roles.
  {
    id: 'r8-unhcr-types', stage: 'r8', theme: 'UNHCR', before: { strip: ['semantic.colors', 'ink.series.roles'] },
    title: 'Population types keep their colours (chart annotation)',
    look: 'The chart annotates Population type with UNHCR’s colours: Refugees blue, IDPs green, Stateless yellow, Asylum-seekers cyan — whatever order the rows come in. Before, IDPs (the first row) took blue.',
    input: gapChart(unhcr, 'population-type-colours'),
  },
  {
    id: 'r8-morningstar-assets', stage: 'r8', theme: 'Morningstar', before: { strip: ['semantic.colors', 'ink.series.roles'] },
    title: 'Asset classes keep their colours (chart annotation)',
    look: 'Equities blue and Fixed Income orange in both funds, from the semantic palette the chart states, not the generic one.',
    input: gapChart(morningstar, 'semantic-colors'),
  },
  {
    id: 'r8-minnpost-parties', stage: 'r8', theme: 'MinnPost', before: { strip: ['semantic.colors', 'ink.series.roles'] },
    title: 'Party colours belong to the party (chart annotation)',
    look: 'DFL teal and Republicans red, as the chart states, instead of two of the house blues by position.',
    input: gapChart(minnpost, 'fixed-category-colors'),
  },
  {
    id: 'r8-finastra-other', stage: 'r8', theme: 'Finastra', before: { strip: ['semantic.colors', 'ink.series.roles'] },
    title: '“Other” takes the closing grey (house role)',
    look: 'The theme’s `roles.other`: the Other slice is grey wherever it falls; the named browsers take the hues.',
    input: gapChart(finastra, 'other-grey'),
  },
  {
    id: 'r8-semrush-reserved', stage: 'r8', theme: 'Semrush', before: { strip: ['semantic.colors', 'ink.series.roles'] },
    title: '“Other” takes a reserved grey (house role)',
    look: 'The theme’s `roles.other`: Other is the reserved other-data grey, not the next palette colour (amber).',
    input: gapChart(semrush, 'reserved-greys'),
  },
  {
    id: 'r8-unhcr-guard', stage: 'r8', theme: 'UNHCR', before: { strip: ['semantic.colors', 'ink.series.roles'] }, expect: 'same',
    title: 'Guard: a chart with no bound value keeps the whole palette',
    look: 'UNHCR’s population-type colours are all six of its palette inks, but they belong to the charts that annotate the field; a chart of countries still takes the palette in order.',
    input: preview('ev-share', unhcr.theme),
  },
  {
    id: 'r8-no-theme', stage: 'r8', theme: 'no theme', before: { strip: ['semantic.colors'] },
    title: 'A chart’s colours hold without a theme',
    look: 'With no theme, DFL and Republican take the colours the chart states; the other parties take the scheme in order, skipping those two.',
    input: chart('Pie Chart', [{ Party: 'Republican', Seats: 64 }, { Party: 'DFL', Seats: 70 }, { Party: 'Independence', Seats: 3 }, { Party: 'Green', Seats: 2 }],
      { Party: { semanticType: 'Category', colors: { DFL: '#0793AB', Republican: '#A1000F' } }, Seats: 'Quantity' }, { color: 'Party', size: 'Seats' }, undefined, 'Minnesota House seats'),
  },

  // R7 — inks by mark family.
  {
    id: 'r7-dmn-lines', stage: 'r7', theme: 'Dallas Morning News', before: { strip: ['ink.series.byMark'] },
    title: 'Fever lines take the line order',
    look: 'The third line is ocre and the fifth black: beige, the bars’ third ink, is too pale for a 3pt line.',
    input: lines(5, dmn.theme, 'Five regions'),
  },
  {
    id: 'r7-dmn-pie', stage: 'r7', theme: 'Dallas Morning News', before: { strip: ['ink.series.byMark'] },
    title: 'Pies take the pastel map tones',
    look: 'Country, Land, Park, Silver, Neighbor — the pie set, not the bar reds and blues.',
    input: chart('Pie Chart', [{ Browser: 'Chrome', Share: 64 }, { Browser: 'Safari', Share: 19 }, { Browser: 'Edge', Share: 8 }, { Browser: 'Firefox', Share: 5 }, { Browser: 'Opera', Share: 4 }],
      { Browser: 'Category', Share: 'Quantity' }, { color: 'Browser', size: 'Share' }, dmn.theme, 'Browser share'),
  },
  {
    id: 'r7-dmn-bars-guard', stage: 'r7', theme: 'Dallas Morning News', before: { strip: ['ink.series.byMark'] }, expect: 'same',
    title: 'Guard: bars keep the general order',
    look: 'The house states no bar family, so bars keep red, blue, beige, ocre, green.',
    input: regionBars(5, dmn.theme, 'Five regions'),
  },
  {
    id: 'r7-ebay-lines', stage: 'r7', theme: 'eBay', before: { strip: ['ink.series.byMark'] },
    title: 'Line graphs take their own tokens',
    look: 'Blue, violet, teal, pink — the line set — instead of the bar blues and the pale tint.',
    input: lines(4, ebay.theme, 'Four regions'),
  },
  {
    id: 'r7-economist-scatter', stage: 'r7', theme: 'The Economist', before: { strip: ['ink.series.byMark'] },
    title: 'Scatter colours start with cyan and dark red',
    look: 'The bubbles follow the scatter order (cyan, dark red, yellow, dark blue); bars and lines keep the web order.',
    input: preview('gapminder-bubble', economist.theme),
  },
  {
    id: 'r7-vtex-line', stage: 'r7', theme: 'VTEX', before: { strip: ['ink.series.byMark'] },
    title: 'A single line is orange',
    look: 'The line takes colors[0] (orange); before it took the single-series teal meant for bars.',
    input: chart('Line Chart', SHORT_LINE, { Year: 'Year', 'Debt ($)': 'Quantity' }, { x: 'Year', y: 'Debt ($)' }, vtex.theme, 'Average credit card debt'),
  },
  {
    id: 'r7-vtex-bar-guard', stage: 'r7', theme: 'VTEX', before: { strip: ['ink.series.byMark'] }, expect: 'same',
    title: 'Guard: a single bar stays teal',
    look: 'Bars keep the general single ink (colors[1], teal).',
    input: chart('Bar Chart', SIGNED.map((r) => ({ ...r, 'Return (%)': Math.abs(r['Return (%)'] as number) })), { Year: 'Year', 'Return (%)': 'Quantity' }, { x: 'Year', y: 'Return (%)' }, vtex.theme, 'Annual return'),
  },

  // R10 — an ordered series can take a ramp.
  {
    id: 'r10-radx-medals', stage: 'r10', theme: 'RADx-UP', before: { strip: ['ink.series.ordinal', 'ink.series.selection.ordered'] },
    title: 'Gold, Silver, Bronze in Duke Blue tints',
    look: 'The medals have a declared order, so they take the ordinal ramp darkest first, instead of three unrelated brand hues.',
    input: gapChart(radx, 'ordinal-ramp'),
  },
  {
    id: 'r10-radx-nominal-guard', stage: 'r10', theme: 'RADx-UP', before: { strip: ['ink.series.ordinal', 'ink.series.selection.ordered'] }, expect: 'same',
    title: 'Guard: an unordered series keeps distinct hues',
    look: 'Regions have no declared order, so they keep the five brand colours.',
    input: lines(4, radx.theme, 'Four regions'),
  },

  // R12 — gradient fills.
  {
    id: 'r12-airbnb-area', stage: 'r12', theme: 'Airbnb visx', before: { strip: ['geometry.area.fill'] },
    title: 'An area fades to clear',
    look: 'The area runs from its ink at the top to clear at the baseline, instead of one flat fill.',
    input: gapChart(airbnb, 'gradient-area'),
  },
  {
    id: 'r12-airbnb-stack-guard', stage: 'r12', theme: 'Airbnb visx', before: { strip: ['geometry.area.fill'] }, expect: 'same',
    title: 'Guard: stacked bands stay solid',
    look: 'Each band sits on the next; a fade would melt one into the other, so the stack is left solid (and the report says so).',
    input: preview('electricity-mix-area', airbnb.theme),
  },
  {
    id: 'r12-apple-area', stage: 'r12', theme: 'Apple HIG', before: { strip: ['geometry.area.fill', 'geometry.line.wash', 'geometry.line.washOpacity'] },
    title: 'Blue to transparent, as in Stocks',
    look: 'A vertical blue-to-clear gradient under the line.',
    input: gapChart(apple, 'gradient-area'),
  },
  {
    id: 'r12-salesforce-tint', stage: 'r12', theme: 'Salesforce', before: { strip: ['geometry.line.wash', 'geometry.line.washOpacity'] },
    title: 'Each line over a pale wash of its colour',
    look: 'A flat translucent wash in each line’s own colour down to zero; the lines stay on top and the key is unchanged.',
    input: gapChart(salesforce, 'line-wash'),
  },
  {
    id: 'r12-polaris-fade', stage: 'r12', theme: 'Shopify Polaris', before: { strip: ['geometry.line.wash', 'geometry.line.washOpacity'] },
    title: 'A fade under each line',
    look: 'Each line has an area beneath it that fades from the series colour to transparent.',
    input: gapChart(polaris, 'gradient-area'),
  },
  {
    id: 'r12-polaris-bars-guard', stage: 'r12', theme: 'Shopify Polaris', before: { strip: ['geometry.line.wash', 'geometry.line.washOpacity'] }, expect: 'same',
    title: 'Guard: bars get no wash',
    look: 'The wash belongs to lines; bars are left as they were.',
    input: regionBars(5, polaris.theme, 'Five regions'),
  },

  // R13 — pattern fills. The "before" takes texture out of the house's channels and keeps its dashes.
  {
    id: 'r13-visa-medals', stage: 'r13', theme: 'Visa', before: { strip: TEXTURE_OFF },
    title: 'Every series hatched in its darker shade',
    look: 'Each medal’s bars are a diagonal hatch in a darker shade of its ink, outlined in that shade; the key swatches are hatched too.',
    input: gapChart(visa, 'pattern-fill'),
  },
  {
    id: 'r13-visa-single', stage: 'r13', theme: 'Visa', before: { strip: TEXTURE_OFF },
    title: 'One series is hatched as well',
    look: 'Visa turns textures on for every filled mark, so a single series is hatched too.',
    input: chart('Bar Chart', REGIONS.slice(0, 5).map((Region, i) => ({ Region, Value: 90 - i * 12 })), { Region: 'Category', Value: 'Quantity' }, { y: 'Region', x: 'Value' }, visa.theme, 'Five regions'),
  },
  {
    id: 'r13-cfpb-stack', stage: 'r13', theme: 'CFPB', before: { strip: TEXTURE_OFF },
    title: 'Solid, dotted and hatched segments',
    look: 'The house order: the base solid, the middle with white dots, the top with white diagonal hatching; the key matches.',
    input: gapChart(cfpb, 'pattern-fills'),
  },
  {
    id: 'r13-clarity-grouped', stage: 'r13', theme: 'Clarity', before: { strip: TEXTURE_OFF },
    title: 'Colour and pattern on adjacent bars',
    look: 'The first series solid, the second with a white diagonal hatch, the third a dot screen.',
    input: gapChart(clarity, 'pattern-fill'),
  },
  {
    id: 'r13-clarity-pie', stage: 'r13', theme: 'Clarity', before: { strip: TEXTURE_OFF },
    title: 'Wedges carry the patterns too',
    look: 'Wedges take the same sequence as bars, in palette order; the slice gaps are kept.',
    input: preview('browser-pie', clarity.theme),
  },
  {
    id: 'r13-cfpb-line-guard', stage: 'r13', theme: 'CFPB', before: { strip: TEXTURE_OFF }, expect: 'same',
    title: 'Guard: lines keep their dashes and no fill',
    look: 'Texture belongs to filled marks; the lines keep the house dashes.',
    input: lines(4, cfpb.theme, 'Four regions'),
  },
  {
    id: 'r13-cfpb-single-guard', stage: 'r13', theme: 'CFPB', before: { strip: TEXTURE_OFF }, expect: 'same',
    title: 'Guard: one series stays solid',
    look: 'The first pattern in CFPB’s sequence is solid, so a single series is drawn as before, with no outline added.',
    input: chart('Bar Chart', REGIONS.slice(0, 5).map((Region, i) => ({ Region, Value: 90 - i * 12 })), { Region: 'Category', Value: 'Quantity' }, { y: 'Region', x: 'Value' }, cfpb.theme, 'Five regions'),
  },
];

/**
 * A chart input with the given fields removed: dotted theme paths (`ink.series.byMark`), or
 * `semantic.colors` for the value colours of every field annotation.
 */
export function stripInput(input: ChartAssemblyInput, paths: string[]): ChartAssemblyInput {
  let out: any = input;
  const themePaths = paths.filter((p) => !p.startsWith('semantic.'));
  if (themePaths.length && out.theme_spec && typeof out.theme_spec === 'object') out = { ...out, theme_spec: stripTheme(out.theme_spec, themePaths) };
  if (paths.includes('semantic.colors') && out.semantic_types) {
    out = {
      ...out,
      semantic_types: Object.fromEntries(Object.entries(out.semantic_types).map(([field, a]: [string, any]) => {
        if (!a || typeof a !== 'object' || !('colors' in a)) return [field, a];
        const { colors: _colors, ...rest } = a;
        void _colors;
        return [field, rest];
      })),
    };
  }
  return out;
}

/**
 * The theme of a case with the given dotted paths removed. `path:value` takes one value out of an
 * array instead (`marks.redundantChannels:texture` keeps the house's dashes).
 */
export function stripTheme(theme: ThemeSpec, paths: string[]): ThemeSpec {
  const copy = JSON.parse(JSON.stringify(theme));
  for (const entry of paths) {
    const [path, value] = entry.split(':');
    const keys = path.split('.');
    let node = copy;
    for (const key of keys.slice(0, -1)) node = node?.[key];
    const last = keys[keys.length - 1];
    if (!node) continue;
    if (value === undefined) delete node[last];
    else if (Array.isArray(node[last])) node[last] = node[last].filter((v: unknown) => v !== value);
  }
  return copy;
}
