/**
 * The header: what a chart draws on its canvas's top edge, on a line above its headline and beside
 * the headline, planned before the title is fitted. The edge band and the line above push the title
 * down; what sits beside the headline takes width from it, and the title is fitted to what is left.
 *
 * Frames (what `align` and a span are measured against): `canvas` — the exported graphic's outer
 * edges, so the canvas top is y = 0, outside the margin; `content` — inside the margin, where the
 * headline starts. A rule below the title spans the plot block and is planned with the closing rules.
 */
import { tokenToPx, fontWeightOf } from './theme/ground';
import type { DesignDecisions, ResolvedText, ThemeFurniture, TypeRole } from './theme/types';
import { applyTextCase } from './text-case';
import type { TextMeasurer } from './legend-layout';

export type HeaderZone = 'canvasTop' | 'aboveTitle' | 'besideTitle';

/** One piece of the header, placed against its frame and its zone. */
export interface HeaderPiece {
    kind: 'rect' | 'text' | 'image';
    zone: HeaderZone;
    frame: 'canvas' | 'content';
    /** `span` runs the frame's width; `middle` centres a piece in it (a label over a centred title). */
    align: 'start' | 'end' | 'span' | 'middle';
    /** px from its frame's start (or end) edge, after the pieces before it. */
    offset: number;
    /** px below the top of its zone. */
    dy: number;
    width?: number;
    height: number;
    color?: string;
    text?: string;
    font?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    src?: string;
    alt?: string;
    href?: string;
}

export interface HeaderPlan {
    /** Height of the band on the canvas's top edge. */
    edge: number;
    /** Height of the line above the headline, with its gap to the headline. */
    line: number;
    /** Width taken beside the headline at its start and end, with the gap to it. */
    beside: { start: number; end: number };
    pieces: HeaderPiece[];
    /** Why a piece meant for beside the headline was moved above it. */
    moved?: string;
}

export interface HeaderInputs {
    design: DesignDecisions;
    /** The chart's figure label or kicker (`chart_spec.label`). */
    label?: string;
    /** The width the title block would have with nothing beside it. */
    block: number;
    /** Where the headline is anchored as drawn (Vega-Lite centres an unthemed title). */
    titleAnchor: 'start' | 'middle' | 'end';
    measure: TextMeasurer;
}

const GAP = 8;
/** The narrowest a headline is fitted to before the pieces beside it move above it. */
const MIN_TITLE = 180;

type Normalised = Required<Pick<ThemeFurniture, 'kind'>> & ThemeFurniture & { zone: HeaderZone; frame: 'canvas' | 'content'; side: 'start' | 'end' };

/**
 * The earlier names, and the defaults: rules, bands and tabs sit on the canvas top; text and images
 * on the line above the title; a rule or band on the edge spans the canvas, everything else the
 * content. Rules below the title or the plot are not header pieces.
 */
function normalise(item: ThemeFurniture): Normalised | undefined {
    if (item.kind === 'headerRule' || item.kind === 'footerRule') return undefined;
    if (item.kind === 'mastheadTab') {
        const end = item.anchor === 'topRight';
        return { ...item, kind: 'tab', zone: 'aboveTitle', frame: 'content', side: end ? 'end' : 'start', width: item.width ?? 40, height: item.height ?? 2 };
    }
    const zone = item.at ?? (item.kind === 'text' || item.kind === 'image' ? 'aboveTitle' : 'canvasTop');
    if (zone === 'belowTitle') return undefined;
    const spans = item.kind === 'rule' || item.kind === 'band';
    const frame = item.frame === 'canvas' || item.frame === 'content' ? item.frame : spans && zone === 'canvasTop' ? 'canvas' : 'content';
    return { ...item, zone, frame, side: item.align ?? 'start' };
}

function textStyle(type: TypeRole | undefined, base: ResolvedText, color: string | undefined) {
    return {
        font: type?.family ?? base.font,
        fontSize: tokenToPx(type?.size) ?? base.fontSize ?? 11,
        fontWeight: fontWeightOf(type?.weight) ?? base.fontWeight,
        fontStyle: type?.style ?? base.fontStyle,
        color: type?.color ?? color ?? base.color,
        textCase: type?.case && type.case !== 'asIs' ? type.case : base.textCase,
    };
}

