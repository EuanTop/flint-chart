/**
 * The gridline cases: each grid and rule styled on its own, finer lines between the labelled ones,
 * a grid over the marks, and a grid the house omits staying omitted. Each fix adds the charts that
 * show it; every case stays in the theme matrix from then on.
 */
import apple from '../../new-theme-test/themes/apple-hig';
import microsoft from '../../new-theme-test/themes/microsoft';
import monash from '../../new-theme-test/themes/monash-climate';
import ons from '../../new-theme-test/themes/ons';
import rss from '../../new-theme-test/themes/rss';
import sonos from '../../new-theme-test/themes/sonos';
import sprout from '../../new-theme-test/themes/sprout-social';
import visma from '../../new-theme-test/themes/visma';
import vtex from '../../new-theme-test/themes/vtex';
import type { ChartAssemblyInput, ThemeSpec } from 'flint-chart';
import { gapChart, preview, type FixCase } from './colour';

/** Apple's gap chart as the house was written before GR2: a solid vertical grid on continuous x. */
const appleChart = gapChart(apple, 'grid-dashed-verticals');
const appleSolid: ChartAssemblyInput = (() => {
  const theme = JSON.parse(JSON.stringify(appleChart.theme_spec)) as ThemeSpec & { variants?: Array<{ then: any }> };
  for (const v of theme.variants ?? []) if (v.then?.structure?.grid?.category) v.then.structure.grid.category = 'quiet';
  return { ...appleChart, theme_spec: theme } as ChartAssemblyInput;
})();

export const GRID_CASES: FixCase[] = [
  // GR1 — a grid the house omits stays omitted.
  {
    id: 'gr1-visma-scatter', stage: 'gr1', theme: 'Visma', before: 'baseline',
    title: 'Horizontal rules only, on a scatter too',
    look: '`grid: { measure: "hairline", category: "omit" }` — the vertical rules at every log tick, which a restore rule put back at full grey, are gone; the faint horizontals stay.',
    input: gapChart(visma, 'scatter-grid'),
  },
  {
    id: 'gr1-monash-regression', stage: 'gr1', theme: 'Monash Climate', before: 'baseline',
    title: '“Remove vertical grid-lines”, on a regression',
    look: 'The x gridlines are gone; the horizontals stay.',
    input: gapChart(monash, 'scatter-vertical-grid'),
  },
  {
    id: 'gr1-vtex-bare', stage: 'gr1', theme: 'VTEX', before: 'baseline',
    title: 'A house with no grid at all still gives a scatter one way to read it',
    look: 'Both grids omitted and no axis ruler: only the value axis’s quiet grid returns (horizontal, as the guide’s ScatterChart), not both.',
    input: gapChart(vtex, 'scatter-grid'),
  },
  {
    id: 'gr1-mckinsey-scatter', stage: 'gr1', theme: 'mckinsey', before: 'baseline',
    title: 'The one preset that changes: McKinsey’s bare scatter',
    look: 'McKinsey omits both grids and both axis lines. With nothing left to read a dot against, a grid returns — before, both ways; now only across the value axis, the vertical rules staying omitted as the house states.',
    input: preview('auto-mpg', 'mckinsey'),
  },
  // GR2 — each rule styled on its own.
  {
    id: 'gr2-apple-dashed', stage: 'gr2', theme: 'Apple HIG', before: { input: appleSolid },
    title: 'Dashed verticals beside solid horizontals',
    look: '`category: { presence: "quiet", style: "dashed", color: "#D1D1D6" }` on a continuous x — the anatomy’s dashed vertical lines, a shade darker than the solid horizontals.',
    input: gapChart(apple, 'grid-dashed-verticals'),
  },
  {
    id: 'gr2-ons-zero', stage: 'gr2', theme: 'ONS', before: { strip: ['structure.grid.zero'] },
    title: 'The zero gridline at 1.5px Grey 40',
    look: '`zero: { presence: "full", weight: 1.5, color: "#B3B3B3" }` — one step up from the 1px Grey 20 grid, not a black axis.',
    input: gapChart(ons, 'zero-line'),
  },
  {
    id: 'gr2-sprout-zero', stage: 'gr2', theme: 'Sprout Social', before: 'baseline',
    title: 'A darker zero line where zero is the floor',
    look: '`zero: { presence: "emphasised", color: "#6E797A" }` — the baseline at zero takes the zero rule’s ink and weight: the impressions line stands on a clearly darker line.',
    input: gapChart(sprout, 'zero-line'),
  },
  {
    id: 'gr2-rss-minor', stage: 'gr2', theme: 'RSS', before: { strip: ['structure.grid.minor'] },
    title: 'theme_minimal’s minor gridlines',
    look: '`minor: "hairline"` — a fainter line halfway between each pair of labelled lines, both ways, under the marks.',
    input: gapChart(rss, 'signature'),
  },
  {
    id: 'gr2-microsoft-minor', stage: 'gr2', theme: 'Microsoft', before: { strip: ['structure.grid.minor'] },
    title: 'A faint fine grid behind the labelled lines',
    look: '`minor: { divisions: 2 }` — on the measure grid (the house draws no category grid, so none is divided).',
    input: gapChart(microsoft, 'signature'),
  },
  {
    id: 'gr2-sonos-front', stage: 'gr2', theme: 'Sonos', before: { strip: ['structure.grid.category'] },
    title: 'White rules through the stack',
    look: '`category: { presence: "full", color: "#FFFFFF", layer: "front" }` — the year rules drawn over the areas, the dotted measure grid still behind.',
    input: gapChart(sonos, 'signature'),
  },
  {
    id: 'gr2-presets-guard', stage: 'gr2', theme: 'economist', before: 'baseline', expect: 'same',
    title: 'Guard: a preset grid stated as a presence',
    look: 'A grid stated as a presence reads exactly as before.',
    input: preview('us-unemployment', 'economist'),
  },
];
