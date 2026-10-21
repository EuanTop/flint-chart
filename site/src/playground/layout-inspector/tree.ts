import type { VegaLiteSession } from '../../../../packages/flint-js/src/vegalite/assemble';
import type { PlanReason } from '../../../../packages/flint-js/src/core/plan';
import type { PlanStage } from '../../../../packages/flint-js/src/core/types';
import { describeTreatment, type CanvasFitResult } from '../../../../packages/flint-js/src/core/canvas-fit';
import { specFacts } from '../layout-plan-shared';
import { px, r1, signed, size, type Measured, type PartId } from './measure';

export interface TreeNode {
  id: string;
  label: string;
  /** The drawn part the node stands for, lit on the stage when the node is hovered. */
  part?: PartId;
  /** What was measured, as drawn. */
  measure?: string;
  /** What the plan decided. */
  decision?: string;
  reasons: PlanReason[];
  children?: TreeNode[];
  /** Open by default. */
  open?: boolean;
}

/** The chart's parts as a tree: what each is, what was measured, what was decided, and why. */
export function buildTree(session: VegaLiteSession, measured: Measured, canvas: { width: number; height: number }): TreeNode[] {
  const { plan } = session;
  const facts = specFacts(session.spec);
  const keysMovedByFit = Boolean(plan.canvasFit?.treatment?.keys || plan.canvasFit?.treatment?.oneKey);
  const partBox = (id: PartId) => measured.parts.find((part) => part.id === id);
  const reasonsOf = (part: PlanReason['part'], channel?: PlanReason['channel']) => plan.reasons.filter((r) => r.part === part && (channel === undefined || r.channel === channel));
  const dw = measured.drawn.width - canvas.width;
  const dh = measured.drawn.height - canvas.height;
  const nodes: TreeNode[] = [];

  nodes.push({
    id: 'canvas', label: 'Canvas', part: 'canvas', measure: size(canvas), decision: reasonsOf('canvas')[0]?.decision, reasons: reasonsOf('canvas'), open: true,
    children: [
      ...reasonsOf('rows').map((r, i) => ({ id: `rows${i}`, label: 'Rows that fit', decision: r.decision, reasons: [r] })),
      ...reasonsOf('facets').map((r) => ({ id: 'facets', label: 'Facet grid', part: partBox('facet') ? 'facet' as PartId : undefined, measure: partBox('facet') ? size(partBox('facet')!.box) : undefined, decision: r.decision, reasons: [r] })),
    ],
  });
  nodes.push({
    id: 'drawn', label: 'Drawn SVG', part: 'drawn', measure: size(measured.drawn), decision: `${signed(dw)} wide, ${signed(dh)} tall against the canvas`, reasons: [],
    children: [{ id: 'pad', label: 'Padding', part: 'pad', measure: `${measured.padding.top} ${measured.padding.right} ${measured.padding.bottom} ${measured.padding.left}`, decision: 'the theme\'s padding; Vega adds it outside everything', reasons: [] }],
  });
  const plotBox = partBox('plot');
  nodes.push({
    id: 'plot', label: 'Plot', part: 'plot', measure: plotBox ? size(plotBox.box) : undefined, open: true,
    decision: `laid out ${size(plan.plot)}${session.plot && (session.plot.height !== plan.plot.height || session.plot.width !== plan.plot.width) ? `, ${size(session.plot)} once the title, rules, header and source take theirs` : ''}${plan.composite ? ' per panel' : ''}`,
    reasons: [],
    children: [
      { id: 'plot-w', label: 'Width', decision: reasonsOf('plot', 'width')[0]?.decision, reasons: reasonsOf('plot', 'width') },
      { id: 'plot-h', label: 'Height', decision: reasonsOf('plot', 'height')[0]?.decision, reasons: reasonsOf('plot', 'height') },
      ...(reasonsOf('step', 'x').length ? [{ id: 'step-x', label: 'X band step', decision: reasonsOf('step', 'x')[0].decision, reasons: reasonsOf('step', 'x') }] : []),
      ...(reasonsOf('step', 'y').length ? [{ id: 'step-y', label: 'Y band step', decision: reasonsOf('step', 'y')[0].decision, reasons: reasonsOf('step', 'y') }] : []),
    ],
  });
  const axisChildren: TreeNode[] = [];
  for (const channel of ['x', 'y'] as const) {
    const lab = partBox(channel === 'x' ? 'xlab' : 'ylab');
    const labelReasons = reasonsOf('labels', channel);
    if (lab || labelReasons.length) {
      axisChildren.push({
        id: `${channel}lab`, label: `${channel.toUpperCase()} tick labels`, part: channel === 'x' ? 'xlab' : 'ylab', measure: lab ? size(lab.box) : undefined,
        decision: labelReasons[0]?.decision, reasons: labelReasons,
      });
    }
    const title = partBox(channel === 'x' ? 'xtitle' : 'ytitle');
    const printed = plan.axisTitles[channel];
    if (title || printed) {
      const fit = plan.axisTitleFit?.[channel];
      const titled = printed === null ? 'untitled by the plan' : printed ? `"${printed}"` : 'left to the backend';
      axisChildren.push({
        id: `${channel}title`, label: `${channel.toUpperCase()} axis title`, part: channel === 'x' ? 'xtitle' : 'ytitle', measure: title ? size(title.box) : undefined,
        decision: fit ? `${fit.lines.length} lines within ${px(fit.limit)}${fit.cut ? ', the last cut' : ''}` : titled,
        reasons: fit ? [{ part: 'labels', channel, decision: 'wrapped', chain: [{ rule: 'axis length', value: `${px(fit.limit)} px`, note: 'a title longer than its axis wraps onto two lines, split where they come out most even; past two, the second is cut' }, ...fit.lines.map((line, index) => ({ rule: `line ${index + 1}`, value: line }))] }] : [],
      });
    }
    const ruler = plan.rulers[channel];
    if (ruler) axisChildren.push({ id: `${channel}ruler`, label: `${channel.toUpperCase()} ruler`, decision: `${ruler.values.length} ticks, ${ruler.domain.map(px).join(' to ')}`, reasons: [] });
  }
  if (plan.rowNames) {
    const names = plan.rowNames;
    axisChildren.push({
      id: 'rownames', label: 'Names above bars', part: partBox('ylab') ? 'ylab' : undefined,
      decision: `${names.fontSize}px over ${px(names.bar)} px bars in ${px(names.step)} px bands`,
      reasons: [{ part: 'labels', channel: 'y', decision: 'above', chain: [
        { rule: 'band', value: `${px(names.step)} px`, note: 'twice the house band, where the stretch allows it' },
        { rule: 'name line', value: `${px(names.line)} px`, read: { gap: px(names.gap), air: px(names.top) } },
        { rule: 'bar', value: `${px(names.bar)} px` },
        { rule: 'width', value: `${px(names.width)} px`, note: 'a name may run the plot\'s width' },
      ] }],
    });
  }
  if (axisChildren.length) nodes.push({ id: 'axes', label: 'Axes', reasons: [], children: axisChildren, open: true });
  const title = partBox('title');
  const header = partBox('header');
  if (header || plan.header) {
    const h = plan.header;
    nodes.push({
      id: 'header', label: 'Header', part: header ? 'header' : undefined, measure: header ? size(header.box) : undefined,
      decision: h ? `${px(h.edge + h.line)} px: edge ${px(h.edge)}, line ${px(h.line)}${h.beside.start || h.beside.end ? `, beside the headline ${px(h.beside.start)} / ${px(h.beside.end)}` : ''}` : 'drawn, not planned',
      reasons: h ? [{ part: 'title', decision: 'header', chain: [
        ...h.pieces.map((piece) => ({ rule: `${piece.kind} · ${piece.zone}`, value: `${piece.width !== undefined ? `${px(piece.width)} × ` : ''}${px(piece.height)}`, read: { align: piece.align, frame: piece.frame }, ...(piece.text ? { note: piece.text } : {}) })),
        ...(h.moved ? [{ rule: 'moved', value: 'above the headline', note: h.moved }] : []),
      ] }] : [],
    });
  }
  if (title || plan.title) nodes.push({ id: 'title', label: 'Title and deck', part: 'title', measure: title ? size(title.box) : undefined, decision: reasonsOf('title')[0]?.decision, reasons: reasonsOf('title') });
  const legend = partBox('legend');
  if (legend || plan.legend.keys.length) {
    const layout = plan.legend.layout;
    const offsets = Object.entries(layout?.offsets ?? {}).filter(([orient]) => layout?.footprint.some((edge) => edge.orient === orient));
    const gaps: TreeNode[] = layout && (offsets.length || layout.edges.length || layout.headerGap !== undefined) ? [{
      id: 'legend-gaps', label: 'Gaps',
      decision: [...offsets.map(([orient, gap]) => `${px(gap)} from the plot (${orient})`), ...layout.edges.map((edge) => `${px(edge.gap)} between keys (${edge.orient}, ${edge.direction})`)].join(' · ') || `${px(layout.headerGap ?? 0)} under the title`,
      reasons: [{ part: 'legend', decision: 'gaps', chain: [
        ...offsets.map(([orient, gap]) => ({ rule: `to the plot · ${orient}`, value: `${px(gap)} px` })),
        ...layout.edges.map((edge) => ({ rule: `between keys · ${edge.orient}`, value: `${px(edge.gap)} px`, read: { direction: edge.direction, anchor: edge.anchor } })),
        ...(layout.headerGap !== undefined ? [{ rule: 'under the title', value: `${px(layout.headerGap)} px` }] : []),
        { rule: 'unit', value: 'em of the keys\' labels', note: 'every gap scales with the type, and eases with the plot\'s shorter side' },
      ] }],
    }] : [];
    nodes.push({
      id: 'legend', label: 'Legend', part: 'legend', measure: legend ? size(legend.box) : undefined,
      decision: keysMovedByFit
        ? `${facts.legend} · moved there by the canvas fit${reasonsOf('legend')[0] ? ` from ${reasonsOf('legend')[0].decision}` : ''}`
        : reasonsOf('legend')[0]?.decision ?? facts.legend,
      reasons: reasonsOf('legend'), children: gaps,
    });
  }
  const rule = partBox('rule');
  if (rule || plan.rules) nodes.push({ id: 'rules', label: 'Closing rules', part: 'rule', measure: rule ? size(rule.box) : undefined, decision: reasonsOf('rules')[0]?.decision, reasons: reasonsOf('rules') });
  const values = partBox('values');
  nodes.push({ id: 'values', label: 'Value labels', part: values ? 'values' : undefined, measure: values ? size(values.box) : undefined, decision: reasonsOf('values')[0]?.decision ?? (facts.values ? 'shown' : 'none'), reasons: reasonsOf('values') });
  const source = partBox('source');
  if (source || plan.source) {
    const sp = plan.source;
    nodes.push({
      id: 'source', label: 'Source line', part: source ? 'source' : undefined, measure: source ? size(source.box) : undefined,
      decision: sp ? `${px(sp.room)} px: ${sp.lines.length} line${sp.lines.length === 1 ? '' : 's'} at ${sp.fontSize}px${sp.rule ? ', ruled' : ''}` : 'drawn, not planned',
      reasons: [],
    });
  }
  nodes.push({ id: 'reserve', label: 'Measured reserve', decision: reasonsOf('reserve')[0]?.decision, reasons: reasonsOf('reserve') });
  const fit = canvasFitNode(plan.canvasFit, plan.options.canvasFit);
  if (fit) nodes.push(fit);
  return nodes;
}

