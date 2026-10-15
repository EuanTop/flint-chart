// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * The air around a chart's keys and within its header, in em of the keys' type — so it keeps its
 * proportion to the text it separates — eased with the plot's size, so a small tile packs a little
 * closer and a large chart breathes a little more, rather than a fixed 18 px that is nothing on a
 * large chart and a key row's worth on a small one.
 *
 * The header — the headline, its deck and any keys above the plot — reads as one block with one
 * rhythm: the title block to the keys under it and one key to the next stand the same gap apart, and
 * the theme's title gap stands once, between the block and the plot. A key with no title above it
 * keeps its own gap to the plot. A theme sets any of them (`legend.gaps`).
 */

export type Density = 'compact' | 'normal' | 'airy';

/** The gaps a theme may set, in em of the keys' labels. */
export interface KeyGapSpec {
    /** The title block to keys standing under it. */
    title?: number;
    /** Between keys one above another. */
    stack?: number;
    /** Between keys side by side. */
    row?: number;
    /** A key to the plot. */
    plot?: number;
}

/** The header's one rhythm, title to keys and key to key, in em. */
export const HEADER_RHYTHM_EM = 0.5;
/** Between keys side by side: wide enough to tell one key from the next along a line, in em. */
export const KEY_ROW_GAP_EM = 1.5;
/** A key's gap to the plot, in em of its labels, by the house's density. */
export const KEY_GAP_EM: Record<Density, number> = { compact: 0.8, normal: 1, airy: 1.4 };

/** The plot side at which gaps stand at their stated em, and how far they ease either way. */
const REFERENCE_SIDE = 300;
const EASE = { least: 0.75, most: 1.25 };
/** The least gap, in px, at any size. */
const GAP_FLOOR = 4;

/** How the gaps ease with the plot: in proportion to its shorter side, from three-quarters to a quarter more. */
export function gapEase(plotSide: number | undefined): number {
    if (!plotSide || !Number.isFinite(plotSide)) return 1;
    return Math.min(EASE.most, Math.max(EASE.least, plotSide / REFERENCE_SIDE));
}

/** A gap in px: so many em of the labels, eased with the plot. */
export function gapPx(em: number, labelFontSize: number, plotSide?: number, floor = GAP_FLOOR): number {
    return Math.max(floor, Math.round(em * labelFontSize * gapEase(plotSide)));
}

/** The gap between keys one above another. */
export function keyStackGap(labelFontSize: number, plotSide?: number, spec?: KeyGapSpec): number {
    return gapPx(spec?.stack ?? HEADER_RHYTHM_EM, labelFontSize, plotSide);
}

/** The gap between keys side by side. */
export function keyRowGap(labelFontSize: number, plotSide?: number, spec?: KeyGapSpec): number {
    return gapPx(spec?.row ?? KEY_ROW_GAP_EM, labelFontSize, plotSide);
}

/** The gap from a key to the plot. */
export function keyGap(labelFontSize: number, density: Density = 'normal', plotSide?: number, spec?: KeyGapSpec): number {
    return gapPx(spec?.plot ?? KEY_GAP_EM[density], labelFontSize, plotSide, GAP_FLOOR + 2);
}

/** The gap between the title block and keys standing under it. */
export function headerInnerGap(labelFontSize: number, plotSide?: number, spec?: KeyGapSpec): number {
    return gapPx(spec?.title ?? HEADER_RHYTHM_EM, labelFontSize, plotSide);
}

/**
 * The gaps the keys stand at, per edge, and the title's gap to keys under it: the key gap at every
 * edge, but where a title stands over keys above the plot, the title's own gap moves below them —
 * the block's one gap to the plot — and the title stands the header's rhythm over the keys.
 * `atLeast` holds an edge clear of something drawn there (a flat y title under a top key).
 */
export function keyGaps(input: {
    labelFontSize: number;
    density?: Density;
    /** The plot's shorter side, which the gaps ease with. */
    plotSide?: number;
    spec?: KeyGapSpec;
    /** Whether a title stands above the plot. */
    titled: boolean;
    /** Whether keys stand above the plot. */
    topKeys: boolean;
    /** The title's gap to what is under it, as the theme sets it. */
    titleGap: number;
    atLeast?: Partial<Record<string, number>>;
}): { offsets: Record<'left' | 'right' | 'top' | 'bottom', number>; headerGap?: number } {
    const gap = keyGap(input.labelFontSize, input.density, input.plotSide, input.spec);
    const header = input.titled && input.topKeys;
    const offsets = { left: gap, right: gap, bottom: gap, top: header ? input.titleGap : gap };
    for (const [edge, least] of Object.entries(input.atLeast ?? {})) {
        if (least !== undefined && edge in offsets) offsets[edge as keyof typeof offsets] = Math.max(offsets[edge as keyof typeof offsets], least);
    }
    return { offsets, ...(header ? { headerGap: headerInnerGap(input.labelFontSize, input.plotSide, input.spec) } : {}) };
}
