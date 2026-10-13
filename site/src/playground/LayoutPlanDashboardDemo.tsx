import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ChartAssemblyInput } from 'flint-chart';
import { THEME_PRESETS } from 'flint-chart';
import type { InteractiveChartSurface } from 'flint-chart/interactive';
import { FlintChart } from 'flint-chart/react';
import gasoline from '../data/us-gasoline-prices.json';
import { RESIZE_CASES, SvgChart, px, type Plot } from './layout-plan-shared';
import { withCanvasSize } from '../../../packages/flint-js/src/core/compute-layout';
import { openVegaLiteSession } from '../../../packages/flint-js/src/vegalite/assemble';
import { bestTrade, ChartProber, type GridItem as Item, type Probe, type Trade } from './layout-plan-negotiate';

const COLS = 12;
const GAP = 8;
const HEADER = 30;
const MIN_W = 3;
const MIN_H = 4;
const BOARD_WIDTH = { min: 560, start: 880, max: 900 };
const ROW = { min: 22, start: 36, max: 64 };

/** The grid's pixel sizes for a board width and row height. */
interface Dims {
  colWidth: number;
  row: number;
}

const dimsOf = (width: number, row: number): Dims => ({ colWidth: (width - (COLS - 1) * GAP) / COLS, row });

const caseSpec = (id: string): ChartAssemblyInput => RESIZE_CASES.find((entry) => entry.id === id)!.spec;

const TILES: { id: string; title: string; spec: ChartAssemblyInput }[] = [
  {
    id: 'gas',
    title: 'Gasoline, weekly',
    spec: {
      data: { values: gasoline.rows },
      semantic_types: { Week: 'Date', Price: { semanticType: 'Price', unit: 'USD' } },
      chart_spec: { chartType: 'Line Chart', title: 'U.S. regular gasoline, per gallon', encodings: { x: 'Week', y: 'Price' } },
    },
  },
  { id: 'bars', title: 'Goals per team', spec: caseSpec('bars') },
  { id: 'heatmap', title: 'Monthly temperature anomaly', spec: caseSpec('heatmap') },
  { id: 'pie', title: 'Time with others', spec: caseSpec('pie') },
];


const NO_THEME = 'none';
const MAX_TRADES = 14;
const TRADE_PAUSE_MS = 700;
const tileTitle = (id: string) => TILES.find((tile) => tile.id === id)?.title ?? id;

function describeTrade(trade: Trade, round: number): string {
  const unit = `${trade.units === 1 ? 'a' : trade.units} ${trade.axis === 'columns' ? 'column' : 'row'}${trade.units === 1 ? '' : 's'}`;
  const side = (id: string) => {
    const before = trade.before[id];
    const after = trade.after[id];
    return `${tileTitle(id)} ${before.discomfort.toFixed(1)} → ${after.discomfort.toFixed(1)} (${before.reasons[0] ?? 'comfortable'} → ${after.reasons[0] ?? 'comfortable'})`;
  };
  return `${round}. ${tileTitle(trade.to)} takes ${unit} from ${tileTitle(trade.from)}: ${side(trade.to)}; ${side(trade.from)}.`;
}

const comfortClass = (probe: Probe | undefined) => {
  if (!probe) return '';
  if (probe.discomfort < 0.5) return 'lp-comfort-good';
  if (probe.discomfort < 2) return 'lp-comfort-fair';
  return 'lp-comfort-poor';
};

type Mode = 'fill' | 'move';

const START: Item[] = [
  { id: 'gas', x: 0, y: 0, w: 7, h: 7 },
  { id: 'bars', x: 7, y: 0, w: 5, h: 7 },
  { id: 'heatmap', x: 0, y: 7, w: 7, h: 8 },
  { id: 'pie', x: 7, y: 7, w: 5, h: 8 },
];

