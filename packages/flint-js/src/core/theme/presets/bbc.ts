// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ThemePreset } from '../types';
import { BBC_ICON } from './icons';

/**
 * BBC News graphics, as the BBC Visual and Data Journalism team's bbplot package draws them: Reith
 * Sans, a large bold headline over a plain deck, light horizontal gridlines only, no axis lines or
 * titles, a heavy dark rule at zero, series named at their ends, and every chart closed by a thin
 * footer rule with the source under it and the BBC's name at its end.
 */
const REITH = "'BBC Reith Sans', Helvetica, Arial, sans-serif";
const BLUE = '#1380A1';
const AMBER = '#FAAB18';
const INK = '#222222';
const BASE = '#333333';
const NOTE = '#555555';
const GRID = '#cbcbcb';

export const bbc: ThemePreset = {
    id: 'bbc',
    label: 'BBC News',
    description:
        'BBC News graphics (bbplot): Reith Sans, a large bold headline, light horizontal gridlines with no axis lines or titles, a heavy rule at zero, and a footer rule closing every chart.',
    guidance: [
        '- `title` is the story in a few words; `subtitle` says what is measured and over what period, since the axes carry no titles.',
        '- The 4-colour key is BBC blue, amber, dark red and green; more series than that read poorly.',
        '- Name a source: it prints under the footer rule, with the BBC\u2019s name at the other end.',
    ].join('\n'),
    icon: BBC_ICON,
    spec: {
        id: 'bbc',
        label: 'BBC News',
        ink: {
            surface: { source: 'house', canvas: '#ffffff' },
            text: { primary: INK, secondary: INK, muted: NOTE, inverse: '#ffffff' },
            structure: { grid: GRID, axis: BASE, zero: BASE, rule: BASE, connector: '#dddddd' },
            series: {
                single: BLUE,
                categorical: [BLUE, AMBER, '#990000', '#588300'],
                // Ordered stacks use viridis, reversed (scale_fill_viridis_d(direction = -1)).
                sequential: { stops: ['#FDE725', '#5EC962', '#21918C', '#3B528B', '#440154'], space: 'lab' },
            },
            accent: BLUE,
        },
        type: {
            headline: { family: REITH, size: 22, weight: 'bold', case: 'asIs', color: INK },
            deck: { family: REITH, size: 17, weight: 'regular', color: INK },
            axisLabel: { family: REITH, size: 14, color: INK },
            axisTitle: { family: REITH, size: 14, color: INK },
            keyLabel: { family: REITH, size: 14, color: INK },
            valueLabel: { family: REITH, size: 13, color: '#ffffff' },
            annotation: { family: REITH, size: 13, color: NOTE },
            footnote: { family: REITH, size: 12, color: INK },
        },
        structure: {
            axis: {
                categorical: { line: 'omit', ticks: 'omit' },
                measure: { line: 'omit', ticks: 'omit' },
            },
            grid: { measure: 'quiet', category: 'omit', style: 'solid', weight: 1, zero: 'emphasised' },
            frame: 'omit',
            baseline: 'emphasised',
        },
        marks: { bandFraction: 0.9, strokeWeight: 2 },
        // bbplot plots no dots on a line; where a chart draws them, they are small and plain.
        geometry: { line: { width: 2 }, point: { presence: 'omit', size: 40 } },
        labels: { truncation: 'wrap' },
        legend: { show: 'always', placement: ['seriesEnd', 'top'], direction: 'horizontal', title: 'whenAmbiguous', align: 'start' },
        dataLabels: { show: 'never', placement: 'atMark', inkMode: 'contrastWithMark' },
        annotation: { axisTitles: 'omit', unit: 'lastTick', numberFormat: { thousands: 'separator' } },
        facets: { header: { presence: 'full', style: 'flushLabel', fieldTitle: 'omit' }, panelFrame: 'omit' },
        layout: { titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'normal' } },
        // bbplot draws at 640 × 450 with 28/22/18px type; this is that page at three quarters, the
        // size the other houses are drawn at, so the type keeps its weight against the plot.
        compileDefaults: { baseSize: { width: 480, height: 340 } },
        // The footer rule closes every chart; the source line sits under it (S1), the chart giving the words.
        furniture: [{ kind: 'footerRule', anchor: 'bottomLeft', color: INK, height: 1 }],
        // The house's name at the line's other end, level with the source (S1); the block logo is the BBC's to supply.
        source: { credit: { text: 'BBC', placement: 'end', weight: 'bold' } },
    },
};
