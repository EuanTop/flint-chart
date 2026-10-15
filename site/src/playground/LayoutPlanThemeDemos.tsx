import { useMemo, useState } from 'react';
import type { ChartAssemblyInput, ThemeSpec } from 'flint-chart';
import { resolveThemeSpec, THEME_PRESETS } from 'flint-chart';

import { openVegaLiteSession } from '../../../packages/flint-js/src/vegalite/assemble';
import foodPrices from '../data/cpi-food-prices.json';
import {
  labelReasons,
  SvgChart,
  TEAMS,
  labelText,
  plotText,
  specStep,
  type AxisLabels,
  type Plot,
} from './layout-plan-shared';

const THEME_IDS = Object.keys(THEME_PRESETS);
const NO_THEME = 'none';
export const themeLabel = (id: string): string => (id === NO_THEME ? 'No theme' : THEME_PRESETS[id]?.label ?? id);

// ─── Charts the theme demos share ──────────────────────────────────────────

const TOP_TEAMS = [...TEAMS].sort((a, b) => b.Goals - a.Goals).slice(0, 16);
const EGG_ROWS = foodPrices.values
  .filter(({ item }) => ['Eggs', 'Bananas', 'Whole milk'].includes(item))
  .map(({ month, item, price }) => ({ Month: month.slice(0, 7), Food: item, Price: price }));

export const THEME_CHARTS: { id: string; label: string; spec: ChartAssemblyInput }[] = [
  {
    id: 'bars',
    label: 'Bars · 16 teams',
    spec: {
      data: { values: TOP_TEAMS },
      semantic_types: { Team: 'Country', Confederation: 'Category', Goals: 'Count' },
      chart_spec: {
        chartType: 'Bar Chart',
        title: 'England and France led the scoring',
        subtitle: 'Goals per team, World Cup 2026, top sixteen',
        encodings: { x: 'Team', y: 'Goals', color: 'Confederation' },
        baseSize: { width: 360, height: 220 },
      },
    },
  },
  {
    id: 'crowded',
    label: 'Bars · all 48 teams',
    spec: {
      data: { values: [...TEAMS].sort((a, b) => b.Goals - a.Goals) },
      semantic_types: { Team: 'Country', Confederation: 'Category', Goals: 'Count' },
      chart_spec: {
        chartType: 'Bar Chart',
        title: 'Every team at the 2026 World Cup',
        subtitle: 'Goals per team',
        encodings: { x: 'Team', y: 'Goals', color: 'Confederation' },
        baseSize: { width: 360, height: 220 },
      },
    },
  },
  {
    id: 'line',
    label: 'Line · three foods',
    spec: {
      data: { values: EGG_ROWS },
      semantic_types: { Month: 'YearMonth', Food: 'Category', Price: { semanticType: 'Price', unit: 'USD' } },
      chart_spec: {
        chartType: 'Line Chart',
        title: 'Eggs spiked twice in a decade',
        subtitle: 'U.S. average price per unit',
        encodings: { x: 'Month', y: 'Price', color: 'Food' },
        baseSize: { width: 360, height: 220 },
      },
    },
  },
];

export const withTheme = (spec: ChartAssemblyInput, theme: string | ThemeSpec): ChartAssemblyInput => {
  const { theme_spec: _drop, ...rest } = structuredClone(spec);
  return theme === NO_THEME ? rest : { ...rest, theme_spec: structuredClone(theme) };
};

export interface Planned {
  spec: any;
  plot: Plot;
  labels: AxisLabels;
  step: number | undefined;
  error?: string;
}

export function planOf(input: ChartAssemblyInput): Planned {
  try {
    const session = openVegaLiteSession(input);
    return { spec: session.spec, plot: session.plot, labels: session.axisLabels, step: specStep(session.spec, 'width') };
  } catch (error) {
    return { spec: undefined, plot: undefined, labels: undefined as unknown as AxisLabels, step: undefined, error: String(error) };
  }
}

export function ChartPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="ov-backends" role="group" aria-label="Chart">
      {THEME_CHARTS.map(({ id, label }) => (
        <button type="button" key={id} className={id === value ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>
      ))}
    </div>
  );
}

function PlannedCaption({ planned }: { planned: Planned }) {
  if (planned.error) return <span className="lp-error">{planned.error}</span>;
  return (
    <span>
      plot {plotText(planned.plot)}
      {planned.step !== undefined ? ` · step ${planned.step.toFixed(1)}` : ''}
      {' · x '}{labelText(planned.labels?.x)}
      {planned.labels?.x && labelReasons(planned.labels.x).length > 0 ? ` · theme asked ${planned.labels.x.crowdedFrom ?? '–'}px` : ''}
    </span>
  );
}