const PRESETS: { label: string; items: Item[] }[] = [
  { label: 'Two by two', items: START },
  {
    label: 'Hero line',
    items: [
      { id: 'gas', x: 0, y: 0, w: 12, h: 7 },
      { id: 'bars', x: 0, y: 7, w: 4, h: 7 },
      { id: 'heatmap', x: 4, y: 7, w: 5, h: 7 },
      { id: 'pie', x: 9, y: 7, w: 3, h: 7 },
    ],
  },
  {
    label: 'Column',
    items: [
      { id: 'gas', x: 0, y: 0, w: 12, h: 6 },
      { id: 'bars', x: 0, y: 6, w: 12, h: 7 },
      { id: 'heatmap', x: 0, y: 13, w: 12, h: 8 },
      { id: 'pie', x: 0, y: 21, w: 12, h: 7 },
    ],
  },
];

const collide = (a: Item, b: Item) => a.id !== b.id && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const sharesRows = (a: Item, b: Item) => a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * The board after one tile changed: in `fill` mode a side neighbour first gives up or takes
 * width to keep the row full; whatever still overlaps moves down; then every other tile floats
 * up as far as it can. The changed tile stays where the reader put it.
 */
function arrange(items: readonly Item[], activeId: string, mode: Mode): Item[] {
  const active = { ...items.find(({ id }) => id === activeId)! };
  let others = items.filter(({ id }) => id !== activeId).map((item) => ({ ...item }));

  if (mode === 'fill') {
    for (const other of others) {
      if (!sharesRows(active, other)) continue;
      if (other.x >= active.x + active.w / 2 && collide(active, other)) {
        const right = other.x + other.w;
        const x = active.x + active.w;
        if (right - x >= MIN_W) { other.x = x; other.w = right - x; }
      } else if (other.x + other.w <= active.x + active.w / 2 && collide(active, other)) {
        const width = active.x - other.x;
        if (width >= MIN_W) other.w = width;
      }
    }
  }

  const placed: Item[] = [active];
  others.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const item of others) {
    let blocker = placed.find((entry) => collide(entry, item));
    while (blocker) {
      item.y = blocker.y + blocker.h;
      blocker = placed.find((entry) => collide(entry, item));
    }
    placed.push(item);
  }

  others = placed.slice(1).sort((a, b) => a.y - b.y || a.x - b.x);
  const settled: Item[] = [active];
  for (const item of others) {
    for (let y = 0; y < item.y; y += 1) {
      if (!settled.some((entry) => collide(entry, { ...item, y }))) { item.y = y; break; }
    }
    settled.push(item);
  }

  if (mode === 'fill') {
    for (const item of settled.slice(1)) {
      while (item.x + item.w < COLS && !settled.some((entry) => collide(entry, { ...item, w: item.w + 1 }))) item.w += 1;
      while (item.x > 0 && !settled.some((entry) => collide(entry, { ...item, x: item.x - 1, w: item.w + 1 }))) { item.x -= 1; item.w += 1; }
    }
  }
  return items.map(({ id }) => settled.find((entry) => entry.id === id)!);
}

const toPx = (item: Item, { colWidth, row }: Dims) => ({
  left: Math.round(item.x * (colWidth + GAP)),
  top: Math.round(item.y * (row + GAP)),
  width: Math.round(item.w * colWidth + (item.w - 1) * GAP),
  height: Math.round(item.h * row + (item.h - 1) * GAP),
});

const rowsOf = (items: readonly Item[]) => Math.max(...items.map((item) => item.y + item.h));

type Gesture = 'move' | 'right' | 'bottom' | 'corner' | 'board';

interface TileReport {
  plot: Plot;
  box: string;
}

function TileStatus({ id, box, report }: { id: string; box: string; report: TileReport | undefined }) {
  const settled = report?.box === box;
  return (
    <span className={settled ? '' : 'lp-tile-pending'} data-tile-status={id}>
      {settled ? (report?.plot ? `plot ${px(report.plot.width)} × ${px(report.plot.height)}` : 'scrolls') : 'resizing…'}
    </span>
  );
}

