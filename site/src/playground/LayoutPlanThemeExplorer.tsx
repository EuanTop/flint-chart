import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ThemeSpec } from 'flint-chart';
import { resolveThemeSpec, THEME_PRESETS, tokenToPx } from 'flint-chart';
import { Facts, SvgChart, labelText, plotText, time } from './layout-plan-shared';
import { ChartPicker, THEME_CHARTS, planOf, themeLabel, withTheme, type Planned } from './LayoutPlanThemeDemos';

// ─── Colour in OKLab ───────────────────────────────────────────────────────

type Lab = [number, number, number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const isColor = (value: unknown): value is string => typeof value === 'string' && HEX.test(value.trim());

function hexToRgb(hex: string): [number, number, number] {
  let body = hex.trim().slice(1);
  if (body.length === 3) body = body.split('').map((char) => char + char).join('');
  return [0, 2, 4].map((offset) => parseInt(body.slice(offset, offset + 2), 16) / 255) as [number, number, number];
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToLab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function labToHex([L, a, b]: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, fromLinear(c))) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function mixColors(colors: string[], weights: number[]): string {
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const lab = colors.map(hexToLab).reduce<Lab>((sum, value, index) => [
    sum[0] + value[0] * weights[index] / total,
    sum[1] + value[1] * weights[index] / total,
    sum[2] + value[2] * weights[index] / total,
  ], [0, 0, 0]);
  return labToHex(lab);
}

function rotateHue(hex: string, degrees: number): string {
  const [L, a, b] = hexToLab(hex);
  const chroma = Math.hypot(a, b);
  const hue = Math.atan2(b, a) + (degrees * Math.PI) / 180;
  return labToHex([L, chroma * Math.cos(hue), chroma * Math.sin(hue)]);
}

// ─── Blending theme specs ──────────────────────────────────────────────────

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * One value from the houses' values at the same path. The nearest house decides whether the
 * value exists and its kind; numbers and colours mix over the houses that state one, and
 * anything else is the nearest house's.
 */
function blendValue(values: unknown[], weights: number[], nearest: number, key?: string): unknown {
  const own = values[nearest];
  if (own === undefined) return undefined;
  if (key === 'size' && tokenToPx(own as never) !== undefined) {
    const sizes = values.map((value) => (value === undefined ? undefined : tokenToPx(value as never)));
    const present = sizes.map((size, index) => (size !== undefined ? index : -1)).filter((index) => index >= 0);
    const total = present.reduce((sum, index) => sum + weights[index], 0) || 1;
    return Math.round(present.reduce((sum, index) => sum + sizes[index]! * weights[index] / total, 0) * 2) / 2;
  }
  if (typeof own === 'number') {
    const present = values.map((value, index) => (typeof value === 'number' ? index : -1)).filter((index) => index >= 0);
    const total = present.reduce((sum, index) => sum + weights[index], 0) || 1;
    const mixed = present.reduce((sum, index) => sum + (values[index] as number) * weights[index] / total, 0);
    return present.every((index) => Number.isInteger(values[index])) ? Math.round(mixed) : Number(mixed.toFixed(3));
  }
  if (isColor(own)) {
    const present = values.map((value, index) => (isColor(value) ? index : -1)).filter((index) => index >= 0);
    return mixColors(present.map((index) => values[index] as string), present.map((index) => weights[index]));
  }
  if (Array.isArray(own) && own.length > 0 && own.every(isColor)) {
    return own.map((_, slot) => {
      const present = values.map((value, index) => (Array.isArray(value) && isColor(value[slot]) ? index : -1)).filter((index) => index >= 0);
      return mixColors(present.map((index) => (values[index] as string[])[slot]), present.map((index) => weights[index]));
    });
  }
  if (isPlainObject(own)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(own)) {
      const value = blendValue(values.map((entry) => (isPlainObject(entry) ? entry[key] : undefined)), weights, nearest, key);
      if (value !== undefined) out[key] = value;
    }
    return out;
  }
  return structuredClone(own);
}

/** How far past an even split another house must lead before discrete choices switch to it. */
const STICKINESS = 0.08;

/** The house that decides discrete choices: the heaviest, unless the current one is still within the margin. */
function nearestHouse(weights: number[], current: number | undefined): number {
  const heaviest = weights.indexOf(Math.max(...weights));
  if (current === undefined || current === heaviest) return heaviest;
  return weights[heaviest] - weights[current] > STICKINESS ? heaviest : current;
}

function blendThemes(houses: string[], weights: number[], hue: number, nearest: number): { theme: ThemeSpec; nearest: string } {
  const specs = houses.map((id) => resolveThemeSpec(id) ?? {});
  const theme = blendValue(specs, weights, nearest) as Record<string, any>;
  theme.id = 'blend';
  theme.label = 'Blend';
  if (hue !== 0 && theme.ink?.series) {
    const series = theme.ink.series;
    if (isColor(series.single)) series.single = rotateHue(series.single, hue);
    for (const key of ['categorical', 'categoricalExtended']) {
      if (Array.isArray(series[key])) series[key] = series[key].map((color: unknown) => (isColor(color) ? rotateHue(color, hue) : color));
    }
    if (isColor(theme.ink.accent)) theme.ink.accent = rotateHue(theme.ink.accent, hue);
  }
  return { theme: theme as ThemeSpec, nearest: houses[nearest] };
}

