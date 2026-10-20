// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ThemePreset } from '../types';
import { MATERIAL_ICON } from './icons';

/**
 * Material Design 3, read as a chart house: the baseline scheme's tonal roles and the M3 type and
 * shape scales, applied to charts the way Google's own product surfaces draw them.
 *
 * - The surface is M3's `surface` (#FFFBFE); text takes `on-surface` and `on-surface-variant`;
 *   gridlines take `outline-variant`, and the stronger `outline` is kept for the zero rule.
 * - The key leads with the baseline `primary` (#6750A4), then hues chosen to stay apart in hue
 *   and lightness — teal, amber, the `error` red, blue, green — with the scheme's own `tertiary`
 *   and `secondary` last, since they sit nearest the primary.
 * - Value ends of bars are rounded to the extra-small shape token (4px); the baseline stays square.
 * - Type is Google Sans over Roboto: a medium-weight title (M3 Title), regular body and labels.
 */
const DISPLAY = "'Google Sans', 'Google Sans Text', Roboto, system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const TEXT = "'Google Sans Text', Roboto, system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const SURFACE = '#FFFBFE';
const ON_SURFACE = '#1D1B20';
const ON_SURFACE_VARIANT = '#49454F';
const OUTLINE = '#79747E';
const OUTLINE_VARIANT = '#CAC4D0';
const PRIMARY = '#6750A4';

export const material: ThemePreset = {
    id: 'material',
    label: 'Material',
    description:
        'Material Design 3: the baseline purple-led tonal palette, Google Sans and Roboto type with a medium-weight title, light outline-variant gridlines, no axis lines, and bars rounded to the M3 shape scale.',
    guidance: [
        '- Write a title that states the message and a subtitle with the measure and units; axes are titled only where their values do not name themselves.',
        '- The 8-colour key leads with the primary purple, then teal and amber; keep to four or five series where you can.',
        '- Keep category names short: labels sit in a light on-surface-variant grey, and the plot keeps its width.',
    ].join('\n'),
    icon: MATERIAL_ICON,
    spec: {
        id: 'material',
        label: 'Material',
        ink: {
            surface: { source: 'house', canvas: SURFACE, plot: SURFACE, panel: '#F3EDF7' },
            text: { primary: ON_SURFACE, secondary: ON_SURFACE_VARIANT, muted: OUTLINE, inverse: '#FFFFFF' },
            structure: {
                axis: OUTLINE,
                grid: OUTLINE_VARIANT,
                frame: OUTLINE_VARIANT,
                rule: OUTLINE_VARIANT,
                zero: OUTLINE,
                connector: OUTLINE,
            },
            series: {
                single: PRIMARY,
                categorical: ['#6750A4', '#00696E', '#E8A600', '#B3261E', '#0B57D0', '#146C2E', '#7D5260', '#625B71'],
                categoricalExtended: [
                    '#6750A4', '#00696E', '#E8A600', '#B3261E', '#0B57D0', '#146C2E', '#7D5260', '#625B71',
                    '#B69DF8', '#4FD8EB', '#FFB4AB', '#A8C7FA',
                ],
                overflow: '#938F99',
                // The primary's own tonal palette, tone 90 down to tone 10.
                sequential: {
                    stops: ['#EADDFF', '#B69DF8', '#7F67BE', '#4F378B', '#21005D'],
                    space: 'lab',
                    endpointsAgainstSurface: true,
                },
                diverging: {
                    stops: ['#0B57D0', '#A8C7FA', '#F4EFF4', '#F2B8B5', '#B3261E'],
                    neutral: '#F4EFF4',
                    space: 'lab',
                    endpointsAgainstSurface: true,
                },
                status: { positive: '#146C2E', negative: '#B3261E', neutral: OUTLINE },
            },
            accent: PRIMARY,
        },
        type: {
            minSize: 11,
            headline: { family: DISPLAY, size: 'text.400', weight: 'medium', color: ON_SURFACE },
            deck: { family: TEXT, size: 'text.200', weight: 'regular', color: ON_SURFACE_VARIANT },
            axisLabel: { family: TEXT, size: 'text.100', weight: 'regular', color: ON_SURFACE_VARIANT },
            axisTitle: { family: TEXT, size: 'text.100', weight: 'medium', color: ON_SURFACE_VARIANT },
            valueLabel: { family: TEXT, size: 'text.100', weight: 'medium' },
            keyLabel: { family: TEXT, size: 'text.100', weight: 'regular', color: ON_SURFACE_VARIANT },
            annotation: { family: TEXT, size: 'text.100', weight: 'regular', color: ON_SURFACE_VARIANT },
            footnote: { family: TEXT, size: 'text.100', weight: 'regular', color: OUTLINE },
            display: { family: DISPLAY, size: 'text.hero900', weight: 'regular', color: ON_SURFACE },
        },
        structure: {
            axis: {
                categorical: { line: 'omit', ticks: 'omit', labelGap: 8 },
                measure: { line: 'omit', ticks: 'omit', labelGap: 8 },
            },
            grid: { measure: 'full', category: 'omit', style: 'solid', weight: 1, zero: 'quiet' },
            frame: 'omit',
            baseline: 'quiet',
        },
        marks: {
            strokeWeight: 2,
            strokeCap: 'round',
            strokeJoin: 'round',
            interpolation: 'linear',
            separator: { presence: 'full', width: 2, source: 'surface' },
            connector: { presence: 'full', weight: 1.5 },
        },
        geometry: {
            line: { width: 2, cap: 'round', join: 'round' },
            point: { presence: 'omit', size: 36, fill: 'solid' },
            area: { opacity: 0.24, edge: 'full', edgeWidth: 2 },
            // M3's extra-small shape token (4px) at the value end; the baseline stays square.
            band: { fraction: 0.7, cornerRadius: 4 },
            arc: { cornerRadius: 4, gap: 2, gapStyle: 'rule' },
            cell: { gap: 2, cornerRadius: 4 },
        },
        labels: { truncation: 'ellipsis' },
        legend: {
            show: 'always',
            placement: ['top'],
            direction: 'horizontal',
            swatch: 'circle',
            title: 'whenAmbiguous',
            align: 'start',
            suppressWhenAxisNames: true,
        },
        dataLabels: { show: 'never', placement: 'atMark', inkMode: 'contrastWithMark' },
        annotation: {
            axisTitles: 'whenAmbiguous',
            numberFormat: { precision: 'auto', thousands: 'separator' },
        },
        layout: {
            density: 'normal',
            bandStepFit: 1,
            titleBlock: { anchor: 'start', gap: 'normal', deckGap: 'tight' },
        },
    },
};
