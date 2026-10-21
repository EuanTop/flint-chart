/**
 * The furniture cases (the header): each fix adds the charts that show it; every case stays in the
 * theme matrix from then on.
 */
import type { ChartAssemblyInput, ThemeSpec } from 'flint-chart';
import cato from '../../new-theme-test/themes/cato';
import economist from '../../new-theme-test/themes/economist';
import justice from '../../new-theme-test/themes/justice-innovation-lab';
import radx from '../../new-theme-test/themes/radx-up';
import sonos from '../../new-theme-test/themes/sonos';
import sunlight from '../../new-theme-test/themes/sunlight';
import unhcr from '../../new-theme-test/themes/unhcr';
import urban from '../../new-theme-test/themes/urban-institute';
import wwf from '../../new-theme-test/themes/wwf';
import { gapChart, preview, type FixCase } from './colour';

const DECK = { subtitle: 'Share of new car sales, 2018–2023' };

/** The same chart with its theme changed back to how the house was written before the stage. */
function withTheme(input: ChartAssemblyInput, change: (theme: ThemeSpec) => ThemeSpec): { input: ChartAssemblyInput } {
  return { input: { ...input, theme_spec: change(input.theme_spec as ThemeSpec) } as ChartAssemblyInput };
}
const withoutFurniture = (kinds: string[]) => (theme: ThemeSpec): ThemeSpec => ({
  ...theme, furniture: (theme.furniture ?? []).filter((item) => !kinds.includes(item.kind)),
});
/** The same chart without its figure label. */
function withoutLabel(input: ChartAssemblyInput): { input: ChartAssemblyInput } {
  const { label: _label, ...chartSpec } = input.chart_spec as ChartAssemblyInput['chart_spec'] & { label?: string };
  void _label;
  return { input: { ...input, chart_spec: chartSpec } as ChartAssemblyInput };
}
const labelled = (input: ChartAssemblyInput, label: string): ChartAssemblyInput => ({ ...input, chart_spec: { ...input.chart_spec, label } } as ChartAssemblyInput);