// ─── The pad ───────────────────────────────────────────────────────────────

const THEME_IDS = Object.keys(THEME_PRESETS);
const CORNERS = ['Top left', 'Top right', 'Bottom left', 'Bottom right'];
const DEFAULT_HOUSES = ['nyt', 'economist', 'nature', 'cartoon'];
const PAD = 240;

/** Bilinear weights of the four corners at a point in the unit square: top left, top right, bottom left, bottom right. */
const cornerWeights = (x: number, y: number): number[] => [(1 - x) * (1 - y), x * (1 - y), (1 - x) * y, x * y];

const iconUrl = (id: string) => `data:image/svg+xml;utf8,${encodeURIComponent(THEME_PRESETS[id]?.icon ?? '')}`;

interface Decision {
  text: string;
  at: string;
}

const planFacts = (planned: Planned) => ({
  plot: plotText(planned.plot),
  step: planned.step === undefined ? '–' : `${planned.step.toFixed(1)} px`,
  x: labelText(planned.labels?.x),
  y: labelText(planned.labels?.y),
});

const MAP_STEPS = 16;
const REGION_COLORS = ['#dbe8f5', '#f6e3d3', '#dcefe2', '#efe0f1', '#f7efcc', '#d9eff1', '#f3d9de', '#e4e4e4'];

interface MapCell {
  i: number;
  j: number;
  signature: string;
  color: string;
}

/**
 * The plan at every cell of a grid over the pad, planned a few cells per frame so the page
 * stays responsive. Cells with the same plot, step and label sizes share a shade.
 */
function useDecisionMap(houses: string[], spec: Parameters<typeof withTheme>[0]) {
  const [state, setState] = useState<{ cells: MapCell[]; regions: string[]; progress: number; done: boolean }>({ cells: [], regions: [], progress: 0, done: false });
  useEffect(() => {
    let cancelled = false;
    const cells: MapCell[] = [];
    const regions: string[] = [];
    const total = MAP_STEPS * MAP_STEPS;
    let index = 0;
    setState({ cells: [], regions: [], progress: 0, done: false });
    const work = () => {
      if (cancelled) return;
      const until = performance.now() + 12;
      while (index < total && performance.now() < until) {
        const i = index % MAP_STEPS;
        const j = Math.floor(index / MAP_STEPS);
        const weights = cornerWeights((i + 0.5) / MAP_STEPS, (j + 0.5) / MAP_STEPS);
        const blend = blendThemes(houses, weights, 0, nearestHouse(weights, undefined));
        const facts = planFacts(planOf(withTheme(spec, blend.theme)));
        const signature = `plot ${facts.plot} · step ${facts.step} · x ${facts.x} · y ${facts.y}`;
        if (!regions.includes(signature)) regions.push(signature);
        cells.push({ i, j, signature, color: REGION_COLORS[regions.indexOf(signature) % REGION_COLORS.length] });
        index += 1;
      }
      setState({ cells: [...cells], regions: [...regions], progress: index / total, done: index >= total });
      if (index < total) window.setTimeout(work, 0);
    };
    const start = window.setTimeout(work, 300);
    return () => { cancelled = true; window.clearTimeout(start); };
  }, [houses, spec]);
  return state;
}

