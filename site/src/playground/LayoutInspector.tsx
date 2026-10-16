import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { appendCanvasFurniture, readCanvasFurniture, readCanvasPatterns, type ChartAssemblyInput } from 'flint-chart';
import { compile as compileVegaLite } from 'vega-lite';
import { parse as parseVega, View as VegaView } from 'vega';
import { openVegaLiteSession, vegaLiteHonour, type VegaLiteSession } from '../../../packages/flint-js/src/vegalite/assemble';
import { listThemePresets } from '../../../packages/flint-js/src/core/theme/presets';
import type { PlanStage } from '../../../packages/flint-js/src/core/types';
import { PART_META, measureSvg, px, type Box, type Measured, type PartId } from './layout-inspector/measure';
import { drawnLedger, plannedLedger, type Ledger, type Segment } from './layout-inspector/ledger';
import { buildTree, type TreeNode } from './layout-inspector/tree';
import { PRESETS } from './layout-inspector/presets';
import './overflow-viewport-lab.css';
import './layout-inspector.css';

const THEMES = listThemePresets();
const MIN_CANVAS = { width: 160, height: 120 };
const MAX_CANVAS = { width: 1400, height: 1000 };

/** The theme a spec names: a preset id, `custom` for a theme spelled out without one, `none` for no theme. */
const themeOf = (input: ChartAssemblyInput): string => {
  const theme = input.theme_spec;
  if (!theme) return 'none';
  if (typeof theme === 'string') return theme;
  return theme.extends ?? 'custom';
};

const canvasOf = (input: ChartAssemblyInput): { width: number; height: number } =>
  input.chart_spec.canvasSize ?? input.chart_spec.baseSize ?? { width: 300, height: 300 };

/** The input as the editor shows it: everything but the rows, which stay with the preset. */
function editorText(input: ChartAssemblyInput): string {
  const { data, ...rest } = input;
  const count = Array.isArray((data as any)?.values) ? (data as any).values.length : 0;
  return JSON.stringify({ ...rest, data: { values: `(${count} rows from the preset; give an array to replace them)` } }, null, 2);
}

interface Reading {
  session: VegaLiteSession;
  measured: Measured;
  ledgers: Ledger[];
  departures: ReturnType<typeof vegaLiteHonour>;
  canvas: { width: number; height: number };
}

// ─── Page ──────────────────────────────────────────────────────────────────

const MARGIN = 28;

