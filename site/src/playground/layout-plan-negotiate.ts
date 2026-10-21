import type { ChartAssemblyInput } from 'flint-chart';
import { withCanvasSize } from '../../../packages/flint-js/src/core/compute-layout';
import { openVegaLiteSession } from '../../../packages/flint-js/src/vegalite/assemble';

/** A tile's place on a grid, in columns and rows. */
export interface GridItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a chart's plan says about one box, and how uncomfortable that is. */
export interface Probe {
  plot: { width: number; height: number } | undefined;
  /** The x tick label size the plan chose for this box. */
  labelSize: number;
  discomfort: number;
  /** The largest contributions, worst first, as short phrases. */
  reasons: string[];
}

export interface Trade {
  from: string;
  to: string;
  axis: 'columns' | 'rows';
  units: number;
  items: GridItem[];
  before: Record<string, Probe>;
  after: Record<string, Probe>;
  gain: number;
}

type Sized = (item: GridItem) => { width: number; height: number };

const PENALTY = {
  rowsCut: 3,
  rail: 2.5,
  turned90: 1.5,
  turned: 0.75,
  shrunk: 2,
  squeezed: 3,
  cramped: 1,
};

/**
 * Plans charts at box sizes and scores each plan. The wish is the plot a chart plans with no
 * box at all; a box that leaves less than the wish costs a little, and the plan's own signs of
 * strain cost more: rows cut, a scroll rail, turned or shrunk labels, a plot larger than its box.
 */
export class ChartProber {
  private readonly cache = new Map<string, Probe>();
  private readonly wishes = new Map<string, { width: number; height: number } | undefined>();

  constructor(private readonly specs: Record<string, ChartAssemblyInput>) {}

  wish(id: string): { width: number; height: number } | undefined {
    if (!this.wishes.has(id)) this.wishes.set(id, openVegaLiteSession(structuredClone(this.specs[id])).plot);
    return this.wishes.get(id);
  }

  probe(id: string, width: number, height: number): Probe {
    const key = `${id}:${width}x${height}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const session = openVegaLiteSession(withCanvasSize(structuredClone(this.specs[id]), { width, height }));
    const { plot } = session;
    const parts: [string, number][] = [];
    const warnings: unknown[] = session.spec?._warnings ?? [];
    if (warnings.length > 0) parts.push(['rows cut', PENALTY.rowsCut]);
    const rail = (session.spec?._viewports ?? [])[0] as { visibleCount: number; totalCount: number } | undefined;
    if (rail) {
      const hidden = 1 - rail.visibleCount / rail.totalCount;
      parts.push([`scroll rail, ${rail.totalCount - rail.visibleCount} of ${rail.totalCount} hidden`, PENALTY.rail * (0.5 + hidden)]);
    } else if (!plot) {
      parts.push(['no single plot', PENALTY.rail * 0.5]);
    }
    const x = session.axisLabels.x;
    if (Math.abs(x.angle ?? 0) >= 90) parts.push(['labels turned 90°', PENALTY.turned90]);
    else if (x.angle) parts.push([`labels turned ${Math.abs(x.angle)}°`, PENALTY.turned]);
    if (x.crowdedFrom !== undefined) parts.push([`labels ${x.fontSize}px of ${x.crowdedFrom}px`, PENALTY.shrunk * (x.crowdedFrom - x.fontSize) / x.crowdedFrom]);
    if (plot && (plot.width > width || plot.height > height)) {
      const over = Math.max(plot.width / width, plot.height / height);
      parts.push([`scaled to ${Math.round(100 / over)}%`, PENALTY.squeezed * (over - 1)]);
    }
    const wish = this.wish(id);
    if (plot && wish) {
      const short = 1 - Math.min(1, (Math.min(1, plot.width / wish.width) + Math.min(1, plot.height / wish.height)) / 2);
      if (short > 0.02) parts.push([`${Math.round(short * 100)}% short of its wish`, PENALTY.cramped * short]);
    }
    parts.sort((a, b) => b[1] - a[1]);
    const probe = {
      plot,
      labelSize: x.fontSize,
      discomfort: parts.reduce((sum, [, cost]) => sum + cost, 0),
      reasons: parts.filter(([, cost]) => cost > 0.05).map(([reason]) => reason),
    };
    this.cache.set(key, probe);
    return probe;
  }
}

/** Pairs of tiles that share one whole edge, so a column or row can pass between them. */
function boundaries(items: readonly GridItem[]): { a: GridItem; b: GridItem; axis: 'columns' | 'rows' }[] {
  const out: { a: GridItem; b: GridItem; axis: 'columns' | 'rows' }[] = [];
  for (const a of items) {
    for (const b of items) {
      if (a.id === b.id) continue;
      if (a.y === b.y && a.h === b.h && a.x + a.w === b.x) out.push({ a, b, axis: 'columns' });
      if (a.x === b.x && a.w === b.w && a.y + a.h === b.y) out.push({ a, b, axis: 'rows' });
    }
  }
  return out;
}

const MAX_UNITS = 4;

/**
 * The trade between two neighbours that lowers total discomfort most per column or row moved,
 * or undefined when none does. A trade moves one shared edge by up to four units, so a chart
 * stuck on a plateau (a scroll rail that one column does not end) can still be reached. The
 * board's size never changes.
 */
export function bestTrade(items: readonly GridItem[], prober: ChartProber, sized: Sized, min: { w: number; h: number }): Trade | undefined {
  const probeOf = (item: GridItem) => {
    const box = sized(item);
    return prober.probe(item.id, box.width, box.height);
  };
  let best: (Trade & { rate: number }) | undefined;
  for (const { a, b, axis } of boundaries(items)) {
    for (const toward of [a, b]) {
      const giver = toward === a ? b : a;
      const before = { [toward.id]: probeOf(toward), [giver.id]: probeOf(giver) };
      for (let units = 1; units <= MAX_UNITS; units += 1) {
        const grow = { ...toward };
        const give = { ...giver };
        if (axis === 'columns') {
          if (give.w - units < min.w) break;
          grow.w += units;
          give.w -= units;
          if (toward === a) give.x += units; else grow.x -= units;
        } else {
          if (give.h - units < min.h) break;
          grow.h += units;
          give.h -= units;
          if (toward === a) give.y += units; else grow.y -= units;
        }
        const after = { [grow.id]: probeOf(grow), [give.id]: probeOf(give) };
        const gain = before[toward.id].discomfort + before[giver.id].discomfort - after[grow.id].discomfort - after[give.id].discomfort;
        const rate = gain / units;
        if (gain > 0.05 && (!best || rate > best.rate)) {
          best = {
            from: giver.id,
            to: toward.id,
            axis,
            units,
            items: items.map((item) => (item.id === grow.id ? grow : item.id === give.id ? give : item)),
            before,
            after,
            gain,
            rate,
          };
        }
      }
    }
  }
  return best;
}
