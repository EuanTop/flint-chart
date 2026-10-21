/**
 * The footer cases: the source line. Each fix adds the charts that show it; every case stays in the
 * theme matrix from then on.
 */
import bbc from '../../new-theme-test/themes/bbc';
import minnpost from '../../new-theme-test/themes/minnpost';
import nzz from '../../new-theme-test/themes/nzz';
import sunlight from '../../new-theme-test/themes/sunlight';
import trafford from '../../new-theme-test/themes/trafford';
import unhcr from '../../new-theme-test/themes/unhcr';
import type { ChartAssemblyInput } from 'flint-chart';
import { gapChart, preview, type FixCase } from './colour';

/** The same chart without its source. */
function withoutSource(input: ChartAssemblyInput): { input: ChartAssemblyInput } {
  const { source: _source, ...spec } = input.chart_spec as ChartAssemblyInput['chart_spec'] & { source?: unknown };
  void _source;
  return { input: { ...input, chart_spec: spec } as ChartAssemblyInput };
}
const sourced = (input: ChartAssemblyInput, source: unknown): ChartAssemblyInput => ({ ...input, chart_spec: { ...input.chart_spec, source } } as ChartAssemblyInput);

const bbcSource = gapChart(bbc, 'source-line');
const sunlightSource = gapChart(sunlight, 'source-line');
const unhcrSource = gapChart(unhcr, 'source-copyright');
const traffordSource = gapChart(trafford, 'caption');
const nzzSource = gapChart(nzz, 'source-line');
const minnpostSource = gapChart(minnpost, 'source-line');
const unthemed = sourced(preview('population', undefined), 'UN World Population Prospects 2024');
const economist = sourced(preview('population', 'economist'), 'UN World Population Prospects 2024');

export const FOOTER_CASES: FixCase[] = [
  // S1 — the source line.
  {
    id: 's1-unthemed', stage: 's1', theme: 'no theme', before: withoutSource(unthemed),
    title: 'A chart that gives a source gets a source line',
    look: '`chart_spec.source` — drawn at the foot as “Source: …” in a small muted line, with or without a theme. A chart that gives none draws none.',
    input: unthemed,
  },
  {
    id: 's1-economist', stage: 's1', theme: 'economist', before: withoutSource(economist),
    title: 'The shipped preset’s default source line',
    look: 'No preset states a `source`; the default sets the line in the footnote role (the axis labels’ size less one, the muted ink), bottom-left.',
    input: economist,
  },
  {
    id: 's1-bbc', stage: 's1', theme: 'BBC', before: withoutSource(bbcSource),
    title: 'Under the closing rule, the credit at the right',
    look: '`source: { credit: { text: "BBC", placement: "end", weight: "bold" } }` — under the house’s footer rule, “Source: Gapminder” bottom-left, the BBC credit bottom-right.',
    input: bbcSource,
  },
  {
    id: 's1-sunlight', stage: 's1', theme: 'Sunlight', before: withoutSource(sunlightSource),
    title: 'A bold lead-in, an italic source',
    look: '`leadInWeight: "bold"`, the source in the footnote role’s Georgia italic, under the house’s footer rule.',
    input: sunlightSource,
  },
  {
    id: 's1-unhcr', stage: 's1', theme: 'UNHCR', before: withoutSource(unhcrSource),
    title: 'The copyright on the next line',
    look: '`credit: { text: "© UNHCR, The UN Refugee Agency", placement: "nextLine" }`.',
    input: unhcrSource,
  },
  {
    id: 's1-trafford', stage: 's1', theme: 'Trafford', before: withoutSource(traffordSource),
    title: 'Right-aligned, the handle after the source',
    look: '`align: "end"` and an inline credit: “Source: Gapminder.org | @traffordDataLab” at the bottom right.',
    input: traffordSource,
  },
  {
    id: 's1-minnpost-rule', stage: 's1', theme: 'MinnPost', before: withoutSource(minnpostSource),
    title: 'A credit line under its own hairline',
    look: '`source: { leadIn: "", rule: { width: 1 } }` — no lead-in, a 1px rule in the credit grey above the line.',
    input: minnpostSource,
  },
  {
    id: 's1-nzz', stage: 's1', theme: 'NZZ', before: withoutSource(nzzSource),
    title: 'The house’s own lead-in and separator',
    look: '`leadIn: "Quelle:"`, an inline credit after an en dash: “Quelle: UNO – Grafik: nzz.”',
    input: nzzSource,
  },
  {
    id: 's1-wrap', stage: 's1', theme: 'no theme', before: withoutSource(sourced(preview('population', undefined), 'x')),
    title: 'A long source wraps under the chart',
    look: 'The line breaks at the title block’s width; the plot gives up the second line’s height.',
    input: sourced(preview('population', undefined), 'United Nations, Department of Economic and Social Affairs, Population Division (2024). World Population Prospects 2024, Online Edition.'),
  },
  {
    id: 's1-no-source-guard', stage: 's1', theme: 'BBC', before: { strip: ['source'] }, expect: 'same',
    title: 'Guard: no source, no footer',
    look: 'The theme says how a source reads; it never invents one. A chart with no `source` draws nothing at its foot.',
    input: preview('population', bbc.theme),
  },
];