export function LayoutInspector() {
  const [params, setParams] = useSearchParams();
  const initialPreset = PRESETS.find(({ id }) => id === params.get('preset')) ?? PRESETS[0];
  const [presetId, setPresetId] = useState(initialPreset.id);
  const [theme, setTheme] = useState(params.get('theme') ?? themeOf(initialPreset.input));
  const [canvasW, setCanvasW] = useState(Number(params.get('w')) || canvasOf(initialPreset.input).width);
  const [canvasH, setCanvasH] = useState(Number(params.get('h')) || canvasOf(initialPreset.input).height);
  const [edited, setEdited] = useState<ChartAssemblyInput | null>(null);
  const [draft, setDraft] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [focus, setFocus] = useState<PartId | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const preset = PRESETS.find(({ id }) => id === presetId) ?? PRESETS[0];

  const input = useMemo<ChartAssemblyInput>(() => {
    const base = edited ?? preset.input;
    const { theme_spec: own, ...rest } = base;
    const themed = theme === themeOf(base) ? own : theme === 'none' ? undefined : { extends: theme };
    return {
      ...rest,
      ...(themed === undefined ? {} : { theme_spec: themed }),
      chart_spec: { ...base.chart_spec, baseSize: { width: canvasW, height: canvasH }, canvasSize: { width: canvasW, height: canvasH } },
    };
  }, [edited, preset, theme, canvasW, canvasH]);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('preset', presetId);
    next.set('theme', theme);
    next.set('w', String(canvasW));
    next.set('h', String(canvasH));
    setParams(next, { replace: true });
  }, [presetId, theme, canvasW, canvasH, setParams]);

  const choosePreset = useCallback((id: string) => {
    const next = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
    setPresetId(next.id);
    setEdited(null);
    setTheme(themeOf(next.input));
    setCanvasW(canvasOf(next.input).width);
    setCanvasH(canvasOf(next.input).height);
    setDraft(editorText(next.input));
    setEditorError('');
  }, []);

  const applyDraft = () => {
    try {
      const parsed = JSON.parse(draft);
      const rows = Array.isArray(parsed?.data?.values) ? parsed.data.values : (preset.input.data as any).values;
      const next: ChartAssemblyInput = { ...parsed, data: { values: rows } };
      setEdited(next);
      setTheme(themeOf(next));
      const canvas = canvasOf(next);
      setCanvasW(canvas.width);
      setCanvasH(canvas.height);
      setEditorError('');
    } catch (err) {
      setEditorError(String((err as Error).message ?? err));
    }
  };

  const inspect = useCallback(async (target: HTMLElement, chart: ChartAssemblyInput): Promise<Reading> => {
    const session = openVegaLiteSession(chart);
    const vega = compileVegaLite(session.spec).spec as any;
    target.replaceChildren();
    const view = new VegaView(parseVega(vega), { renderer: 'svg' } as any).initialize(target);
    await view.runAsync();
    const furniture = readCanvasFurniture(session.spec);
    const svg = target.querySelector('svg');
    if (svg) appendCanvasFurniture(svg, furniture, readCanvasPatterns(session.spec));
    const canvas = canvasOf(chart);
    const measured = measureSvg(target, view, session.plan, canvas, furniture);
    if (!measured) throw new Error('Vega drew no SVG');
    const ledgers: Ledger[] = (['Height', 'Width'] as const).map((axis) => ({
      axis,
      canvas: axis === 'Height' ? canvas.height : canvas.width,
      rows: [plannedLedger(session, canvas, axis), drawnLedger(measured, axis)],
    }));
    let departures: Reading['departures'] = [];
    try { departures = vegaLiteHonour(chart); } catch { departures = []; }
    return { session, measured, ledgers, departures, canvas };
  }, []);

  // One render at a time; a change that lands while one is running waits its turn, and only the newest waits.
  const pending = useRef<ChartAssemblyInput | null>(null);
  const running = useRef(false);
  useEffect(() => {
    pending.current = input;
    if (running.current) return;
    const target = host.current;
    if (!target) return;
    running.current = true;
    setBusy(true);
    (async () => {
      while (pending.current) {
        const job = pending.current;
        pending.current = null;
        try {
          const next = await inspect(target, job);
          setReading(next);
          setError('');
        } catch (err) {
          setReading(null);
          setError(String((err as Error).message ?? err));
        }
      }
      running.current = false;
      setBusy(false);
    })();
  }, [input, inspect]);

  const clamp = (value: number, axis: 'width' | 'height') => Math.round(Math.min(MAX_CANVAS[axis], Math.max(MIN_CANVAS[axis], value)));
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, width: canvasW, height: canvasH };
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setCanvasW(clamp(drag.current.width + event.clientX - drag.current.x, 'width'));
    setCanvasH(clamp(drag.current.height + event.clientY - drag.current.y, 'height'));
  };
  const endDrag = () => { drag.current = null; };

  const stage = reading
    ? { width: Math.max(reading.measured.drawn.width, canvasW) + MARGIN * 2 + 24, height: Math.max(reading.measured.drawn.height, canvasH) + MARGIN * 2 + 24 }
    : { width: canvasW + MARGIN * 2 + 24, height: canvasH + MARGIN * 2 + 24 };

  return (
    <div className="dev-page ov-page li-page">
      <header className="dev-page-heading ov-heading li-heading">
        <div>
          <h1>Layout inspector</h1>
          <p>Every box is measured from the SVG Vega drew and set against what the planner decided. Drag the canvas corner to re-plan at another size.</p>
        </div>
      </header>

      <section className="ov-demo li-demo li-bench">
        <div className="li-toolbar">
          <label>Chart
            <select value={presetId} onChange={(event) => choosePreset(event.target.value)}>
              {PRESETS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label>Theme
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              {themeOf(edited ?? preset.input) === 'custom' && <option value="custom">Custom (spec)</option>}
              {THEMES.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              <option value="none">None</option>
            </select>
          </label>
          <label className="li-slider">Width
            <input type="range" min={MIN_CANVAS.width} max={MAX_CANVAS.width} step={10} value={canvasW} onChange={(event) => setCanvasW(clamp(Number(event.target.value), 'width'))} aria-label="Canvas width" />
            <output>{canvasW}</output>
          </label>
          <label className="li-slider">Height
            <input type="range" min={MIN_CANVAS.height} max={MAX_CANVAS.height} step={10} value={canvasH} onChange={(event) => setCanvasH(clamp(Number(event.target.value), 'height'))} aria-label="Canvas height" />
            <output>{canvasH}</output>
          </label>
          <div className="li-toolbar-spacer" />
          <button type="button" className={`li-button${editorOpen ? ' active' : ''}`} onClick={() => { if (!editorOpen && !draft) setDraft(editorText(preset.input)); setEditorOpen(!editorOpen); }}>
            {editorOpen ? 'Hide spec' : 'Edit spec'}
          </button>
        </div>
        {editorOpen && (
          <div className="li-editor">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} />
            <div className="li-editor-foot">
              <button type="button" className="li-button li-button-primary" onClick={applyDraft}>Apply</button>
              <button type="button" className="li-button" onClick={() => { setDraft(editorText(preset.input)); setEdited(null); setEditorError(''); }}>Reset</button>
              {editorError ? <span className="lp-error">{editorError}</span> : <span className="lp-muted">Rows stay with the preset unless <code>data.values</code> is an array; the canvas above sets <code>baseSize</code> and <code>canvasSize</code>.</span>}
            </div>
          </div>
        )}
        {error && <p className="lp-error">{error}</p>}

        <div className="li-workbench">
          <div className="li-stage-scroll">
            <div className={`li-stage${busy ? ' busy' : ''}`} style={{ width: stage.width, height: stage.height }}>
              <div className="li-host" ref={host} style={{ left: MARGIN, top: MARGIN }} />
              {reading && <Overlay reading={reading} focus={focus} stage={stage} canvas={{ width: canvasW, height: canvasH }} />}
              <div
                className="li-canvas-handle"
                style={{ left: MARGIN + canvasW, top: MARGIN + canvasH }}
                role="separator"
                aria-label="Resize the canvas"
                title="Drag to resize the canvas"
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            </div>
          </div>
          <Tree reading={reading} focus={focus} onFocus={setFocus} />
        </div>
      </section>

      {reading && (
        <>
          <section className="ov-demo li-demo">
            <header className="ov-demo-header">
              <div>
                <h2>Budget</h2>
                <p>What the planner set aside along each axis against what Vega drew, to one scale. Hatched is the measured reserve; dashed is room no decision claims.</p>
              </div>
            </header>
            <Ledgers ledgers={reading.ledgers} max={Math.max(...reading.ledgers.flatMap((ledger) => [ledger.canvas, ...ledger.rows.map((row) => row.total)]))} />
          </section>

          <Departures reading={reading} />
        </>
      )}
    </div>
  );
}

