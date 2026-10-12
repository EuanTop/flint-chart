import type { ChartStructure } from './structure';
import type { DesignDecisions } from './theme/types';
import type { ViewNode } from './views';

/** The gap between a closing rule and the chart it closes. */
export const RULE_GAP = 6;

/** A rule a theme draws across the top or foot of a chart's block. */
export interface ClosingRule {
    edge: 'top' | 'bottom';
    width: number;
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
    const asked = design.furniture.filter((item) => item.kind === 'headerRule' || item.kind === 'footerRule');
    if (!asked.length) return undefined;
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
    const rules: ClosingRule[] = asked.map((item) => ({
        edge: (item.anchor ?? 'topLeft').startsWith('top') ? 'top' : 'bottom',
        width: item.width ?? block,
        height: item.height ?? 2,
        ...(item.color ? { color: item.color } : {}),
    }));
    return { rules, room: rules.reduce((sum, rule) => sum + rule.height + RULE_GAP, 0) };
}

/** The views with the rules set above and below them. */
export function withRules(views: ViewNode, rules: ClosingRule[]): ViewNode {
    const rule = (item: ClosingRule): ViewNode => ({ kind: 'view', role: 'rule', width: item.width, height: item.height });
    return {
        kind: 'concat', direction: 'column', gap: RULE_GAP,
        children: [
            ...rules.filter((item) => item.edge === 'top').map(rule),
            views,
            ...rules.filter((item) => item.edge === 'bottom').map(rule),
        ],
    };
}
