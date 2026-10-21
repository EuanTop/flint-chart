/**
 * Axis label overflow: what category names along x do when they do not stand flat and whole. Two
 * paths — a row of names, and a sequence that explains itself — each shown step by step with live
 * charts compiled by the current Flint. Trimming is an add-on to every step.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { assembleVegaLite, type ChartAssemblyInput } from 'flint-chart';
import { ScaleToFit } from '../../components/ScaleToFit';
import { VegaLiteView } from '../../components/VegaLiteView';
import { siteTheme } from '../../shared/theme';
import { PREVIEW_CASES } from '../../shared/preview-cases';

const card: CSSProperties = { background: siteTheme.surface, border: `1px solid ${siteTheme.border}`, borderRadius: siteTheme.radius, padding: 12 };
const code = (text: string) => <code style={{ fontSize: 12, background: siteTheme.bg, padding: '0 4px', borderRadius: 3 }}>{text}</code>;

/** A plain house: only its label settings vary. */
const house = (labels?: Record<string, unknown>) => ({
  id: 'label-probe', label: 'Label probe',
  ink: { surface: { canvas: '#ffffff' }, series: { single: '#1f4e79', categorical: ['#1f4e79', '#e07b39', '#4a9bd4', '#7a8b99'] } },
  type: { axisLabel: { size: 14 }, axisTitle: { size: 14 } },
  ...(labels ? { labels } : {}),
}) as any;

const bars = (field: string, type: string, names: string[], title: string, width = 320, chartProperties?: Record<string, unknown>, height = 200) => ({
  data: { values: names.map((name, i) => ({ [field]: name, Value: ((i * 7) % 11) + 3 })) },
  semantic_types: { [field]: type, Value: 'Quantity' },
  chart_spec: { chartType: 'Bar Chart', encodings: { x: field, y: 'Value' }, title, baseSize: { width, height }, ...(chartProperties ? { chartProperties } : {}) },
}) as any;
const fromCase = (id: string, width = 320) => {
  const c = PREVIEW_CASES.find((x) => x.id === id)!;
  return { data: { values: c.data }, semantic_types: c.semantic_types, chart_spec: { chartType: c.chartType, encodings: c.encodings, title: c.title, baseSize: { width, height: 200 } } } as any;
};

const LONG = ['Democratic Republic of the Congo', 'Bosnia and Herzegovina', 'Central African Republic', 'Trinidad and Tobago', 'Papua New Guinea', 'Saint Vincent and the Grenadines'];
const MINUTES = Array.from({ length: 36 }, (_, i) => `${16 + Math.floor((40 + i) / 60)}:${String((40 + i) % 60).padStart(2, '0')}`);
const QUARTERS = Array.from({ length: 8 }, (_, i) => `${2023 + Math.floor(i / 4)} Q${(i % 4) + 1}`);
const DECADES = Array.from({ length: 15 }, (_, i) => `${1880 + i * 10}s cohort of arrivals from overseas territories`);
const plants = (n: number) => Array.from({ length: n }, (_, i) => `Plant-${['North', 'South', 'East', 'West'][i % 4]}${String(i + 1).padStart(2, '0')}`);

interface Example { step: string; note: ReactNode; input: Omit<ChartAssemblyInput, 'theme_spec'>; labels?: Record<string, unknown> }
interface Path { id: string; title: string; who: ReactNode; steps: string[]; examples: Example[] }

const PATHS: Path[] = [
  {
    id: 'names',
    title: 'A row of names',
    who: 'Countries, products, categories, ordered words (Likert levels, stages). Every name is always printed: names are never left out.',
    steps: ['wrap', 'rotate45 (if the theme permits)', 'rotate90'],
    examples: [
      { step: 'wrap', note: 'Two lines, broken at a space.', input: fromCase('medals-grouped') },
      { step: 'wrap + trim', note: 'Two lines, each trimmed to the band.', input: bars('Country', 'Country', LONG, 'Population, millions') },
      { step: 'rotate45', note: <>Where the theme permits it: {code('overflow: ["wrap", "rotate45", "rotate90"]')}.</>, input: bars('Site', 'Category', plants(12), 'Output by plant', 320, undefined, 300), labels: { overflow: ['wrap', 'rotate45', 'rotate90'] } },
      { step: 'rotate90', note: 'Upright, whole.', input: bars('Site', 'Category', plants(40), 'Output by plant', 320, undefined, 300) },
      { step: 'rotate90 + trim', note: 'Upright, trimmed at the turned limit (40% of the plot’s height).', input: bars('Country', 'Country', LONG.flatMap((name) => [name, `${name} (overseas territories)`]), 'Population, millions', 320) },
    ],
  },
  {
    id: 'sequence',
    title: 'A sequence that explains itself',
    who: 'Times, dates, months, quarters, years, decades, ranks — by semantic type. A name left out reads from its neighbours (16:40 … 16:50 holds 16:45), so the sequence thins to round values before it turns.',
    steps: ['wrap', 'skip', 'rotate45 (if the theme permits)', 'rotate90'],
    examples: [
      { step: 'wrap', note: 'Two lines, broken at a space.', input: bars('Quarter', 'YearQuarter', QUARTERS, 'Revenue by quarter', 260) },
      { step: 'skip', note: 'Only the round values, flat and full size; every band keeps its tick.', input: bars('Time', 'Time', MINUTES, 'Throttled invocations by minute') },
      { step: 'skip + trim', note: 'Round values trimmed to the room between them.', input: bars('Decade', 'Decade', DECADES, 'Arrivals by decade', 140) },
      { step: 'rotate90', note: <>Where the chart asks for every label: {code('labelOverflow: ["wrap", "rotate90"]')}.</>, input: bars('Time', 'Time', MINUTES, 'Throttled invocations by minute', 320, { labelOverflow: ['wrap', 'rotate90'] }) },
    ],
  },
];