export function DashboardDemo() {
  const [items, setItems] = useState<Item[]>(START);
  const [mode, setMode] = useState<Mode>('fill');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, TileReport>>({});
  const [boardWidth, setBoardWidth] = useState(BOARD_WIDTH.start);
  const [rowHeight, setRowHeight] = useState(ROW.start);
  const dims = dimsOf(boardWidth, rowHeight);
  const [theme, setTheme] = useState(NO_THEME);
  const [log, setLog] = useState<string[]>([]);
  const [negotiating, setNegotiating] = useState(false);
  const [autoNegotiate, setAutoNegotiate] = useState(false);
  const [matchLabels, setMatchLabels] = useState<'off' | 'smallest' | 'majority'>('off');
  const timer = useRef<number>();
  const specs = useMemo(() => Object.fromEntries(TILES.map((tile) => [
    tile.id, theme === NO_THEME ? tile.spec : { ...tile.spec, theme_spec: theme },
  ])) as Record<string, ChartAssemblyInput>, [theme]);
  const prober = useMemo(() => new ChartProber(specs), [specs]);
  const sized = useCallback((item: Item) => {
    const box = toPx(item, dims);
    return { width: box.width, height: Math.max(40, box.height - HEADER) };
  }, [dims]);

  const matched = useMemo(() => {
    if (matchLabels === 'off' || activeId) return undefined;
    const boxes = Object.fromEntries(items.map((item) => [item.id, sized(item)]));
    const axisTiles = TILES.filter((tile) => tile.id !== 'pie');
    const planned = Object.fromEntries(axisTiles.map((tile) => [tile.id, prober.probe(tile.id, boxes[tile.id].width, boxes[tile.id].height).labelSize]));
    const sizes = Object.values(planned).sort((a, b) => a - b);
    const size = matchLabels === 'smallest' ? sizes[0] : sizes[Math.floor((sizes.length - 1) / 2)];
    const tiles = Object.fromEntries(axisTiles.map((tile) => {
      const exception = planned[tile.id] < size;
      const session = openVegaLiteSession(withCanvasSize(structuredClone(specs[tile.id]), boxes[tile.id]), exception ? {} : {
        pins: { axisLabels: { x: { fontSize: size }, y: { fontSize: size } } },
      });
      return [tile.id, { spec: session.spec, plot: session.plot, exception, own: planned[tile.id] }];
    }));
    return { size, tiles };
  }, [matchLabels, activeId, items, sized, prober, specs]);

  const stopNegotiating = useCallback(() => {
    window.clearTimeout(timer.current);
    setNegotiating(false);
  }, []);
  useEffect(() => stopNegotiating, [stopNegotiating]);

  const negotiate = useCallback((from: Item[]) => {
    window.clearTimeout(timer.current);
    setNegotiating(true);
    const total = (layout: Item[]) => layout.reduce((sum, item) => {
      const box = sized(item);
      return sum + prober.probe(item.id, box.width, box.height).discomfort;
    }, 0);
    const start = total(from);
    setLog([`Each chart states its wish: ${TILES.map((tile) => {
      const wish = prober.wish(tile.id);
      return `${tile.title} ${wish ? `${Math.round(wish.width)} × ${Math.round(wish.height)}` : 'a scroll rail'}`;
    }).join(', ')}. Total discomfort ${start.toFixed(1)}.`]);
    let current = from;
    let round = 0;
    const step = () => {
      const trade = round < MAX_TRADES ? bestTrade(current, prober, sized, { w: MIN_W, h: MIN_H }) : undefined;
      if (!trade) {
        setLog((lines) => [...lines, round === 0
          ? 'No trade helps: every tile is as comfortable as the board allows.'
          : `Settled after ${round} ${round === 1 ? 'trade' : 'trades'}: total discomfort ${start.toFixed(1)} → ${total(current).toFixed(1)}.`]);
        setNegotiating(false);
        return;
      }
      round += 1;
      current = trade.items;
      setItems(trade.items);
      setLog((lines) => [...lines, describeTrade(trade, round)]);
      timer.current = window.setTimeout(step, TRADE_PAUSE_MS);
    };
    timer.current = window.setTimeout(step, 200);
  }, [prober, sized]);
  const gesture = useRef<{ kind: Gesture; id: string; x: number; y: number; start: Item[]; width: number; row: number } | null>(null);

  const onRender = useCallback((id: string, surface: InteractiveChartSurface, box: string) => {
    setReports((current) => ({ ...current, [id]: { plot: surface.layout?.plot, box } }));
  }, []);

  const begin = (kind: Gesture, id: string) => (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('select, button')) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    stopNegotiating();
    gesture.current = { kind, id, x: event.clientX, y: event.clientY, start: items, width: boardWidth, row: rowHeight };
    setActiveId(id);
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active) return;
    if (active.kind === 'board') {
      const rows = rowsOf(active.start);
      const height = rows * active.row + (rows - 1) * GAP + event.clientY - active.y;
      setBoardWidth(Math.round(Math.min(BOARD_WIDTH.max, Math.max(BOARD_WIDTH.min, active.width + event.clientX - active.x))));
      setRowHeight(Math.min(ROW.max, Math.max(ROW.min, (height - (rows - 1) * GAP) / rows)));
      return;
    }
    const dx = Math.round((event.clientX - active.x) / (dims.colWidth + GAP));
    const dy = Math.round((event.clientY - active.y) / (dims.row + GAP));
    const startItem = active.start.find(({ id }) => id === active.id)!;
    const next = { ...startItem };
    if (active.kind === 'move') {
      next.x = Math.min(COLS - next.w, Math.max(0, startItem.x + dx));
      next.y = Math.max(0, startItem.y + dy);
    }
    if (active.kind === 'right' || active.kind === 'corner') next.w = Math.min(COLS - next.x, Math.max(MIN_W, startItem.w + dx));
    if (active.kind === 'bottom' || active.kind === 'corner') next.h = Math.max(MIN_H, startItem.h + dy);
    const changed = active.start.map((item) => (item.id === active.id ? next : item));
    setItems(arrange(changed, active.id, mode));
  };
  const end = () => {
    const finished = gesture.current;
    gesture.current = null;
    setActiveId(null);
    if (finished?.kind === 'board' && autoNegotiate) negotiate(items);
  };
  const handlers = (kind: Gesture, id: string) => ({
    onPointerDown: begin(kind, id),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
  });

  const rows = rowsOf(items);
  const boardHeight = Math.round(rows * rowHeight + (rows - 1) * GAP);

  return (
    <section className="ov-demo lp-demo" data-demo="dashboard">
      <header className="ov-demo-header">
        <div>
          <h2>A dashboard that lays itself out</h2>
          <p>Drag tiles by their header, resize them by their edges, or resize the whole board by its corner; every tile whose box changes is planned again. Negotiate lets the charts trade space until each is as comfortable as the board allows.</p>
        </div>
        <div className="ov-backends" role="group" aria-label="Layout">
          {PRESETS.map((preset) => (
            <button type="button" key={preset.label} onClick={() => { stopNegotiating(); setItems(preset.items); setBoardWidth(BOARD_WIDTH.start); setRowHeight(ROW.start); }}>{preset.label}</button>
          ))}
        </div>
      </header>
      <div className="lp-toolbar">
        <div className="ov-backends" role="group" aria-label="Negotiate">
          <button type="button" className={negotiating ? 'active' : ''} onClick={() => (negotiating ? stopNegotiating() : negotiate(items))}>{negotiating ? 'Stop' : 'Negotiate'}</button>
          <button type="button" className={autoNegotiate ? 'active' : ''} aria-pressed={autoNegotiate} onClick={() => setAutoNegotiate((value) => !value)}>Renegotiate on resize</button>
        </div>
        <div className="lp-toolbar-group">
          <span>Neighbours</span>
          <div className="ov-backends" role="group" aria-label="Neighbours">
            <button type="button" className={mode === 'fill' ? 'active' : ''} onClick={() => setMode('fill')}>Fill rows</button>
            <button type="button" className={mode === 'move' ? 'active' : ''} onClick={() => setMode('move')}>Move only</button>
          </div>
        </div>
        <div className="lp-toolbar-group">
          <span>Label sizes</span>
          <div className="ov-backends" role="group" aria-label="Label sizes">
            <button type="button" className={matchLabels === 'off' ? 'active' : ''} onClick={() => setMatchLabels('off')}>Per chart</button>
            <button type="button" className={matchLabels === 'smallest' ? 'active' : ''} onClick={() => setMatchLabels('smallest')}>Smallest</button>
            <button type="button" className={matchLabels === 'majority' ? 'active' : ''} onClick={() => setMatchLabels('majority')}>Majority</button>
          </div>
        </div>
        <label className="lp-toolbar-group">
          <span>Theme</span>
          <select value={theme} onChange={(event) => { stopNegotiating(); setTheme(event.target.value); }}>
            <option value={NO_THEME}>None</option>
            {Object.keys(THEME_PRESETS).map((id) => <option key={id} value={id}>{THEME_PRESETS[id].label}</option>)}
          </select>
        </label>
      </div>
      <div className="lp-board-scroll">
        <div className={`lp-board${activeId ? ' lp-board-dragging' : ''}`} style={{ width: boardWidth, height: boardHeight }} data-board={`${boardWidth}x${boardHeight}`}>
          {TILES.map((tile) => {
            const item = items.find(({ id }) => id === tile.id)!;
            const box = toPx(item, dims);
            const chartHeight = Math.max(40, box.height - HEADER);
            const boxText = `${box.width} × ${chartHeight}`;
            const comfort = activeId ? undefined : prober.probe(tile.id, box.width, chartHeight);
            return (
              <div key={tile.id} className={`lp-tile lp-grid-tile${activeId === tile.id ? ' lp-tile-active' : ''}`} data-tile={tile.id}
                data-grid={`${item.x},${item.y},${item.w},${item.h}`} style={box}>
                <header className="lp-tile-header lp-tile-grip" {...handlers('move', tile.id)}>
                  <strong>
                    <span className={`lp-comfort ${comfortClass(comfort)}`} data-comfort={tile.id} data-discomfort={comfort?.discomfort.toFixed(2)}
                      title={comfort ? `Discomfort ${comfort.discomfort.toFixed(1)}${comfort.reasons.length ? `: ${comfort.reasons.join(', ')}` : ''}` : undefined} />
                    {tile.title}
                  </strong>
                  {matched?.tiles[tile.id]
                    ? <span data-tile-status={tile.id} className={matched.tiles[tile.id].exception ? 'lp-tile-pending' : ''}>{`${matched.tiles[tile.id].exception ? `exception: keeps ${matched.tiles[tile.id].own}px` : `labels ${matched.size}px`} · plot ${matched.tiles[tile.id].plot ? `${px(matched.tiles[tile.id].plot!.width)} × ${px(matched.tiles[tile.id].plot!.height)}` : 'none'}`}</span>
                    : <TileStatus id={tile.id} box={boxText} report={reports[tile.id]} />}
                </header>
                {matched?.tiles[tile.id] ? (
                  <div className="lp-tile-static" data-matched={tile.id}>
                    <SvgChart spec={matched.tiles[tile.id].spec} />
                  </div>
                ) : (
                <FlintChart
                  spec={specs[tile.id]}
                  width={box.width}
                  height={chartHeight}
                  fit="relayout"
                  renderer="svg"
                  chartId={`layout-plan-dashboard-${tile.id}`}
                  onRender={(surface) => onRender(tile.id, surface, boxText)}
                />
                )}
                <div className="lp-tile-edge lp-tile-edge-right" data-handle={`${tile.id}:right`} aria-label={`Resize ${tile.title} width`} {...handlers('right', tile.id)} />
                <div className="lp-tile-edge lp-tile-edge-bottom" data-handle={`${tile.id}:bottom`} aria-label={`Resize ${tile.title} height`} {...handlers('bottom', tile.id)} />
                <div className="lp-tile-corner" data-handle={`${tile.id}:corner`} aria-label={`Resize ${tile.title}`} {...handlers('corner', tile.id)} />
              </div>
            );
          })}
          <div className="lp-board-corner" role="separator" aria-label="Resize the dashboard" data-handle="board" {...handlers('board', 'board')} />
        </div>
      </div>
      {log.length > 0 && (
        <ol className="lp-negotiation" data-negotiation>
          {log.map((line, index) => <li key={index}>{line}</li>)}
        </ol>
      )}
      <p className="lp-note">The dot on each tile shows how comfortable its chart is; hover it for the reasons. Matching label sizes makes the board read as one system: Smallest fits every tile, Majority uses the median and marks a tile too crowded for it as the exception.</p>
    </section>
  );
}
