import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ChartAssemblyInput } from 'flint-chart';
import { openVegaLiteSession } from '../../../packages/flint-js/src/vegalite/assemble';
import { SvgChart, TEAMS, specStep, specFacts } from './layout-plan-shared';

type DecisionId = 'canvas' | 'step' | 'angle' | 'size' | 'legend' | 'values';

type Box = { width: number; height: number };

interface Reading {
  canvas: Box;
  plot: { width: number; height: number } | undefined;
  step: number | undefined;
  angle: number;
  size: number;
  /** The size the theme asked for, where crowding kept a smaller one. */
  sizeAsked: number | undefined;
  straightRefused: boolean;
  legend: string;
  values: boolean;
  rowsCut: number;
}

const MIN_BOX: Box = { width: 240, height: 200 };
const MAX_BOX: Box = { width: 900, height: 520 };

type Pins = Partial<{
  canvas: Box;
  step: number;
  angle: number;
  size: number;
  legend: string;
  values: boolean;
}>;

const SORTED_TEAMS = [...TEAMS].sort((a, b) => b.Goals - a.Goals);

const DECISIONS: { id: DecisionId; label: string; kind: 'hard' | 'soft' }[] = [
  { id: 'canvas', label: 'Canvas size', kind: 'hard' },
  { id: 'step', label: 'Band step', kind: 'hard' },
  { id: 'angle', label: 'Label angle', kind: 'hard' },
  { id: 'size', label: 'Label size', kind: 'hard' },
  { id: 'legend', label: 'Legend position', kind: 'soft' },
  { id: 'values', label: 'Value labels', kind: 'soft' },
];

function build(teams: number, box: Box, pins: Pins): ChartAssemblyInput {
  const theme: Record<string, any> = { extends: 'datawrapper' };
  if (pins.legend !== undefined && pins.legend !== 'none') theme.legend = { placement: [pins.legend] };
  if (pins.legend === 'none') theme.legend = { show: 'never' };
  if (pins.values !== undefined) theme.dataLabels = { show: pins.values ? 'always' : 'never' };
  const size = pins.canvas ?? box;
  return {
    data: { values: SORTED_TEAMS.slice(0, teams) },
    semantic_types: { Team: 'Country', Confederation: 'Category', Goals: 'Count' },
    theme_spec: theme,
    options: {
      ...(pins.step !== undefined ? { defaultBandSize: pins.step, minStep: pins.step, bandStepFit: 0 } : {}),
    },
    chart_spec: {
      chartType: 'Bar Chart',
      title: 'Goals per team',
      encodings: { x: 'Team', y: 'Goals', color: 'Confederation' },
      baseSize: size,
      canvasSize: size,
    },
  };
}

function read(input: ChartAssemblyInput, pins: Pins = {}): { spec: any; reading: Reading } {
  const canvas = input.chart_spec.canvasSize!;
  const label = { ...(pins.size !== undefined ? { fontSize: pins.size } : {}) };
  const session = openVegaLiteSession(input, pins.size !== undefined || pins.angle !== undefined ? {
    pins: { axisLabels: { x: { ...label, ...(pins.angle !== undefined ? { angle: -pins.angle } : {}) }, y: label } },
  } : {});
  const x = session.axisLabels.x;
  const facts = specFacts(session.spec);
  const warnings: { message?: string }[] = session.spec?._warnings ?? [];
  const cut = warnings.map((warning) => Number(/^(\d+) of/.exec(warning.message ?? '')?.[1] ?? 0)).reduce((sum, value) => sum + value, 0);
  return {
    spec: session.spec,
    reading: {
      canvas,
      plot: session.plot,
      step: specStep(session.spec, 'width'),
      angle: Math.abs(x.angle ?? 0),
      size: x.fontSize,
      sizeAsked: x.crowdedFrom,
      // The plan reports an overflow fit only when the names are too wide to stand upright in their band.
      straightRefused: Boolean(x.overflowFit),
      legend: facts.legend,
      values: facts.values,
      rowsCut: cut,
    },
  };
}

const show = (id: DecisionId, reading: Reading): string => {
  switch (id) {
    case 'canvas': return `${reading.canvas.width} × ${reading.canvas.height}, plot ${reading.plot ? `${Math.round(reading.plot.width)} × ${Math.round(reading.plot.height)}` : 'none'}`;
    case 'step': return reading.step === undefined ? '–' : `${reading.step.toFixed(1)} px`;
    case 'angle': return `${reading.angle}°`;
    case 'size': return `${reading.size}px`;
    case 'legend': return reading.legend;
    case 'values': return reading.values ? 'shown' : 'hidden';
  }
};

const pinOf = (id: DecisionId, reading: Reading): Pins[keyof Pins] => {
  switch (id) {
    case 'canvas': return reading.canvas;
    case 'step': return reading.step;
    case 'angle': return reading.angle;
    case 'size': return reading.size;
    case 'legend': return reading.legend;
    case 'values': return reading.values;
  }
};