const pct = (share: number): string => `${Math.round(share * 100)}%`;

/** What the canvas-fit pass judged, every edit it weighed, and the one it kept. */
function canvasFitNode(fit: CanvasFitResult | undefined, asked: string | undefined): TreeNode | undefined {
  if (!fit) return { id: 'fit', label: 'Canvas fit', decision: asked === 'off' ? 'off' : 'not run: the frame is held, or the chart is a composite', reasons: [] };
  const judged = (flags: string[]) => (flags.length ? flags.join('; ') : 'reads well');
  const estimate = (e: CanvasFitResult['before']): PlanStage[] => [
    { rule: 'judged', value: judged(e.flags), read: { drawing: size(e.drawing), shown: pct(e.scale), around: `${pct(e.around.height)} tall, ${pct(e.around.width)} wide`, labels: `y ${pct(e.labels.y)}, x ${pct(e.labels.x)}` } },
  ];
  const kept = fit.treatment;
  return {
    id: 'fit', label: 'Canvas fit', open: Boolean(kept),
    decision: kept ? describeTreatment(kept) : fit.before.flags.length ? 'nothing cleared it; drawn as planned' : 'reads well; as planned',
    reasons: [{ part: 'canvas', decision: 'before', chain: estimate(fit.before) }],
    children: [
      ...fit.tried.map((tried, index) => ({
        id: `fit-tried-${index}`,
        label: tried.label,
        decision: `${tried.treatment === kept ? 'kept · ' : ''}cost ${r1(tried.cost)}, excess ${r1(tried.excess)}`,
        reasons: [{ part: 'canvas' as const, decision: tried.label, chain: [{ rule: tried.treatment === kept ? 'kept' : 'weighed', value: judged(tried.flags) }] }],
      })),
      ...(kept && fit.after ? [{ id: 'fit-after', label: 'After', decision: judged(fit.after.flags), reasons: [{ part: 'canvas' as const, decision: 'after', chain: estimate(fit.after) }] }] : []),
    ],
  };
}
