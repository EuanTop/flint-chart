import type { ChartStructure } from './structure';
import type { DesignDecisions } from './theme/types';
import type { ViewNode } from './views';

/** The gap between a closing rule and the chart it closes. */
export const RULE_GAP = 6;

/** A rule a theme draws across the top or foot of a chart's block. */
export interface ClosingRule {
    edge: 'top' | 'bottom';
    /** The block's width, or the theme's own; a rule at the foot runs the drawn graphic's width unless the theme states one. */
    width: number;
    /** The theme stated the width. */
    stated?: boolean;
    height: number;
    color?: string;
}

/** The rules a chart draws and the height they take from its plot, or why it draws none. */
export type RulesPlan =
    | { rules: ClosingRule[]; room: number }
    | { refused: string; message: string };

export interface RulesInputs {
    design: DesignDecisions;
    structure: ChartStructure;
    /** The chart's views, before the rules join them. */
    views: ViewNode | undefined;
    /** The width of the block a rule closes: the views and the category labels beside them. */
    block: number;
}

/**
 * The header and footer rules a theme draws across a chart's block, each `RULE_GAP` from it, their
 * height taken from the plot. A chart that is already a concatenation, a radial chart and a faceted
 * table have no single edge to close, so they draw none.
 */
export function planRules(inputs: RulesInputs): RulesPlan | undefined {
    const { design, structure, views, block } = inputs;
    const rules = closingRules(design, block);
    if (!rules.length) return undefined;
    if (views?.kind === 'concat') {
        return { refused: 'rule-not-drawn', message: 'the closing rule is not drawn — the chart is already a concatenation' };
    }
    const radial = structure.marks.includes('arc') && (structure.radius !== undefined || views?.kind === 'facet');
    if (radial) {
        return { refused: 'rule-not-drawn', message: 'the closing rule is not drawn — a radial chart is already its own block, with no edge to close' };
    }
    if (views?.kind === 'facet' && views.panel.kind === 'concat') {
        return { refused: 'rule-not-drawn', message: 'the closing rule is not drawn — a faceted table is already its own stack of blocks, with no single edge to close' };
    }
    return { rules, room: rules.reduce((sum, rule) => sum + rule.height + RULE_GAP, 0) };
}

/**
 * The rules a theme asks for across a block `block` px wide: a rule below the title spans it, and so
 * do the earlier header and footer rules.
 */
export function closingRules(design: DesignDecisions, block: number): ClosingRule[] {
    return design.furniture
        .filter((item) => item.kind === 'headerRule' || item.kind === 'footerRule'
            || ((item.kind === 'rule' || item.kind === 'band') && item.at === 'belowTitle'))
        .map((item) => ({
            edge: item.at === 'belowTitle' || (item.anchor ?? 'topLeft').startsWith('top') ? 'top' : 'bottom',
            width: item.width ?? block,
            ...(item.width !== undefined ? { stated: true } : {}),
            height: item.height ?? 2,
            ...(item.color ? { color: item.color } : {}),
        }));
}

/**
 * The views with the rules set above them. A rule at the foot is drawn on the canvas across the
 * graphic the renderer laid out, so it does not join the views.
 */
export function withRules(views: ViewNode, rules: ClosingRule[]): ViewNode {
    const rule = (item: ClosingRule): ViewNode => ({ kind: 'view', role: 'rule', width: item.width, height: item.height });
    const top = rules.filter((item) => item.edge === 'top');
    if (!top.length) return views;
    return { kind: 'concat', direction: 'column', gap: RULE_GAP, children: [...top.map(rule), views] };
}