/** Whether the plan kept a pin, and what it cost or why it refused. */
function verdict(id: DecisionId, pins: Pins, reading: Reading, free: Reading): { tone: 'kept' | 'cost' | 'refused'; text: string } | undefined {
  const pinned = pins[id];
  if (pinned === undefined) return undefined;
  switch (id) {
    case 'canvas':
      return reading.rowsCut > 0 ? { tone: 'cost', text: `held, ${reading.rowsCut} teams cut to fit it` } : { tone: 'kept', text: 'held; the chart ignores the box' };
    case 'step':
      if (reading.rowsCut > 0) return { tone: 'cost', text: `held, ${reading.rowsCut} teams cut` };
      return reading.step !== undefined && Math.abs(reading.step - (pinned as number)) < 0.5
        ? { tone: 'kept', text: 'held; the plot grows or shrinks with the teams instead' }
        : { tone: 'refused', text: `planned ${show('step', reading)}` };
    case 'angle':
      return free.angle === pinned
        ? { tone: 'kept', text: 'held; the plan agrees' }
        : { tone: 'cost', text: `held against the plan, which wants ${free.angle}°${free.straightRefused ? ': labels may collide' : ''}` };
    case 'size':
      return free.size === pinned
        ? { tone: 'kept', text: 'held; the plan agrees' }
        : { tone: 'cost', text: `held against the plan, which fits ${free.size}px${(pinned as number) > free.size ? ': labels may overlap or truncate' : ''}` };
    case 'legend':
      return reading.legend === pinned ? { tone: 'kept', text: 'honoured' } : { tone: 'refused', text: `placed ${reading.legend}` };
    case 'values':
      return reading.values === pinned ? { tone: 'kept', text: 'honoured' } : { tone: 'refused', text: reading.values ? 'printed anyway' : 'dropped: they do not fit' };
  }
}

export function PinsDemo() {
  const [teams, setTeams] = useState(16);
  const [box, setBox] = useState<Box>({ width: 520, height: 300 });
  const [pins, setPins] = useState<Pins>({});
  const free = useMemo(() => read(build(teams, box, {})), [teams, box]);
  const pinned = useMemo(() => read(build(teams, box, pins), pins), [teams, box, pins]);
  const drag = useRef<{ x: number; y: number } & Box | null>(null);

  const clamp = (value: number, axis: keyof Box) => Math.round(Math.min(MAX_BOX[axis], Math.max(MIN_BOX[axis], value)));
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ...box };
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setBox({
      width: clamp(drag.current.width + event.clientX - drag.current.x, 'width'),
      height: clamp(drag.current.height + event.clientY - drag.current.y, 'height'),
    });
  };
  const endDrag = () => { drag.current = null; };

  const toggle = (id: DecisionId) => setPins((current) => {
    const next = { ...current };
    if (next[id] !== undefined) delete next[id];
    else (next as Record<DecisionId, unknown>)[id] = pinOf(id, pinned.reading);
    return next;
  });

  return (
    <section className="ov-demo lp-demo" data-demo="pins">
      <header className="ov-demo-header">
        <div>
          <h2>Pin a decision, let the rest stay live</h2>
          <p>Drag the box corner or change the team count and every decision follows. Pin one to hold it while the rest keep re-planning. Hard pins always hold and show what that costs; soft pins are preferences the plan can still overrule.</p>
        </div>
      </header>
      <div className="lp-pins-drivers">
        <label className="lp-slider">
          <span>Width {box.width}</span>
          <input type="range" min={MIN_BOX.width} max={MAX_BOX.width} value={box.width} onChange={(event) => setBox((current) => ({ ...current, width: Number(event.target.value) }))} />
        </label>
        <label className="lp-slider">
          <span>Height {box.height}</span>
          <input type="range" min={MIN_BOX.height} max={MAX_BOX.height} value={box.height} onChange={(event) => setBox((current) => ({ ...current, height: Number(event.target.value) }))} />
        </label>
        <label className="lp-slider">
          <span>{teams} teams</span>
          <input type="range" min={4} max={48} value={teams} onChange={(event) => setTeams(Number(event.target.value))} />
        </label>
      </div>
      <div className="lp-split lp-pins-split">
        <div className="lp-chart-cell">
          <div className="lp-resize-box lp-pins-box" style={{ width: box.width, minHeight: box.height }} data-box={`${box.width}x${box.height}`}>
            <SvgChart spec={pinned.spec} />
            <div
              className="lp-resize-handle"
              role="separator"
              aria-label="Resize the chart box"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          </div>
        </div>
        <aside className="lp-panel" data-panel="pins">
          <table className="lp-pins-table">
            <thead>
              <tr><th>Decision</th><th>Now</th><th>Free plan</th><th /></tr>
            </thead>
            <tbody>
              {DECISIONS.map((decision) => {
                const status = verdict(decision.id, pins, pinned.reading, free.reading);
                const locked = pins[decision.id] !== undefined;
                return (
                  <tr key={decision.id} data-decision={decision.id} data-status={status?.tone ?? 'live'}>
                    <td>
                      {decision.label}
                      <small>{decision.kind === 'hard' ? 'hard pin' : 'soft pin'}</small>
                      {status && <small className={`lp-pin-${status.tone}`}>{status.text}</small>}
                    </td>
                    <td>{show(decision.id, pinned.reading)}</td>
                    <td className="lp-muted-cell">{show(decision.id, free.reading)}</td>
                    <td>
                      <button type="button" className={`lp-lock${locked ? ' active' : ''}`} aria-pressed={locked} aria-label={`${locked ? 'Unpin' : 'Pin'} ${decision.label}`} onClick={() => toggle(decision.id)}>
                        {locked ? 'Pinned' : 'Live'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="lp-note">Free plan: the same chart with nothing pinned.</p>
        </aside>
      </div>
    </section>
  );
}