function piece(item: Normalised, inputs: HeaderInputs): Omit<HeaderPiece, 'offset' | 'dy'> | undefined {
    const { design, measure } = inputs;
    const base = { zone: item.zone, frame: item.frame, ...(item.href ? { href: item.href } : {}) };
    if (item.kind === 'text') {
        if (!item.text) return undefined;
        const s = textStyle(item.type, design.title.deck, item.color);
        const text = applyTextCase(item.text, s.textCase);
        const width = Math.ceil(measure(s.fontSize, s.font ?? 'sans-serif', s.fontWeight ?? 'normal', s.fontStyle ?? 'normal')(text));
        return {
            ...base, kind: 'text', align: item.side, text, width, height: Math.ceil(s.fontSize * 1.2),
            fontSize: s.fontSize, color: s.color,
            ...(s.font ? { font: s.font } : {}), ...(s.fontWeight != null ? { fontWeight: s.fontWeight } : {}), ...(s.fontStyle ? { fontStyle: s.fontStyle } : {}),
        };
    }
    if (item.kind === 'image') {
        const src = item.src ?? (item.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}` : undefined);
        if (!src) return undefined;
        const height = item.height ?? 24;
        return { ...base, kind: 'image', align: item.side, src, width: item.width ?? height * 3, height, ...(item.alt ? { alt: item.alt } : {}) };
    }
    const color = item.color ?? design.text.primary;
    if (item.kind === 'rule' || item.kind === 'band') {
        const height = item.height ?? (item.kind === 'rule' ? 2 : 24);
        return item.width != null
            ? { ...base, kind: 'rect', align: item.side, width: item.width, height, color }
            : { ...base, kind: 'rect', align: 'span', height, color };
    }
    return { ...base, kind: 'rect', align: item.side, width: item.width ?? 32, height: item.height ?? 8, color };
}

/** Lay pieces out from their frame edge, one after another with a gap. */
function lay(pieces: Array<Omit<HeaderPiece, 'offset' | 'dy'>>, dy: (p: Omit<HeaderPiece, 'offset' | 'dy'>) => number): HeaderPiece[] {
    const run = { start: 0, end: 0 };
    return pieces.map((p) => {
        if (p.align === 'span' || p.align === 'middle') return { ...p, offset: 0, dy: dy(p) };
        const side = p.align;
        const offset = run[side];
        run[side] += (p.width ?? 0) + GAP;
        return { ...p, offset, dy: dy(p) };
    });
}

export function planHeader(inputs: HeaderInputs): HeaderPlan | undefined {
    const { design, label } = inputs;
    const items = design.furniture.map(normalise).filter((item): item is Normalised => Boolean(item));
    const wanted = items.map((item) => piece(item, inputs)).filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (label?.trim()) {
        const k = design.title.kicker;
        const text = applyTextCase(label.trim(), k.textCase);
        const size = k.fontSize ?? 11;
        // The label stands over the headline, so it follows the headline's anchor.
        const align = inputs.titleAnchor;
        wanted.unshift({
            zone: 'aboveTitle', frame: 'content', kind: 'text', align, text,
            width: Math.ceil(inputs.measure(size, k.font ?? 'sans-serif', k.fontWeight ?? 'normal', k.fontStyle ?? 'normal')(text)),
            height: Math.ceil(size * 1.2), fontSize: size, color: k.color,
            ...(k.font ? { font: k.font } : {}), ...(k.fontWeight != null ? { fontWeight: k.fontWeight } : {}), ...(k.fontStyle ? { fontStyle: k.fontStyle } : {}),
        });
    }
    if (!wanted.length) return undefined;

    // Beside the headline, unless that leaves it too little room: then the pieces go above it.
    const widthAt = (side: 'start' | 'end') => wanted
        .filter((p) => p.zone === 'besideTitle' && p.align === side)
        .reduce((sum, p) => sum + (p.width ?? 0) + GAP, 0);
    let beside = { start: widthAt('start'), end: widthAt('end') };
    let moved: string | undefined;
    if ((beside.start || beside.end) && inputs.block - beside.start - beside.end < Math.min(MIN_TITLE, inputs.block * 0.75)) {
        moved = `the ${Math.round(inputs.block)}px title block cannot give ${beside.start + beside.end}px beside the headline, so those pieces sit on the line above it`;
        for (const p of wanted) if (p.zone === 'besideTitle') p.zone = 'aboveTitle';
        beside = { start: 0, end: 0 };
    }

    const inZone = (zone: HeaderZone) => wanted.filter((p) => p.zone === zone);
    const edgePieces = inZone('canvasTop');
    const edge = edgePieces.reduce((max, p) => Math.max(max, p.height), 0);
    const abovePieces = inZone('aboveTitle');
    const lineHeight = abovePieces.reduce((max, p) => Math.max(max, p.height), 0);
    const line = lineHeight ? lineHeight + Math.max(4, Math.round((design.title.kicker.fontSize ?? 11) * 0.5)) : 0;
    const pieces = [
        // On the edge everything hangs from the top: a tab under a rule shares its first pixels.
        ...lay(edgePieces, () => 0),
        // On the line above, pieces share a baseline at the line's foot.
        ...lay(abovePieces, (p) => lineHeight - p.height),
        ...lay(inZone('besideTitle'), () => 0),
    ];
    return { edge, line, beside, pieces, ...(moved ? { moved } : {}) };
}
