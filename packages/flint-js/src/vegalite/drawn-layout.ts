import type { ViewNode, ViewRole } from '../core/views';
import type { ChartLayout, LayoutBox } from '../interactive/types';
import { vegaRendererOrigin } from './interactions/hit-adapter';

type Item = Record<string, any>;

/** The views a plan states, one per drawn view, in the order Vega draws them. */
function leavesOf(node: ViewNode): ViewRole[] {
    if (node.kind === 'view') return [node.role];
    if (node.kind === 'facet') return Array.from({ length: node.panels }, () => leavesOf(node.panel)).flat();
    return node.children.flatMap(leavesOf);
}

/** The first facet in a tree of views. */
function facetOf(node: ViewNode): Extract<ViewNode, { kind: 'facet' }> | undefined {
    if (node.kind === 'facet') return node;
    if (node.kind === 'concat') for (const child of node.children) { const found = facetOf(child); if (found) return found; }
    return undefined;
}

/**
 * The role of each of `count` drawn views. Where a filter leaves another number of facet panels
 * than the plan laid out, the rules keep the ends and the panel's views repeat between them.
 */
function rolesFor(planned: ViewNode, count: number): ViewRole[] {
    const roles = leavesOf(planned);
    if (roles.length === count) return roles;
    const facet = facetOf(planned);
    if (!facet) return [];
    const top = roles.findIndex((role) => role !== 'rule');
    const bottom = roles.length - 1 - [...roles].reverse().findIndex((role) => role !== 'rule');
    const unit = leavesOf(facet.panel);
    const middle = count - top - (roles.length - 1 - bottom);
    if (top < 0 || middle < 0 || middle % unit.length !== 0) return [];
    return [
        ...roles.slice(0, top),
        ...Array.from({ length: middle / unit.length }, () => unit).flat(),
        ...roles.slice(bottom + 1),
    ];
}

/** The drawn views under a group, in draw order: facet cells, the views of a concatenation, or the group itself. */
function drawnLeaves(group: Item, x: number, y: number, out: LayoutBox[]): void {
    const marks: Item[] = (group.items ?? []).filter((mark: Item) => mark.marktype === 'group');
    const cells = marks.filter((mark) => /cell$/.test(mark.name ?? ''));
    const concat = marks.filter((mark) => mark.role === 'scope' && /_group$/.test(mark.name ?? ''));
    if (cells.length) {
        for (const mark of cells) for (const cell of mark.items ?? []) drawnLeaves(cell, x + (cell.x ?? 0), y + (cell.y ?? 0), out);
        return;
    }
    if (concat.length) {
        for (const mark of concat) for (const child of mark.items ?? []) drawnLeaves(child, x + (child.x ?? 0), y + (child.y ?? 0), out);
        return;
    }
    out.push({ x, y, width: group.width ?? 0, height: group.height ?? 0 });
}

/**
 * Where a mounted chart draws its views and the block they make with their axes and headers, in
 * pixels from the top left of the drawn chart, read from Vega's scene. Each view takes the role the
 * plan states for it where the plan's views match what is drawn, else `plot`.
 */
export function readDrawnLayout(view: any, planned: ViewNode | undefined): Pick<ChartLayout, 'views' | 'block'> | undefined {
    const root: Item | undefined = view.scenegraph()?.root?.items?.[0];
    if (!root) return undefined;
    const origin = vegaRendererOrigin(view);
    const boxes: LayoutBox[] = [];
    drawnLeaves(root, origin.x, origin.y, boxes);
    const roles = planned ? rolesFor(planned, boxes.length) : [];
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const mark of root.items ?? []) {
        if (mark.role === 'legend' || mark.role === 'title') continue;
        const bounds = mark.bounds;
        if (!bounds || !Number.isFinite(bounds.x1) || bounds.x2 < bounds.x1) continue;
        x1 = Math.min(x1, bounds.x1);
        y1 = Math.min(y1, bounds.y1);
        x2 = Math.max(x2, bounds.x2);
        y2 = Math.max(y2, bounds.y2);
    }
    return {
        views: boxes.map((box, index) => ({ role: roles[index] ?? 'plot', box })),
        ...(Number.isFinite(x1) ? { block: { x: origin.x + x1, y: origin.y + y1, width: x2 - x1, height: y2 - y1 } } : {}),
    };
}