function compiled(example: Example) {
  try {
    const spec: any = assembleVegaLite({ ...structuredClone(example.input), theme_spec: house(example.labels) } as ChartAssemblyInput);
    const report = (spec._theme?.report ?? []).find((r: any) => r.code === 'labels-overflow');
    return { spec, step: report?.message.match(/step `([^`]+)`/)?.[1] ?? 'fits' };
  } catch (error) {
    return { error: String(error) };
  }
}

function ExampleCard({ example }: { example: Example }) {
  const result = useMemo(() => compiled(example), [example]);
  const matches = 'step' in result && result.step === example.step;
  return (
    <div style={{ ...card, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 14 }}>{example.step}</strong>
        {'step' in result && !matches && <span style={{ fontSize: 11.5, color: '#b54708' }}>took {result.step}</span>}
      </div>
      <div style={{ fontSize: 12.5, color: siteTheme.textMuted, minHeight: 34 }}>{example.note}</div>
      {'error' in result ? <pre style={{ color: '#b42318', fontSize: 11, whiteSpace: 'pre-wrap' }}>{result.error}</pre> : (
        <div style={{ border: `1px dashed ${siteTheme.borderMuted}`, borderRadius: 4, padding: 4, background: '#fff', marginTop: 6 }}>
          <ScaleToFit height={230} minHeight={120} adaptiveHeight padding={2}>
            <VegaLiteView spec={result.spec} renderer="svg" />
          </ScaleToFit>
        </div>
      )}
    </div>
  );
}

function PathChips({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: '8px 0 4px' }}>
      {steps.map((step, i) => (
        <span key={step} style={{ display: 'contents' }}>
          {i > 0 && <span style={{ color: siteTheme.textMuted }}>→</span>}
          <span style={{ fontSize: 13, padding: '2px 10px', borderRadius: 999, border: `1px solid ${siteTheme.border}`, background: siteTheme.surface }}>{step}</span>
        </span>
      ))}
      <span style={{ fontSize: 12.5, color: siteTheme.textMuted, marginLeft: 6 }}>· each step whole, or + trim</span>
    </div>
  );
}

export function LabelAngles() {
  return (
    <div style={{ padding: '24px 32px', maxWidth: 1500 }}>
      <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Axis label overflow</h1>
      <p style={{ fontSize: 14, maxWidth: 960, lineHeight: 1.55, margin: '0 0 6px' }}>
        Category names along x that fit their band are always flat — no theme forces a turn. Names that do not fit take
        one of two paths. <strong>Trimming is an add-on to every step</strong> (a theme’s {code('truncation: "never"')} forbids
        it; identifiers are never trimmed). The path’s order binds; within it each step is weighed whole and trimmed, at
        every size down to the theme’s floor, and the cheapest is taken — so a slightly smaller name beats a turned one.
      </p>
      <p style={{ fontSize: 13, color: siteTheme.textMuted, maxWidth: 960, margin: '0 0 18px' }}>
        A theme states another path in {code('labels.overflow')}, its thresholds in {code('labels.fit')}; a chart in
        {' '}{code('chartProperties.labelOverflow')}. Names down y never turn: they wrap or are trimmed. Continuous rulers
        (dates and numbers on a scale) never turn: their ticks thin.
      </p>
      {PATHS.map((path) => (
        <section key={path.id} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 19, margin: '0 0 2px' }}>{path.title}</h2>
          <div style={{ fontSize: 13, color: siteTheme.textMuted, maxWidth: 960 }}>{path.who}</div>
          <PathChips steps={path.steps} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 10 }}>
            {path.examples.map((example) => <ExampleCard key={example.step} example={example} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