// ─── 9. Theme fuser ────────────────────────────────────────────────────────

const PARTS: { key: string; label: string; fields: (keyof ThemeSpec)[] }[] = [
  { key: 'ink', label: 'Colour', fields: ['ink'] },
  { key: 'type', label: 'Type', fields: ['type'] },
  { key: 'room', label: 'Room & band step', fields: ['layout', 'compileDefaults', 'facets'] },
  { key: 'axes', label: 'Axes & furniture', fields: ['structure', 'furniture', 'annotation'] },
  { key: 'labels', label: 'Labels', fields: ['labels', 'dataLabels'] },
  { key: 'legend', label: 'Legend', fields: ['legend'] },
  { key: 'marks', label: 'Marks', fields: ['marks', 'geometry'] },
];

function fuse(base: string, donor: string, taken: ReadonlySet<string>): ThemeSpec {
  const from = resolveThemeSpec(base) ?? {};
  const give = resolveThemeSpec(donor) ?? {};
  const fused: Record<string, unknown> = { ...structuredClone(from), id: `${base}-x-${donor}`, label: `${themeLabel(base)} × ${themeLabel(donor)}` };
  for (const part of PARTS) {
    if (!taken.has(part.key)) continue;
    for (const field of part.fields) {
      if (give[field] === undefined) delete fused[field];
      else fused[field] = structuredClone(give[field]);
    }
  }
  return fused as ThemeSpec;
}

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export function ThemeFuserDemo() {
  const [chartId, setChartId] = useState(THEME_CHARTS[0].id);
  const [base, setBase] = useState('economist');
  const [donor, setDonor] = useState('cartoon');
  const [taken, setTaken] = useState<Set<string>>(() => new Set(['ink', 'marks']));
  const [copied, setCopied] = useState(false);
  const chart = THEME_CHARTS.find(({ id }) => id === chartId)!;

  const fused = useMemo(() => fuse(base, donor, taken), [base, donor, taken]);
  const panels = useMemo(() => [
    { id: 'base', title: themeLabel(base), planned: planOf(withTheme(chart.spec, base)) },
    { id: 'fused', title: `${themeLabel(base)} × ${themeLabel(donor)}`, planned: planOf(withTheme(chart.spec, fused)) },
    { id: 'donor', title: themeLabel(donor), planned: planOf(withTheme(chart.spec, donor)) },
  ], [base, donor, fused, chart]);

  const toggle = (key: string) => setTaken((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const surprise = () => {
    const first = pick(THEME_IDS);
    setBase(first);
    setDonor(pick(THEME_IDS.filter((id) => id !== first)));
    setTaken(new Set(PARTS.filter(() => Math.random() < 0.45).map(({ key }) => key)));
  };
  const copy = () => {
    void navigator.clipboard?.writeText(JSON.stringify(fused, null, 2)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <section className="ov-demo lp-demo" data-demo="fuser">
      <header className="ov-demo-header">
        <div>
          <h2>Theme fuser</h2>
          <p>Start from one house and borrow parts of another. Colour and marks only restyle the chart; type, room and labels can change its layout too.</p>
        </div>
        <ChartPicker value={chartId} onChange={setChartId} />
      </header>
      <div className="lp-fuser-controls">
        <label>
          <span>Base</span>
          <select value={base} onChange={(event) => setBase(event.target.value)}>
            {THEME_IDS.map((id) => <option key={id} value={id}>{themeLabel(id)}</option>)}
          </select>
        </label>
        <label>
          <span>Borrow from</span>
          <select value={donor} onChange={(event) => setDonor(event.target.value)}>
            {THEME_IDS.map((id) => <option key={id} value={id}>{themeLabel(id)}</option>)}
          </select>
        </label>
        <div className="lp-fuser-parts" role="group" aria-label="Parts to borrow">
          {PARTS.map((part) => (
            <button type="button" key={part.key} className={taken.has(part.key) ? 'active' : ''} aria-pressed={taken.has(part.key)} onClick={() => toggle(part.key)}>
              {part.label}
            </button>
          ))}
        </div>
        <div className="ov-backends" role="group" aria-label="Fuser actions">
          <button type="button" onClick={surprise}>Surprise me</button>
          <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy theme JSON'}</button>
        </div>
      </div>
      <div className="lp-fuser-row">
        {panels.map(({ id, title, planned }) => (
          <figure key={id} className={`lp-slice lp-fuser-${id}`} data-panel={`fuser-${id}`}>
            <figcaption>
              <strong>{title}</strong>
              <PlannedCaption planned={planned} />
            </figcaption>
            {planned.spec && <SvgChart spec={planned.spec} />}
          </figure>
        ))}
      </div>
    </section>
  );
}