// ─── Drawing ───────────────────────────────────────────────────────────────

function Overlay({ reading, focus, stage, canvas }: { reading: Reading; focus: PartId | null; stage: { width: number; height: number }; canvas: { width: number; height: number } }) {
  const { measured } = reading;
  const at = (box: Box) => ({ x: box.x + MARGIN, y: box.y + MARGIN, width: box.width, height: box.height });
  return (
    <svg className={`li-overlay${focus ? ' focus' : ''}`} width={stage.width} height={stage.height} viewBox={`0 0 ${stage.width} ${stage.height}`} aria-hidden="true">
      {measured.parts.map((part) => {
        const meta = PART_META[part.id];
        const on = focus === part.id;
        return (
          <g key={part.id} className={`li-part${on ? ' on' : ''}`} data-part={part.id}>
            {part.boxes.map((box, index) => {
              const b = part.id === 'canvas' ? { x: MARGIN, y: MARGIN, ...canvas } : at(box);
              if (meta.outline === 'dash') {
                return (
                  <g key={index}>
                    <rect {...b} fill="none" stroke={meta.color} strokeWidth={2} strokeDasharray="7 5" />
                    <text x={b.x} y={b.y - 8} className="li-mono" fill="var(--li-fg)">canvasSize {px(canvas.width)} × {px(canvas.height)}</text>
                  </g>
                );
              }
              if (meta.outline === 'solid') {
                return (
                  <g key={index}>
                    <rect x={b.x + 0.5} y={b.y + 0.5} width={Math.max(0, b.width - 1)} height={Math.max(0, b.height - 1)} fill="none" stroke={meta.color} strokeWidth={1} />
                    <text x={b.x + b.width} y={b.y + b.height + 14} textAnchor="end" className="li-mono" fill="var(--li-fg)">drawn SVG {px(measured.drawn.width)} × {px(measured.drawn.height)}</text>
                  </g>
                );
              }
              return (
                <rect key={index} {...b} fill={meta.color} fillOpacity={part.id === 'plot' ? 0.08 : part.id === 'values' ? 0.04 : part.id === 'pad' ? 0.16 : 0.14} stroke={part.id === 'pad' ? 'none' : meta.color} strokeWidth={part.id === 'plot' ? 1.5 : 1} />
              );
            })}
            {on && part.id !== 'canvas' && part.id !== 'drawn' && (() => {
              const b = at(part.box);
              const above = b.y >= MARGIN + 14;
              return (
                <g>
                  <line x1={b.x} x2={b.x + b.width} y1={b.y + b.height + 6} y2={b.y + b.height + 6} stroke={meta.color} strokeWidth={1} />
                  <line x1={b.x - 6} x2={b.x - 6} y1={b.y} y2={b.y + b.height} stroke={meta.color} strokeWidth={1} />
                  <text x={Math.max(4, b.x)} y={above ? b.y - 4 : b.y + b.height + 20} className="li-mono li-label" fill={meta.color}>
                    {meta.label} {px(part.box.width)} × {px(part.box.height)} at {px(part.box.x)}, {px(part.box.y)}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

function Tree({ reading, focus, onFocus }: { reading: Reading | null; focus: PartId | null; onFocus: (id: PartId | null) => void }) {
  const nodes = useMemo(() => (reading ? buildTree(reading.session, reading.measured, reading.canvas) : []), [reading]);
  return (
    <aside className="li-tree-pane" onMouseLeave={() => onFocus(null)}>
      <h3>Parts</h3>
      {!reading ? <p className="lp-muted">Compiling…</p> : (
        <ul className="li-tree">
          {nodes.map((node) => (
            <TreeItem key={node.id} node={node} depth={0} focus={focus} onFocus={onFocus} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function TreeItem({ node, depth, focus, onFocus }: { node: TreeNode; depth: number; focus: PartId | null; onFocus: (id: PartId | null) => void }) {
  const colour = node.part ? PART_META[node.part].color : 'var(--li-allow)';
  const outline = node.part ? PART_META[node.part].outline : undefined;
  const lit = node.part !== undefined && focus === node.part;
  const chain = node.reasons.flatMap((r) => r.chain);
  const hasChildren = Boolean(node.children?.length);
  const head = (
    <>
      <div className="li-node-head" onMouseEnter={() => node.part && onFocus(node.part)}>
        <span className="li-node-caret" aria-hidden="true" />
        <i className={`sw${outline ? ` ${outline}` : ''}`} />
        <span className="li-node-text">
          <b>{node.label}</b>
          {node.decision && <span className="li-node-decision">{node.decision}</span>}
        </span>
        {node.measure && <span className="li-node-measure">{node.measure}</span>}
      </div>
    </>
  );
  const detail = (
    <>
      {chain.length > 0 && (
        <details className="li-node-why">
          <summary>Why <small>{chain.length} rule{chain.length === 1 ? '' : 's'}</small></summary>
          <Chain chain={chain} />
        </details>
      )}
    </>
  );
  return (
    <li className={`li-node depth-${depth}${lit ? ' on' : ''}${hasChildren ? ' group' : ''}`} data-node={node.id} style={{ ['--sw' as string]: colour }}>
      {hasChildren ? (
        <details open={node.open}>
          <summary className="li-node-summary">{head}</summary>
          <div className="li-node-detail">{detail}</div>
          <ul className="li-tree">
            {node.children!.map((child) => (
              <TreeItem key={child.id} node={child} depth={depth + 1} focus={focus} onFocus={onFocus} />
            ))}
          </ul>
        </details>
      ) : <div className="li-node-summary leaf">{head}<div className="li-node-detail">{detail}</div></div>}
    </li>
  );
}

const segColour = (seg: Segment): string => (seg.part === 'allow' ? 'var(--li-allow)' : PART_META[seg.part].color);

function Ledgers({ ledgers, max }: { ledgers: Ledger[]; max: number }) {
  return (
    <div className="li-ledger-wrap">
      <div className="li-ledger">
        {ledgers.map((ledger) => {
          const drawn = ledger.rows[1].total;
          const over = drawn - ledger.canvas;
          return (
            <section key={ledger.axis} className="li-ledger-block">
              <header className="li-ledger-head">
                <b>{ledger.axis}</b>
                <span>canvas <code>{px(ledger.canvas)}</code></span>
                <span>drawn <code>{px(drawn)}</code></span>
                <span className={`li-over ${over > 0.5 ? 'over' : 'fits'}`}>{over > 0.5 ? `${px(over)} px past the canvas` : over < -0.5 ? `${px(-over)} px short of the canvas` : 'fills the canvas'}</span>
              </header>
              {ledger.rows.map((row, index) => (
                <div key={row.label} className="li-lrow">
                  <div className="lab">{index === 0 ? 'Planned' : 'Drawn'}</div>
                  <div className="track">
                    {(() => {
                      let at = 0;
                      return row.segments.map((seg, i) => {
                        const left = (at / max) * 100;
                        const width = (seg.px / max) * 100;
                        at += seg.px;
                        return (
                          <div key={i} className={`seg${seg.kind ? ` ${seg.kind}` : ''}`} style={{ left: `${left}%`, width: `${width}%`, ['--c' as string]: segColour(seg) }} title={`${seg.name} (${px(seg.px)} px)`}>
                            {seg.px / max > 0.06 ? seg.name : ''}
                          </div>
                        );
                      });
                    })()}
                    <div className="mark" style={{ left: `${(ledger.canvas / max) * 100}%` }} />
                  </div>
                  <div className="total">{px(row.total)}</div>
                  <ol className="items">
                    {row.segments.map((seg, i) => (
                      <li key={i} className={seg.kind ?? ''} style={{ ['--c' as string]: segColour(seg) }}>
                        <i />{seg.kind === 'void' && !/[a-z]/i.test(seg.name) ? 'gap' : seg.name.replace(/\s\d+$/, '')}<code>{px(seg.px)}</code>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

const readText = (read: PlanStage['read']): string =>
  Object.entries(read ?? {}).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${key} ${typeof value === 'boolean' ? (value ? 'yes' : 'no') : value}`).join(' · ');

function Chain({ chain }: { chain: PlanStage[] }) {
  if (!chain.length) return <span className="lp-muted">no trace</span>;
  return (
    <ol className="li-chain">
      {chain.map((stage, index) => (
        <li key={index}>
          <span className="li-chain-rule">{stage.rule}</span>
          <span className="li-chain-value">{String(stage.value)}</span>
          {stage.read && Object.keys(stage.read).length > 0 && <span className="li-chain-read">{readText(stage.read)}</span>}
          {stage.note && <span className="li-chain-note">{stage.note}</span>}
        </li>
      ))}
    </ol>
  );
}

function Departures({ reading }: { reading: Reading }) {
  const { session, departures } = reading;
  const items = [
    ...session.plan.report.map((r) => ({ kind: `theme · ${r.stage}`, path: r.path, code: r.code, message: r.message })),
    ...session.plan.warnings.map((w: any) => ({ kind: 'warning', path: w.code ?? '', code: w.code ?? '', message: w.message ?? JSON.stringify(w) })),
    ...departures.map((d: any) => ({ kind: 'honour', path: d.path ?? d.decision ?? '', code: d.code ?? '', message: d.message ?? JSON.stringify(d) })),
  ];
  if (!items.length) return null;
  return (
    <section className="ov-demo li-demo">
      <header className="ov-demo-header">
        <div>
          <h2>Where the plan gave way</h2>
        </div>
      </header>
      <ul className="li-departures">
        {items.map((item, index) => (
          <li key={index}><span className="li-kind">{item.kind}</span><code>{item.path}</code>{item.code && item.code !== item.path ? <code>{item.code}</code> : null}<span>{item.message}</span></li>
        ))}
      </ul>
    </section>
  );
}