export const FURNITURE_CASES: FixCase[] = [
  // F1 — the canvas top is the canvas edge.
  {
    id: 'f1-economist-preset', stage: 'f1', theme: 'economist (shipped preset)', before: 'baseline',
    title: 'The tab on the canvas’s top edge',
    look: 'Before, the tab sat inside the top margin and the canvas grew to hold it. After, the tab sits on the canvas’s top edge, flush with the headline, and the room comes out of the plot. (F1 also drew a 1px red line along the edge; it was taken out later, as the current Economist charts no longer carry it.)',
    input: preview('ev-share', 'economist', DECK),
  },
  {
    id: 'f1-economist-house', stage: 'f1', theme: 'The Economist', before: 'baseline',
    title: 'The house’s top rule was under the deck',
    look: 'The house stated `headerRule` for its top line, and Flint drew it under the deck across the plot only. Now the rule is on the canvas edge.',
    input: gapChart(economist, 'top-rule'),
  },
  {
    id: 'f1-unhcr-top-bar', stage: 'f1', theme: 'UNHCR', before: 'baseline',
    title: 'UNHCR’s blue top bar',
    look: 'A 0.5pt blue rule across the top of the figure, not under the title.',
    input: preview('population', unhcr.theme, { title: 'India and China hold over a third of humanity', subtitle: 'Population, millions, 2023' }),
  },
  {
    id: 'f1-no-theme-guard', stage: 'f1', theme: 'no theme', before: 'baseline', expect: 'same',
    title: 'Guard: a chart without a header is unchanged',
    look: 'No theme, no label: nothing is drawn on the canvas and the plot keeps its height.',
    input: preview('ev-share', undefined, DECK),
  },

  // F2 — above the headline.
  {
    id: 'f2-cato-figure', stage: 'f2', theme: 'Cato Institute', before: withoutLabel(labelled(preview('ev-share', cato.theme, DECK), 'Figure 1')),
    title: '“FIGURE 1” above the title',
    look: 'The chart’s `label` is set above the headline in Cato’s kicker role — uppercase Franklin Gothic — and the title moves down by its line.',
    input: labelled(preview('ev-share', cato.theme, DECK), 'Figure 1'),
  },
  {
    id: 'f2-unhcr-figure', stage: 'f2', theme: 'UNHCR', before: withoutLabel(labelled(preview('population', unhcr.theme, { title: 'India and China hold over a third of humanity' }), 'Figure 1')),
    title: 'Top bar, then “Figure 1” in blue, then the title',
    look: 'The three layers of UNHCR’s header in order: the rule on the canvas edge, the 9pt blue figure label, the headline.',
    input: labelled(preview('population', unhcr.theme, { title: 'India and China hold over a third of humanity' }), 'Figure 1'),
  },
  {
    id: 'f2-urban-figure', stage: 'f2', theme: 'Urban Institute', before: withoutLabel(labelled(preview('ev-share', urban.theme, DECK), 'Figure 3')),
    title: 'A figure number in ALL CAPS',
    look: 'Lato Regular 11px, #0A4B69, in capitals over a title-case Lato Black headline.',
    input: labelled(preview('ev-share', urban.theme, DECK), 'Figure 3'),
  },
  {
    id: 'f2-radx-figure', stage: 'f2', theme: 'RADx-UP', before: withoutLabel(labelled(preview('medals-grouped', radx.theme), 'Figure 2')),
    title: 'A figure number on a wrapped headline',
    look: 'The figure label sits at the content’s start, where the headline starts.',
    input: labelled(preview('medals-grouped', radx.theme), 'Figure 2'),
  },
  {
    id: 'f2-sonos-wordmark', stage: 'f2', theme: 'Sonos', before: withTheme(preview('ev-share', sonos.theme, DECK), withoutFurniture(['text'])),
    title: 'The SONOS wordmark heads the graphic',
    look: 'A `text` item on the line above the title, top-left, in the house face at black weight.',
    input: preview('ev-share', sonos.theme, DECK),
  },
  {
    id: 'f2-wwf-logo', stage: 'f2', theme: 'WWF', before: withTheme(preview('population', wwf.theme), withoutFurniture(['image'])),
    title: 'A logo in the top-left corner',
    look: 'An `image` item (the real panda from the local logos folder when present, else a labelled placeholder) on the line above the capital headline.',
    input: preview('population', wwf.theme),
  },
  {
    id: 'f2-label-no-theme', stage: 'f2', theme: 'no theme', before: withoutLabel(labelled(preview('ev-share', undefined, DECK), 'Figure 4')),
    title: 'A figure label without a theme',
    look: 'The label is the chart’s content, so it is drawn with no theme too, in the deck’s type.',
    input: labelled(preview('ev-share', undefined, DECK), 'Figure 4'),
  },

  // F3 — beside the headline.
  {
    id: 'f3-sunlight-logo', stage: 'f3', theme: 'Sunlight Foundation', before: withTheme(preview('ev-share', sunlight.theme, { ...DECK, title: 'Electric cars took over Norway’s new-car market in five years' }), withoutFurniture(['image'])),
    title: 'A logo beside the headline; the headline wraps in what is left',
    look: 'The logo sits top-right, level with the headline and linked; the headline is fitted to the width that remains, so it breaks earlier instead of running under the logo.',
    input: preview('ev-share', sunlight.theme, { ...DECK, title: 'Electric cars took over Norway’s new-car market in five years' }),
  },
  {
    id: 'f3-sunlight-narrow', stage: 'f3', theme: 'Sunlight Foundation (narrow)', before: withTheme(preview('ev-share', sunlight.theme, { ...DECK, baseSize: { width: 250, height: 260 } }), withoutFurniture(['image'])),
    title: 'Too narrow to share the line: the logo goes above',
    look: 'At 250px the logo would leave the headline too little room, so it moves to the line above the title (reported as `header-moved-above-title`).',
    input: preview('ev-share', sunlight.theme, { ...DECK, baseSize: { width: 250, height: 260 } }),
  },
  {
    id: 'f3-justice-plot-edge', stage: 'f3', theme: 'Justice Innovation Lab', before: withTheme(preview('population', justice.theme, { title: 'India and China hold over a third of humanity', subtitle: 'Population, millions, 2023' }), (t) => ({ ...t, layout: { ...t.layout, titleBlock: { ...t.layout?.titleBlock, frame: undefined } } })),
    title: 'The title starts where the x axis starts',
    look: 'With `layout.titleBlock.frame: "plot"` the headline and deck line up with the plot’s left edge, and the row labels hang to the left of it.',
    input: preview('population', justice.theme, { title: 'India and China hold over a third of humanity', subtitle: 'Population, millions, 2023' }),
  },
];
