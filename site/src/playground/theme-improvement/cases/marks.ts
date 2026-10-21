/**
 * The mark cases: the fill, edge and order of bars, areas, wedges and dots. Each fix adds the charts
 * that show it; every case stays in the theme matrix from then on.
 */
import aviva from '../../new-theme-test/themes/aviva';
import cfpb from '../../new-theme-test/themes/cfpb';
import dmn from '../../new-theme-test/themes/dallas-morning-news';
import elastic from '../../new-theme-test/themes/elastic';
import gitlab from '../../new-theme-test/themes/gitlab';
import goldman from '../../new-theme-test/themes/goldman-sachs';
import michelin from '../../new-theme-test/themes/michelin';
import minnpost from '../../new-theme-test/themes/minnpost';
import morningstar from '../../new-theme-test/themes/morningstar';
import pearson from '../../new-theme-test/themes/pearson';
import trafford from '../../new-theme-test/themes/trafford';
import { chart, gapChart, preview, type FixCase } from './colour';

const SMALL = [['North', 412], ['South', 380], ['East', 3], ['West', 1], ['Central', 0], ['Coast', 260]].map(([Region, Cases]) => ({ Region, Cases }));

export const MARK_CASES: FixCase[] = [
  // M1 — an area's edge is its own line.
  {
    id: 'm1-elastic-edges', stage: 'm1', theme: 'Elastic', before: 'baseline',
    title: 'Stacked areas keep their edge lines',
    look: 'Before, `area.edge` became an outline on other marks and the stacked washes had no top line. After, each band carries a 1.5px line in its own ink.',
    input: gapChart(elastic, 'area-edge'),
  },
  {
    id: 'm1-pearson-bars', stage: 'm1', theme: 'Pearson', before: 'baseline',
    title: 'The area rule no longer outlines every bar',
    look: 'Before, the area edge was folded into a chart-wide outline, so the medal bars wore 3px black borders. After, the bars are plain.',
    input: gapChart(pearson, 'bar-outline'),
  },
  {
    id: 'm1-economist-guard', stage: 'm1', theme: 'economist', before: 'baseline', expect: 'same',
    title: 'Guard: a preset without an area edge',
    look: 'No shipped preset states an area edge; its areas and bars are unchanged.',
    input: preview('electricity-mix-area', 'economist'),
  },

  // M2 — a bar's fill and its edge.
  {
    id: 'm2-gitlab-columns', stage: 'm2', theme: 'GitLab', before: 'baseline',
    title: 'Columns at 20% with a 1px border in their own colour',
    look: 'Before, `band.opacity` reached only areas and the outline was structure grey. After, each column is a 20% tint edged in its full series colour.',
    input: gapChart(gitlab, 'translucent-columns'),
  },
  {
    id: 'm2-michelin-medals', stage: 'm2', theme: 'Michelin', before: 'baseline',
    title: 'A 60% fill with a same-hue edge',
    look: 'Each medal’s bars are 60% fills edged 1px in their own colour at full strength.',
    input: preview('medals-grouped', michelin.theme),
  },
  {
    id: 'm2-trafford-opacity', stage: 'm2', theme: 'Trafford', before: 'baseline',
    title: 'Bars at 80% opacity',
    look: 'The Lab orange is drawn at the house’s 80%, the softer orange of the companion charts.',
    input: gapChart(trafford, 'bar-opacity'),
  },

  // M5 — dots on lines (measured before M3/M4).
  {
    id: 'm5-goldman-every', stage: 'm5', theme: 'Goldman Sachs', before: { strip: ['geometry.point.density'] },
    title: 'A dot at every reading, past the countable dozen',
    look: '`geometry.point.density: "all"` — the dots no longer stand down past twelve readings; they shrink to sit apart.',
    input: gapChart(goldman, 'signature'),
  },
  {
    id: 'm5-dmn-hollow-ends', stage: 'm5', theme: 'Dallas Morning News', before: 'baseline',
    title: 'Hollow end markers for a house with hollow dots',
    look: 'The endpoints are rings in the line’s colour round the page, as the house’s hollow dots are; before, they were solid.',
    input: gapChart(dmn, 'signature'),
  },
  {
    id: 'm5-elastic-sparse', stage: 'm5', theme: 'Elastic', before: { strip: ['geometry.point.density', 'geometry.point.presence', 'geometry.point.fill'] },
    title: 'Points only where readings stand apart',
    look: 'Before, the house had to choose all points or none and chose none. With `presence: "full", density: "sparse"` the six-year chart, its readings well apart, gets hollow points; a dense minute-by-minute series stays bare.',
    input: preview('ev-share', elastic.theme),
  },

  // M6 — the least length of a bar.
  {
    id: 'm6-minnpost-stub', stage: 'm6', theme: 'MinnPost', before: { strip: ['geometry.band.minLength'] },
    title: 'A near-zero bar keeps a 3px stub',
    look: '`geometry.band.minLength: 3` — East (3) and West (1) would vanish into the baseline; they show as 3px stubs. Central, at zero, stays empty.',
    input: chart('Bar Chart', SMALL, { Region: 'Category', Cases: 'Count' }, { x: 'Region', y: 'Cases' }, minnpost.theme, 'Cases by region'),
  },
  {
    id: 'm6-minnpost-guard', stage: 'm6', theme: 'MinnPost', before: { strip: ['geometry.band.minLength'] }, expect: 'same',
    title: 'Guard: no bar too short to see',
    look: 'Every bar is longer than 3px, so nothing is added.',
    input: preview('population', minnpost.theme),
  },

  // M3 — wedges, dashes and shapes in the data's order.
  {
    id: 'm3-unthemed-pie', stage: 'm3', theme: 'no theme', before: 'baseline',
    title: 'Wedges run in the order of their key',
    look: 'Before, Vega-Lite stacked the wedges alphabetically (Chrome, Edge, Firefox, Other, Safari) while the key listed them in data order. After, the wedges run Chrome, Safari, Edge, Firefox, Other from 12 o’clock, as the key does.',
    input: preview('browser-pie', undefined),
  },
  {
    id: 'm3-cfpb-dashes', stage: 'm3', theme: 'CFPB', before: 'baseline',
    title: 'The first series is solid',
    look: 'Dashes follow the colour order, so Norway (the first series) is solid and the next ones dash in turn; before, they followed the names alphabetically.',
    input: gapChart(cfpb, 'dash-patterns'),
  },

  // M4 — the house's wedge rules.
  {
    id: 'm4-morningstar-largest', stage: 'm4', theme: 'Morningstar', before: { strip: ['geometry.arc.order'] },
    title: 'Largest first from 12 o’clock',
    look: '`geometry.arc.order: "largestFirst"` — the wedges run largest first, and the key in the same order.',
    input: gapChart(morningstar, 'donut-rules'),
  },
  {
    id: 'm4-aviva-data', stage: 'm4', theme: 'Aviva', before: { strip: ['geometry.arc.order'] }, expect: 'same',
    title: 'Data order, as the default now gives',
    look: '`geometry.arc.order: "data"` states what M3 made the default, so nothing more changes.',
    input: gapChart(aviva, 'wedge-order'),
  },
];