export function ThemeExplorerDemo() {
  const [chartId, setChartId] = useState(THEME_CHARTS[0].id);
  const [houses, setHouses] = useState(DEFAULT_HOUSES);
  const [puck, setPuck] = useState({ x: 0.5, y: 0.5 });
  const [hue, setHue] = useState(0);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const dragging = useRef(false);
  const previous = useRef<ReturnType<typeof planFacts> | null>(null);
  const chart = THEME_CHARTS.find(({ id }) => id === chartId)!;
  const weights = cornerWeights(puck.x, puck.y);

  const sticky = useRef<number | undefined>(undefined);
  const [hysteresis, setHysteresis] = useState(true);
  const nearest = hysteresis ? nearestHouse(weights, sticky.current) : nearestHouse(weights, undefined);
  sticky.current = nearest;

  const result = useMemo(() => {
    const blend = blendThemes(houses, weights, hue, nearest);
    const compiled = time(() => planOf(withTheme(chart.spec, blend.theme)));
    return { ...blend, planned: compiled.value, ms: compiled.ms };
  }, [houses, puck, hue, chart, nearest]);

  const map = useDecisionMap(houses, chart.spec);

  const facts = planFacts(result.planned);
  const leading = houses
    .map((id, index) => ({ id, weight: weights[index] }))
    .sort((a, b) => b.weight - a.weight)
    .filter(({ weight }) => weight > 0.005);

  useEffect(() => {
    const before = previous.current;
    previous.current = facts;
    if (!before) { setDecisions([]); return; }
    const changes = (['plot', 'step', 'x', 'y'] as const)
      .filter((key) => before[key] !== facts[key])
      .map((key) => `${key === 'x' || key === 'y' ? `${key} labels` : key} ${before[key]} → ${facts[key]}`);
    if (changes.length === 0) return;
    const at = leading.slice(0, 2).map(({ id, weight }) => `${themeLabel(id)} ${Math.round(weight * 100)}%`).join(', ');
    setDecisions((current) => [...changes.map((text) => ({ text, at })), ...current].slice(0, 8));
  }, [facts.plot, facts.step, facts.x, facts.y]);

  const reset = useRef(`${chartId}:${houses.join()}`);
  if (reset.current !== `${chartId}:${houses.join()}`) {
    reset.current = `${chartId}:${houses.join()}`;
    previous.current = null;
  }

  const moveTo = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setPuck({
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    });
  };
  const padHandlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragging.current = true;
      moveTo(event);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => { if (dragging.current) moveTo(event); },
    onPointerUp: () => { dragging.current = false; },
    onPointerCancel: () => { dragging.current = false; },
  };

  const setHouse = (corner: number, id: string) => setHouses((current) => current.map((house, index) => (index === corner ? id : house)));

  return (
    <section className="ov-demo lp-demo" data-demo="explorer">
      <header className="ov-demo-header">
        <div>
          <h2>Theme explorer</h2>
          <p>Each corner is a house. Drag between them: sizes and colours blend, while typeface and axis style come from the nearest house. Shading marks where the layout changes; the log records each change.</p>
        </div>
        <ChartPicker value={chartId} onChange={setChartId} />
      </header>
      <div className="lp-explorer">
        <div className="lp-explorer-controls">
          <div className="lp-pad-frame">
            {houses.map((id, corner) => (
              <label key={CORNERS[corner]} className={`lp-pad-corner lp-pad-corner-${corner}`}>
                <img src={iconUrl(id)} alt="" width={16} height={16} />
                <select value={id} aria-label={`${CORNERS[corner]} house`} onChange={(event) => setHouse(corner, event.target.value)}>
                  {THEME_IDS.map((theme) => <option key={theme} value={theme}>{themeLabel(theme)}</option>)}
                </select>
              </label>
            ))}
            <div className="lp-pad" style={{ width: PAD, height: PAD }} role="slider" aria-label="Theme blend"
              aria-valuetext={leading.map(({ id, weight }) => `${themeLabel(id)} ${Math.round(weight * 100)}%`).join(', ')}
              data-pad {...padHandlers}>
              {map.cells.map((cell) => (
                <div key={`${cell.i}:${cell.j}`} className="lp-pad-cell" title={cell.signature}
                  style={{ left: `${(cell.i / MAP_STEPS) * 100}%`, top: `${(cell.j / MAP_STEPS) * 100}%`, width: `${100 / MAP_STEPS}%`, height: `${100 / MAP_STEPS}%`, background: cell.color }} />
              ))}
              <div className="lp-pad-midline lp-pad-midline-x" />
              <div className="lp-pad-midline lp-pad-midline-y" />
              <div className="lp-pad-puck" style={{ left: `${puck.x * 100}%`, top: `${puck.y * 100}%` }} />
            </div>
          </div>
          <p className="lp-pad-legend" data-map={map.done ? map.regions.length : 'pending'}>
            {map.done
              ? `${map.regions.length} ${map.regions.length === 1 ? 'layout' : 'layouts'} on this pad, one shade each.`
              : `Mapping layouts… ${Math.round(map.progress * 100)}%`}
          </p>
          <label className="lp-check">
            <input type="checkbox" checked={hysteresis} onChange={(event) => setHysteresis(event.target.checked)} />
            <span>Sticky snapping near the midlines</span>
          </label>
          <label className="lp-hue">
            <span>Palette hue {hue > 0 ? `+${hue}` : hue}°</span>
            <input type="range" min={-180} max={180} step={5} value={hue} onChange={(event) => setHue(Number(event.target.value))} />
          </label>
          <Facts rows={[
            ['Mix', leading.map(({ id, weight }) => `${themeLabel(id)} ${Math.round(weight * 100)}%`).join(' · ')],
            ['Typeface and style', themeLabel(result.nearest)],
          ]} />
        </div>
        <figure className="lp-slice lp-explorer-chart" data-panel="explorer-chart">
          <SvgChart spec={result.planned.spec} />
        </figure>
        <aside className="lp-panel" data-panel="explorer">
          <h3>Plan</h3>
          <Facts rows={[
            ['Plot', facts.plot],
            ['Band step', facts.step],
            ['x labels', facts.x],
            ['y labels', facts.y],
            ['Compile', `${result.ms.toFixed(1)} ms`],
          ]} />
          <h3>Layout changes</h3>
          {decisions.length === 0
            ? <p className="lp-muted">None yet. Drag across a shade boundary.</p>
            : (
              <ul className="lp-decisions" data-decisions>
                {decisions.map((decision, index) => (
                  <li key={`${decision.text}-${index}`}>
                    <span>{decision.text}</span>
                    <small>at {decision.at}</small>
                  </li>
                ))}
              </ul>
            )}
        </aside>
      </div>
    </section>
  );
}
