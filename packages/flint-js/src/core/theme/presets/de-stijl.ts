// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ThemePreset } from '../types';
import { DE_STIJL_ICON } from './icons';

/**
 * De Stijl (Neo-Plasticism, c. 1917–1944) — the style of Mondrian and van Doesburg — read as a chart house.
 *
 * Its rules are the paintings' own, and none of them is borrowed from another house:
 *
 * - The plot is the canvas. Its field is an off-white, and heavy black lines cross it in both
 *   directions, few and far apart, so the plot reads as a composition of rectangles. There is no
 *   frame round it and no tick: the lines are what divides the picture, not a ruler's marks.
 * - A mark is a plane. Planes carry no border of their own; where two meet — a stack's pieces,
 *   a heat map's cells, a pie's wedges — the shared edge is a black line.
 * - Only horizontals and verticals. The diagonal is what Mondrian broke with van Doesburg over,
 *   so lines and areas step.
 * - Three primaries and the non-colours: red, blue, yellow, then black and grey. No gradient; a
 *   ramp is cut into flat steps.
 * - The words are a museum label: the title sits under the picture in italic, as a work's title is
 *   printed, and nothing is drawn above it.
 */
const FONT = "Futura, 'Avenir Next', 'Century Gothic', 'Helvetica Neue', Arial, sans-serif";

export const deStijl: ThemePreset = {
    id: 'de-stijl',
    label: 'De Stijl',
    description:
        'De Stijl (Neo-Plasticism): red, yellow and blue planes bounded by heavy black lines on off-white, only horizontals and verticals, and the title set under the picture like a museum label.',
    guidance: [
        '- The 5-colour key is the three primaries, then black and grey; more series than that fall to grey. A ramp is cut into flat steps.',
        '- Lines and areas step rather than slope, so the shape of a series reads as a staircase.',
        '- The title prints below the chart, in italic; keep it short, as a work title is.',
    ].join('\n'),
    icon: DE_STIJL_ICON,
    spec: {
        id: 'de-stijl',
        label: 'De Stijl',
        ink: {
            surface: { source: 'house', canvas: '#f4f1e8', plot: '#f4f1e8', panel: '#ece8dd' },
            text: { primary: '#121212', secondary: '#4a4945', muted: '#7c7a73', inverse: '#f4f1e8' },
            structure: {
                axis: '#121212', grid: '#121212', frame: '#121212', rule: '#121212',
                zero: '#121212', connector: '#121212',
            },
            series: {
                single: '#d40f0f',
                categorical: ['#d40f0f', '#1f4a94', '#f5c400', '#121212', '#a9a69d'],
                categoricalExtended: [
                    '#d40f0f', '#1f4a94', '#f5c400', '#121212', '#a9a69d',
                    '#e6a08f', '#8ea3c4', '#e8d58a', '#5a5853', '#8f2318', '#17305e', '#cfcbc0',
                ],
                overflow: '#a9a69d',
                sequential: {
                    stops: ['#e9e4d6', '#f5c400', '#d40f0f', '#1f4a94', '#121212'],
                    space: 'rgb', endpointsAgainstSurface: true, consumption: 'quantize', quantizeCount: 5,
                },
                diverging: {
                    stops: ['#1f4a94', '#8ea3c4', '#e9e4d6', '#e6a08f', '#d40f0f'],
                    neutral: '#e9e4d6', space: 'rgb', endpointsAgainstSurface: true,
                    consumption: 'quantize', quantizeCount: 5,
                },
                status: { positive: '#1f4a94', negative: '#d40f0f', neutral: '#a9a69d' },
                selection: { signed: 'status', statusUse: 'anySigned' },
            },
            accent: '#d40f0f',
        },
        type: {
            minSize: 9,
            headline: { family: FONT, size: 'text.300', weight: 'medium', style: 'italic', color: '#121212' },
            deck: { family: FONT, size: 'text.100', color: '#4a4945' },
            axisLabel: { family: FONT, size: 'text.100', color: '#4a4945' },
            axisTitle: { family: FONT, size: 'text.100', color: '#4a4945' },
            valueLabel: { family: FONT, weight: 'medium' },
            keyLabel: { family: FONT, size: 'text.100', color: '#121212' },
            display: { family: FONT, size: 'text.hero900', weight: 'medium', color: '#121212' },
        },
        structure: {
            axis: {
                categorical: { line: 'omit', ticks: 'omit', labelGap: 8 },
                measure: { line: 'omit', ticks: 'omit', labelGap: 8, tickDensity: 'sparse' },
            },
            grid: {
                measure: { presence: 'full', weight: 3 },
                category: { presence: 'full', weight: 3 },
                zero: 'full',
            },
            frame: 'omit',
            baseline: { presence: 'full', weight: 3 },
        },
        marks: {
            fillOpacity: 1,
            separator: { presence: 'full', width: 3, source: 'structure' },
            tile: { gap: 3, source: 'structure' },
            connector: { presence: 'full', weight: 3, spanWeight: 4 },
        },
        geometry: {
            line: { width: 4, cap: 'square', join: 'miter', interpolation: 'step' },
            // No circle appears in a Neo-Plastic painting: a dot is a small square plane, and opaque like every plane.
            point: { presence: 'omit', fill: 'solid', shape: 'square', size: 110, opacity: 1 },
            area: { interpolation: 'step', fill: 'solid', opacity: 1, edge: 'omit' },
            band: { fraction: 0.82, cornerRadius: 0 },
            arc: { gap: 3, gapStyle: 'rule', cornerRadius: 0 },
            cell: { gap: 3, cornerRadius: 0 },
        },
        // Bars already stand in the black lines of their own band; a line between every bar would cage them.
        variants: [
            {
                when: { hasBandedAxis: true },
                then: { structure: { grid: { category: 'omit' } } },
                because: 'Bars are planes on the field; a black line through each band would cut every bar in two.',
            },
        ],
        labels: { truncation: 'never', flush: true },
        legend: {
            show: 'always', placement: ['top'], direction: 'horizontal', swatch: 'square',
            title: 'whenAmbiguous', suppressWhenAxisNames: true,
        },
        dataLabels: { show: 'whenTheyFit', placement: 'atMark', inkMode: 'contrastWithMark' },
        layout: {
            density: 'normal',
            titleBlock: { anchor: 'start', position: 'bottom', gap: 'normal', deckGap: 'tight' },
        },
    },
};
