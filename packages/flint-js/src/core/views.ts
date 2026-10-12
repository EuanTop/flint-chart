/**
 * The views a chart draws and how they stand: one plot, panels repeated over a grid, or views
 * set side by side or one above another. Sizes are each view's plot area; gaps are the space a
 * backend keeps between neighbouring views' bounds, axes and headers included.
 */

/** What a view shows: data drawn against scales, text set in columns, a self-contained tile, or a theme's rule. */
export type ViewRole = 'plot' | 'text' | 'tile' | 'rule';

export type ViewNode =
    | { kind: 'view'; role: ViewRole; width: number; height: number }
    /** Views in a row (`row`) or a column (`column`), `gap` apart. */
    | { kind: 'concat'; direction: 'row' | 'column'; gap: number; children: ViewNode[] }
    /** One panel repeated over a grid: `panels` of them, filling `columns` across and `rows` down. */
    | { kind: 'facet'; columns: number; rows: number; panels: number; gap: { row: number; column: number }; panel: ViewNode };

/** A gap as rows and columns, from a single number or a `{ row, column }` pair. */
export function gapOf(spacing: number | { row?: number; column?: number } | undefined, fallback: number): { row: number; column: number } {
    if (typeof spacing === 'number') return { row: spacing, column: spacing };
    return { row: spacing?.row ?? fallback, column: spacing?.column ?? fallback };
}

/** The distinct values a field takes over the rows, in the order they first appear. */
export function distinctOf(rows: readonly any[], field: string | undefined): string[] {
    if (!field) return [];
    return [...new Set(rows.map((row) => String(row?.[field])))];
}

/**
 * The views of a chart that facets one plot by its column and row fields: a column field alone
 * wraps into the grid the layout chose, a row field stacks, and both cross into a full grid.
 */
export function facetViews(
    plot: { width: number; height: number },
    facets: { column?: string; row?: string; wrapColumns?: number },
    rows: readonly any[],
    spacing: number | { row?: number; column?: number },
): ViewNode {
    const panel: ViewNode = { kind: 'view', role: 'plot', width: plot.width, height: plot.height };
    if (!facets.column && !facets.row) return panel;
    const across = Math.max(1, distinctOf(rows, facets.column).length);
    const down = Math.max(1, distinctOf(rows, facets.row).length);
    const gap = gapOf(spacing, 0);
    if (facets.column && !facets.row && facets.wrapColumns !== undefined) {
        const columns = Math.min(across, facets.wrapColumns);
        return { kind: 'facet', columns, rows: Math.ceil(across / columns), panels: across, gap, panel };
    }
    return { kind: 'facet', columns: across, rows: down, panels: across * down, gap, panel };
}

/** The data views of a tree, in order. */
export function plotViews(node: ViewNode): Array<Extract<ViewNode, { kind: 'view' }>> {
    if (node.kind === 'view') return node.role === 'plot' ? [node] : [];
    if (node.kind === 'facet') return plotViews(node.panel);
    return node.children.flatMap(plotViews);
}

/** The width and height the views span, gaps included, without the axes and headers around them. */
export function viewsExtent(node: ViewNode): { width: number; height: number } {
    if (node.kind === 'view') return { width: node.width, height: node.height };
    if (node.kind === 'facet') {
        const panel = viewsExtent(node.panel);
        const columns = Math.min(node.columns, node.panels);
        return {
            width: columns * panel.width + Math.max(0, columns - 1) * node.gap.column,
            height: node.rows * panel.height + Math.max(0, node.rows - 1) * node.gap.row,
        };
    }
    const children = node.children.map(viewsExtent);
    const along = (key: 'width' | 'height') => children.reduce((sum, child) => sum + child[key], 0) + Math.max(0, children.length - 1) * node.gap;
    const across = (key: 'width' | 'height') => Math.max(0, ...children.map((child) => child[key]));
    return node.direction === 'row'
        ? { width: along('width'), height: across('height') }
        : { width: across('width'), height: along('height') };
}

/** The views with each view's height given by `height`. */
export function shortenViews(node: ViewNode, height: (height: number) => number): ViewNode {
    if (node.kind === 'view') return { ...node, height: height(node.height) };
    if (node.kind === 'facet') return { ...node, panel: shortenViews(node.panel, height) };
    return { ...node, children: node.children.map((child) => shortenViews(child, height)) };
}
