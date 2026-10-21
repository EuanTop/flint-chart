/**
 * New theme test: published data-visualisation style guides, one tab per house.
 *
 * Each tab holds what the guide says (research/<id>.json), the closest ThemeSpec the current schema
 * can state, that theme over the standard preview charts, and the gaps: for every rule the theme
 * could not state or Flint did not draw, Flint's chart beside a hand-crafted Vega-Lite chart of what
 * the guide asks for, with notes on the difference. The overview tab collects the gaps across houses.
 */
import { useHouseFonts } from '../house-fonts';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { FlintView } from '../../components/FlintView';
import { ScaleToFit } from '../../components/ScaleToFit';
import { VegaLiteView } from '../../components/VegaLiteView';
import { siteTheme } from '../../shared/theme';
import { PREVIEW_CASES } from '../../shared/preview-cases';
import { STYLE_GUIDE_THEMES } from './themes';
import { DEFERRED_PROBES, FINDINGS, FLINT_BUGS, ISSUE_FAMILIES, ISSUE_STATUS, PROBES, REPRESENTATIVES, canonicalProbe, type IssueFamily } from './findings';
import type { GapKind, ResearchRecord, StyleGuideTheme, ThemeGap } from './types';

const RESEARCH = Object.values(
  import.meta.glob('./research/*.json', { eager: true, import: 'default' }) as Record<string, ResearchRecord>,
).sort((a, b) => a.org.localeCompare(b.org));

const THEME_BY_ID = new Map(STYLE_GUIDE_THEMES.map((theme) => [theme.id, theme]));

type Entry = { theme: StyleGuideTheme; gap: ThemeGap; issue: string };
const ENTRIES: Entry[] = STYLE_GUIDE_THEMES.flatMap((theme) => theme.gaps.map((gap) => ({ theme, gap, issue: canonicalProbe(gap.probe) })));
const isDeferred = (gap: ThemeGap) => DEFERRED_PROBES.has(canonicalProbe(gap.probe));
const IN_SCOPE = ENTRIES.filter((entry) => !DEFERRED_PROBES.has(entry.issue));
const DEFERRED = ENTRIES.filter((entry) => DEFERRED_PROBES.has(entry.issue));
const BY_ISSUE = new Map<string, Entry[]>();
for (const entry of IN_SCOPE) BY_ISSUE.set(entry.issue, [...(BY_ISSUE.get(entry.issue) ?? []), entry]);

/** The families, plus one holding any issue no family names, so nothing in scope goes unlisted. */
const FAMILIES: IssueFamily[] = (() => {
  const named = new Set(ISSUE_FAMILIES.flatMap((family) => family.issues));
  const rest = [...BY_ISSUE.keys()].filter((issue) => !named.has(issue)).sort();
  const families = ISSUE_FAMILIES.map((family) => ({ ...family, issues: family.issues.filter((issue) => BY_ISSUE.has(issue)) }));
  return rest.length ? [...families, { id: 'other', label: 'Other', principle: 'Issues no family claims yet.', issues: rest }] : families;
})();
const FAMILY_OF = new Map(FAMILIES.flatMap((family) => family.issues.map((issue) => [issue, family] as const)));
const houseCount = (entries: Entry[]) => new Set(entries.map((entry) => entry.theme.id)).size;

const SEVERITY_SCORE = { high: 30, medium: 20, low: 10 } as const;

/** Up to `limit` examples from different houses: hand-picked first, then the strongest evidence. */
function representatives(issue: string, limit = 3): Entry[] {
  const entries = BY_ISSUE.get(issue) ?? [];
  const picked: Entry[] = [];
  for (const ref of REPRESENTATIVES[issue] ?? []) {
    const [house, gapId] = ref.split(':');
    const found = entries.find((entry) => entry.theme.id === house && entry.gap.id === gapId);
    if (found) picked.push(found);
  }
  const hasBug = FLINT_BUGS.some((bug) => bug.issue === issue);
  const score = ({ gap }: Entry) => (gap.flint && gap.expectedSpec ? 100 : 0) + SEVERITY_SCORE[gap.severity]
    + (gap.observed ? 5 : 0) + (hasBug && gap.kind === 'realization' ? 15 : 0);
  for (const entry of [...entries].sort((a, b) => score(b) - score(a))) {
    if (picked.length >= limit) break;
    if (picked.some((p) => p.theme.id === entry.theme.id)) continue;
    picked.push(entry);
  }
  return picked.slice(0, limit);
}

const DEFAULT_GALLERY = [
  'population', 'temp-anomaly', 'medals-grouped', 'electricity-stacked', 'ev-share',
  'us-unemployment', 'electricity-mix-area', 'browser-pie', 'gapminder-bubble', 'temp-heatmap',
];

const KIND_COLORS: Record<GapKind, string> = {
  expressiveness: '#b42318',
  'chart-spec': '#9a3412',
  realization: '#6941c6',
  'visual-quality': '#0e7090',
  'product-ui': '#475467',
};

const KIND_LABELS: Record<GapKind, string> = {
  expressiveness: 'ThemeSpec cannot state it',
  'chart-spec': 'Chart spec has no slot',
  realization: 'Stated, not drawn',
  'visual-quality': 'Visual quality',
  'product-ui': 'Product UI',
};

const card: CSSProperties = {
  background: siteTheme.surface,
  border: `1px solid ${siteTheme.border}`,
  borderRadius: siteTheme.radius,
  padding: 16,
};

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, lineHeight: 1.5, padding: '0 8px', borderRadius: 999,
      color, border: `1px solid ${color}`, background: '#fff', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 10px', color: siteTheme.text }}>{title}</h2>
      {children}
    </section>
  );
}

const HEX = /^#[0-9a-f]{3,8}$/i;

function Swatches({ label, colors }: { label: string; colors: unknown }) {
  const list = (Array.isArray(colors) ? colors : [colors]).filter((c): c is string => typeof c === 'string' && HEX.test(c));
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
      <div style={{ width: 110, fontSize: 12, color: siteTheme.textMuted }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {list.map((c, i) => (
          <div key={`${c}-${i}`} title={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 26, height: 18, background: c, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2 }} />
            <code style={{ fontSize: 8.5, color: siteTheme.navInactive }}>{c.replace('#', '')}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A research block as a definition list, skipping empty values. */
function Facts({ title, value }: { title: string; value: unknown }) {
  if (value == null || value === '') return null;
  const entries: [string, unknown][] = typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value as Record<string, unknown>)
    : [['', value]];
  const shown = entries.filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length));
  if (!shown.length) return null;
  const text = (v: unknown): string => typeof v === 'string' ? v
    : Array.isArray(v) ? v.map(text).join(', ')
      : typeof v === 'object' ? Object.entries(v as Record<string, unknown>).filter(([, x]) => x != null).map(([k, x]) => `${k}: ${text(x)}`).join('; ')
        : String(v);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: siteTheme.textMuted, marginBottom: 4 }}>{title}</div>
      <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}>
        <tbody>
          {shown.map(([k, v]) => (
            <tr key={k} style={{ verticalAlign: 'top' }}>
              {k && <td style={{ padding: '2px 10px 2px 0', color: siteTheme.navInactive, width: 130, whiteSpace: 'nowrap' }}>{k}</td>}
              <td style={{ padding: '2px 0', color: siteTheme.text }}>{text(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ThemeDoc({ r }: { r: ResearchRecord }) {
  const colors = (r.colors ?? {}) as Record<string, unknown>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: siteTheme.textMuted, marginBottom: 6 }}>Colour</div>
        <Swatches label="Categorical" colors={colors.categorical} />
        <Swatches label="Sequential" colors={colors.sequential} />
        <Swatches label="Diverging" colors={colors.diverging} />
        <Swatches label="Highlight" colors={colors.highlight} />
        <Swatches label="Context" colors={colors.context} />
        <Swatches label="Positive / negative" colors={[colors.positive, colors.negative]} />
        <Swatches label="Surface / text" colors={[colors.background, colors.text, colors.textSecondary]} />
        <Swatches label="Grid / axis" colors={[colors.gridline, colors.axis]} />
        {typeof colors.categoricalNotes === 'string' && <p style={{ fontSize: 12.5, color: siteTheme.text }}>{colors.categoricalNotes}</p>}
        {typeof colors.notes === 'string' && <p style={{ fontSize: 12.5, color: siteTheme.textMuted }}>{colors.notes}</p>}
        <Facts title="Typography" value={r.typography} />
      </div>
      <div style={card}>
        <Facts title="Structure" value={r.structure} />
        <Facts title="Legend" value={r.legend} />
        <Facts title="Marks" value={r.marks} />
        <Facts title="Labels" value={r.labels} />
        <Facts title="Furniture" value={r.furniture} />
        <Facts title="Annotations" value={r.annotations} />
        <Facts title="Layout" value={r.layout} />
        <Facts title="Interaction" value={r.interaction} />
        <Facts title="Accessibility" value={r.accessibility} />
        <Facts title="Chart types" value={r.chartTypes} />
      </div>
    </div>
  );
}

function Rules({ r }: { r: ResearchRecord }) {
  if (!r.distinctiveRules?.length) return <p style={{ color: siteTheme.textMuted }}>No distinctive rules recorded.</p>;
  return (
    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.5 }}>
      {r.distinctiveRules.map((rule, i) => (
        <li key={i} style={{ marginBottom: 6 }}>
          <span style={{ color: siteTheme.text }}>{rule.rule}</span>
          {rule.quote && <span style={{ color: siteTheme.navInactive }}> — “{rule.quote}”</span>}
          {rule.source && <> <a href={rule.source} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>source</a></>}
        </li>
      ))}
    </ol>
  );
}

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: siteTheme.navInactive, marginBottom: 4 }}>{label}</div>
      <div style={{ border: `1px dashed ${siteTheme.borderMuted}`, borderRadius: 4, padding: 6, minHeight: 120, background: '#fff' }}>{children}</div>
    </div>
  );
}

function Expected({ gap }: { gap: ThemeGap }) {
  if (!gap.expectedSpec) return <div style={{ fontSize: 12, color: siteTheme.textMuted }}>Described in the notes.</div>;
  const frame = gap.expectedFrame;
  return (
    <ScaleToFit height={420} minHeight={120} adaptiveHeight padding={2}>
      <div style={{ display: 'inline-block', ...(frame?.style ?? {}) }}>
        {frame?.headerHtml && <div dangerouslySetInnerHTML={{ __html: frame.headerHtml }} />}
        <VegaLiteView spec={gap.expectedSpec} renderer="svg" />
        {frame?.footerHtml && <div dangerouslySetInnerHTML={{ __html: frame.footerHtml }} />}
      </div>
    </ScaleToFit>
  );
}

function GapCard({ gap, index, house, onOpenHouse }: { gap: ThemeGap; index: number; house?: StyleGuideTheme; onOpenHouse?: (id: string) => void }) {
  const sev = { high: '#b42318', medium: '#b54708', low: '#667085' }[gap.severity];
  return (
    <article id={`gap-${gap.id}`} style={{ ...card, marginBottom: 16 }} data-gap={gap.id}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        {house && (
          <button type="button" onClick={() => onOpenHouse?.(house.id)} style={{ fontSize: 12, fontWeight: 700, color: siteTheme.accent, background: siteTheme.accentBg, border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>
            {house.org}
          </button>
        )}
        <strong style={{ fontSize: 15, color: siteTheme.text }}>{index + 1}. {gap.title}</strong>
        <Badge color={KIND_COLORS[gap.kind]}>{KIND_LABELS[gap.kind]}</Badge>
        <Badge color={sev}>{gap.severity}</Badge>
        {gap.probe && <code style={{ fontSize: 11, color: siteTheme.navInactive }}>{gap.probe}</code>}
        {gap.addressed && <Badge color="#067647">addressed · {gap.addressed.stage}</Badge>}
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '90px minmax(0, 1fr)', gap: '4px 10px', fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}>
        <span style={{ color: siteTheme.navInactive }}>Guide</span><span>{gap.rule}</span>
        <span style={{ color: siteTheme.navInactive }}>Current</span><span>{gap.current}</span>
        <span style={{ color: siteTheme.navInactive }}>Expected</span><span>{gap.expected}</span>
        {gap.proposal && <><span style={{ color: siteTheme.navInactive }}>Proposal</span><span style={{ color: '#065986' }}>{gap.proposal}</span></>}
        {gap.observed && <><span style={{ color: siteTheme.navInactive }}>Observed</span><span style={{ color: siteTheme.textMuted }}>{gap.observed}</span></>}
        {gap.addressed && <><span style={{ color: '#067647' }}>Addressed</span><span style={{ color: '#067647' }}><a href={stageHref(gap.addressed.stage)} style={{ color: DONE, fontWeight: 600 }}>{gap.addressed.stage}</a> — {gap.addressed.note} The current panel draws the house as it now stands; “Current” and “Observed” describe it before.</span></>}
      </div>
      {(gap.flint || gap.expectedSpec) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <Panel label="Current — Flint with the house theme">
            {gap.flint
              ? <ScaleToFit height={420} minHeight={120} adaptiveHeight padding={2}><FlintView spec={gap.flint} renderer="svg" compact showWarnings={false} /></ScaleToFit>
              : <div style={{ fontSize: 12, color: siteTheme.textMuted }}>Not drawable in Flint.</div>}
          </Panel>
          <Panel label="Expected — hand-crafted from the guide"><Expected gap={gap} /></Panel>
        </div>
      )}
    </article>
  );
}

function Gallery({ theme }: { theme: StyleGuideTheme }) {
  const ids = theme.gallery ?? DEFAULT_GALLERY;
  const cases = ids.map((id) => PREVIEW_CASES.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
      {cases.map((c) => (
        <div key={c.id} style={{ ...card, padding: 8 }} data-gallery={c.id}>
          <ScaleToFit height={210} minHeight={110} adaptiveHeight padding={2}>
            <FlintView
              spec={{
                data: { values: c.data },
                semantic_types: c.semantic_types,
                chart_spec: { chartType: c.chartType, encodings: c.encodings, baseSize: { width: 320, height: 210 }, title: c.title, ...(c.chartProperties ? { chartProperties: c.chartProperties } : {}) },
                theme_spec: theme.theme,
              } as any}
              renderer="svg"
              compact
            />
          </ScaleToFit>
        </div>
      ))}
    </div>
  );
}

const md = (source: string) => (
  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: siteTheme.text }} className="ntt-md">
    <ReactMarkdown>{source}</ReactMarkdown>
  </div>
);

function ThemeTab({ r }: { r: ResearchRecord }) {
  const theme = THEME_BY_ID.get(r.id);
  const [showSpec, setShowSpec] = useState(false);
  return (
    <div>
      <header>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>{r.org}</h1>
          <Badge color={r.access === 'full' ? '#067647' : r.access === 'partial' ? '#b54708' : '#b42318'}>access: {r.access}</Badge>
          {r.context && <Badge color={siteTheme.navInactive}>{r.context}</Badge>}
          {theme && <Badge color={siteTheme.accent}>{theme.gaps.length} gaps</Badge>}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 900, color: siteTheme.text }}>{r.summary}</p>
        <div style={{ fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {r.urls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, '').slice(0, 70)}</a>)}
        </div>
        {r.accessNotes && <p style={{ fontSize: 12, color: siteTheme.navInactive }}>{r.accessNotes}</p>}
      </header>

      <Section title="Theme doc — what the guide says"><ThemeDoc r={r} /></Section>
      <Section title="Distinctive rules"><div style={card}><Rules r={r} /></div></Section>
      {r.referenceImages?.some((image) => image.describes) && (
        <Section title="Reference charts (as described from the guide's own images)">
          <div style={card}>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
              {r.referenceImages.filter((image) => image.describes).map((image, i) => (
                <li key={i}>{image.describes} {image.url && <a href={image.url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>image</a>}</li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {theme ? (
        <>
          <Section title="Mapping onto ThemeSpec">
            <div style={card}>
              {md(theme.notes)}
              <button type="button" onClick={() => setShowSpec((v) => !v)} style={{ marginTop: 8, fontSize: 12 }}>
                {showSpec ? 'Hide' : 'Show'} ThemeSpec JSON
              </button>
              {showSpec && <pre style={{ fontSize: 11, maxHeight: 420, overflow: 'auto', background: siteTheme.bg, padding: 10 }}>{JSON.stringify(theme.theme, null, 2)}</pre>}
            </div>
          </Section>
          <Section title="Gallery — the theme over the standard charts"><Gallery theme={theme} /></Section>
          <Section title={`Gaps (${theme.gaps.filter((gap) => !isDeferred(gap)).length})`} id="gaps">
            {theme.gaps.filter((gap) => !isDeferred(gap)).map((gap, i) => <GapCard key={gap.id} gap={gap} index={i} />)}
          </Section>
          {theme.gaps.some(isDeferred) && (
            <details style={{ marginTop: 20 }}>
              <summary style={{ cursor: 'pointer', fontSize: 14, color: siteTheme.textMuted }}>
                Deferred to the annotation layer ({theme.gaps.filter(isDeferred).length}) — emphasis, callouts and in-text keys
              </summary>
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                {theme.gaps.filter(isDeferred).map((gap, i) => <GapCard key={gap.id} gap={gap} index={i} />)}
              </div>
            </details>
          )}
        </>
      ) : (
        <Section title="Theme"><div style={card}>Not yet mapped onto a ThemeSpec.</div></Section>
      )}
    </div>
  );
}

/** The theme-improvement stage a link opens; the page finds the area from the stage. */
const stageHref = (stage: string) => `#/playground/theme-improvement?stage=${stage.toLowerCase()}`;
const DONE = '#067647';

/** How far an issue has come: its gaps addressed, its bugs fixed and still open. */
function progress(issue: string) {
  const entries = BY_ISSUE.get(issue) ?? [];
  const addressed = entries.filter((entry) => entry.gap.addressed);
  const bugs = FLINT_BUGS.filter((bug) => bug.issue === issue);
  const fixed = bugs.filter((bug) => bug.fixed && !bug.fixed.partly).length;
  const stages = [...new Set([...addressed.map((entry) => entry.gap.addressed!.stage), ...bugs.flatMap((bug) => (bug.fixed ? [bug.fixed.stage] : []))])].sort();
  return { entries, addressed: addressed.length, bugs: bugs.length, fixed, open: bugs.length - fixed, stages };
}

function IssueChip({ issue, onIssue }: { issue: string; onIssue: (issue: string) => void }) {
  const p = progress(issue);
  const done = p.entries.length > 0 && p.addressed === p.entries.length && p.open === 0;
  const state = ISSUE_STATUS[issue];
  return (
    <button type="button" onClick={() => onIssue(issue)} title={`${PROBES[issue] ?? issue}${p.stages.length ? ` — worked on in ${p.stages.join(', ')}` : ''}${state ? ` — ${state.note}` : ''}`}
      style={{ fontSize: 12, margin: 3, padding: '2px 8px', cursor: 'pointer', borderRadius: 999, border: `1px ${state?.status === 'skip' ? 'dashed' : 'solid'} ${p.addressed || p.fixed ? DONE : siteTheme.borderMuted}`, background: done ? '#ecfdf3' : '#fff', opacity: state?.status === 'skip' ? 0.6 : 1 }}>
      <code style={{ fontSize: 11.5 }}>{issue}</code>
      {state && <span style={{ color: siteTheme.navInactive, fontStyle: 'italic' }}> · {state.status === 'skip' ? 'skipped' : 'later'}</span>}
      <span style={{ color: siteTheme.navInactive }}> · {houseCount(p.entries)}</span>
      {p.addressed > 0 && <span style={{ color: DONE }}> · {p.addressed}/{p.entries.length} addressed</span>}
      {p.fixed > 0 && <span style={{ color: DONE }}> · {p.fixed} bug{p.fixed === 1 ? '' : 's'} fixed</span>}
      {p.open > 0 && <span style={{ color: KIND_COLORS.realization }}> · {p.open} bug{p.open === 1 ? '' : 's'}{p.bugs > p.open ? ' open' : ''}</span>}
    </button>
  );
}

/** Where the theme-improvement work stands against the issues. */
function IssueProgress() {
  const addressed = IN_SCOPE.filter((entry) => entry.gap.addressed);
  const byStage = new Map<string, number>();
  for (const entry of addressed) byStage.set(entry.gap.addressed!.stage, (byStage.get(entry.gap.addressed!.stage) ?? 0) + 1);
  const fixed = FLINT_BUGS.filter((bug) => bug.fixed && !bug.fixed.partly).length;
  const partly = FLINT_BUGS.filter((bug) => bug.fixed?.partly).length;
  const stages = [...byStage.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  return (
    <div style={{ ...card, borderColor: DONE, marginBottom: 14, fontSize: 13, lineHeight: 1.6 }}>
      <strong style={{ color: DONE }}>Progress.</strong>{' '}
      {addressed.length} of {IN_SCOPE.length} gaps addressed across {houseCount(addressed)} houses; {fixed} of {FLINT_BUGS.length} Flint bugs fixed{partly ? `, ${partly} partly` : ''}.
      {' '}By stage:{' '}
      {stages.map(([stage, n], i) => (
        <span key={stage}>{i ? ' · ' : ''}<a href={stageHref(stage)} style={{ color: DONE, fontWeight: 600 }}>{stage}</a> {n}</span>
      ))}
      . Each addressed case card links to its stage on the <a href="#/playground/theme-improvement">Theme improvement</a> page, where it is shown before and after.
    </div>
  );
}

function Overview({ onIssue }: { onIssue: (issue: string) => void }) {
  const kinds = Object.keys(KIND_LABELS) as GapKind[];
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 24 }}>New theme test — overview</h1>
      <p style={{ fontSize: 14, color: siteTheme.textMuted, maxWidth: 900 }}>
        {RESEARCH.length} style guides researched from datavizstyleguide.com/examples, {STYLE_GUIDE_THEMES.length} mapped onto a ThemeSpec.
        {' '}{IN_SCOPE.length} gaps in scope; {DEFERRED.length} more about chart annotations are deferred.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '8px 0 16px' }}>
        {kinds.map((kind) => (
          <div key={kind} style={{ ...card, padding: '8px 12px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: KIND_COLORS[kind] }}>{IN_SCOPE.filter((entry) => entry.gap.kind === kind).length}</div>
            <div style={{ fontSize: 12, color: siteTheme.textMuted }}>{KIND_LABELS[kind]}</div>
          </div>
        ))}
        <div style={{ ...card, padding: '8px 12px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: siteTheme.navInactive }}>{DEFERRED.length}</div>
          <div style={{ fontSize: 12, color: siteTheme.textMuted }}>Deferred: chart annotations ({houseCount(DEFERRED)} houses)</div>
        </div>
      </div>
      <Section title="Issues by family">
        <div style={{ display: 'grid', gap: 10 }}>
          {FAMILIES.map((family) => (
            <div key={family.id} style={{ ...card, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{family.label}</div>
              <div style={{ fontSize: 12.5, color: siteTheme.textMuted, margin: '2px 0 6px' }}>{family.principle}</div>
              <div>{family.issues.map((issue) => <IssueChip key={issue} issue={issue} onIssue={onIssue} />)}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Findings"><div style={card}>{md(FINDINGS)}</div></Section>
      <Section title="Flint bugs found along the way">
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <tbody>
            {FLINT_BUGS.map((bug) => (
              <tr key={bug.id} style={{ borderBottom: `1px solid ${siteTheme.border}`, verticalAlign: 'top' }}>
                <td style={{ padding: 6, whiteSpace: 'nowrap' }}><code>{bug.id}</code></td>
                <td style={{ padding: 6 }}><ReactMarkdown>{bug.summary}</ReactMarkdown></td>
                <td style={{ padding: 6, whiteSpace: 'nowrap', color: siteTheme.textMuted }}>{bug.houses} house{bug.houses === 1 ? '' : 's'}</td>
                <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{bug.fixed ? <a href={stageHref(bug.fixed.stage)} style={{ color: DONE, fontWeight: 600 }} title={bug.fixed.partly}>{bug.fixed.partly ? 'partly fixed' : 'fixed'} · {bug.fixed.stage}</a> : <span style={{ color: KIND_COLORS.realization }}>open</span>}</td>
                <td style={{ padding: 6, whiteSpace: 'nowrap' }}><IssueChip issue={bug.issue} onIssue={onIssue} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

/** One issue: what it is, the family principle, the Flint bugs behind it, and representative cases. */
function IssueDetail({ issue, onOpen }: { issue: string; onOpen: (id: string) => void }) {
  const entries = BY_ISSUE.get(issue) ?? [];
  const family = FAMILY_OF.get(issue);
  const bugs = FLINT_BUGS.filter((bug) => bug.issue === issue);
  const examples = representatives(issue);
  const kinds = Object.keys(KIND_LABELS) as GapKind[];
  const rest = entries.filter((entry) => !examples.includes(entry));
  return (
    <div id="issue-detail" data-issue={issue}>
      <div style={{ fontSize: 12, color: siteTheme.navInactive, textTransform: 'uppercase', letterSpacing: 0.4 }}>{family?.label}</div>
      <h2 style={{ margin: '2px 0 6px', fontSize: 22 }}><code>{issue}</code></h2>
      <p style={{ fontSize: 14, maxWidth: 900, margin: '0 0 6px' }}>{PROBES[issue] ?? entries[0]?.gap.title}</p>
      {family && <p style={{ fontSize: 13, color: siteTheme.textMuted, maxWidth: 900, margin: '0 0 10px' }}><strong>Principle for the family:</strong> {family.principle}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Badge color={siteTheme.accent}>{entries.length} gaps · {houseCount(entries)} houses</Badge>
        {ISSUE_STATUS[issue] && <Badge color={siteTheme.navInactive}>{ISSUE_STATUS[issue].status === 'skip' ? 'Skipped for now' : 'Later'} — {ISSUE_STATUS[issue].note}</Badge>}
        {entries.some((entry) => entry.gap.addressed) && <Badge color={DONE}>{entries.filter((entry) => entry.gap.addressed).length} addressed</Badge>}
        {kinds.map((kind) => {
          const n = entries.filter((entry) => entry.gap.kind === kind).length;
          return n ? <Badge key={kind} color={KIND_COLORS[kind]}>{n} {KIND_LABELS[kind].toLowerCase()}</Badge> : null;
        })}
      </div>
      {bugs.length > 0 && (
        <div style={{ ...card, borderColor: KIND_COLORS.realization, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: KIND_COLORS.realization, marginBottom: 4 }}>Flint bugs behind this issue</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {bugs.map((bug) => (
              <li key={bug.id} style={bug.fixed && !bug.fixed.partly ? { color: siteTheme.textMuted } : undefined}>
                <code>{bug.id}</code> ({bug.houses} houses) — <span className="ntt-inline-md"><ReactMarkdown>{bug.summary}</ReactMarkdown></span>
                {bug.fixed && <> <a href={stageHref(bug.fixed.stage)} style={{ color: DONE, fontWeight: 600 }}>{bug.fixed.partly ? 'partly fixed' : 'fixed'} in {bug.fixed.stage}</a>{bug.fixed.partly ? ` — ${bug.fixed.partly}` : ''}</>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3 style={{ fontSize: 15, margin: '6px 0 8px' }}>Representative examples</h3>
      {examples.map((entry, i) => <GapCard key={`${entry.theme.id}-${entry.gap.id}`} gap={entry.gap} index={i} house={entry.theme} onOpenHouse={onOpen} />)}
      {rest.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, margin: '14px 0 6px' }}>Every other case ({rest.length})</h3>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
            <tbody>
              {rest.map(({ theme, gap }) => (
                <tr key={`${theme.id}-${gap.id}`} style={{ borderBottom: `1px solid ${siteTheme.border}`, verticalAlign: 'top' }}>
                  <td style={{ padding: 5, whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => onOpen(theme.id)} style={{ fontSize: 12, cursor: 'pointer', border: 'none', background: 'none', color: siteTheme.accent, padding: 0 }}>{theme.org}</button>
                  </td>
                  <td style={{ padding: 5 }}>{gap.title}</td>
                  <td style={{ padding: 5, whiteSpace: 'nowrap' }}>{gap.addressed && <a href={stageHref(gap.addressed.stage)} style={{ textDecoration: 'none' }}><Badge color={DONE}>addressed · {gap.addressed.stage}</Badge></a>}</td>
                  <td style={{ padding: 5, whiteSpace: 'nowrap' }}><Badge color={KIND_COLORS[gap.kind]}>{KIND_LABELS[gap.kind]}</Badge></td>
                  <td style={{ padding: 5, whiteSpace: 'nowrap', color: siteTheme.navInactive }}>{gap.severity}{gap.flint && gap.expectedSpec ? ' · panels' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function Issues({ issue, onIssue, onOpen }: { issue: string | null; onIssue: (issue: string) => void; onOpen: (id: string) => void }) {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 24 }}>Issues</h1>
      <p style={{ fontSize: 14, color: siteTheme.textMuted, maxWidth: 900 }}>
        Every in-scope gap, grouped by the part of the system a principled fix would change. Pick an issue to see its family principle,
        the Flint bugs behind it, and up to three representative cases from different houses (both panels, highest severity first).
        Chart annotations are deferred and not listed. Green marks what the theme-improvement stages have addressed.
      </p>
      <IssueProgress />
      <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
        {FAMILIES.map((family) => (
          <div key={family.id} style={{ display: 'grid', gridTemplateColumns: '170px minmax(0, 1fr)', gap: 8, alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{family.label}</div>
            <div>{family.issues.map((id) => (
              <span key={id} style={id === issue ? { outline: `2px solid ${siteTheme.accent}`, borderRadius: 999, display: 'inline-block' } : undefined}>
                <IssueChip issue={id} onIssue={onIssue} />
              </span>
            ))}</div>
          </div>
        ))}
      </div>
      {issue && BY_ISSUE.has(issue) ? <IssueDetail key={issue} issue={issue} onOpen={onOpen} />
        : <div style={{ ...card, color: siteTheme.textMuted }}>Pick an issue above.</div>}
    </div>
  );
}


export function NewThemeTest() {
  const fontsReady = useHouseFonts();
  const [params, setParams] = useSearchParams();
  const active = params.get('theme') ?? 'overview';
  const [filter, setFilter] = useState('');
  const open = (id: string) => {
    setParams({ theme: id });
    window.scrollTo({ top: 0 });
  };
  const openIssue = (issue: string) => {
    setParams({ theme: 'issues', issue });
    window.setTimeout(() => document.getElementById('issue-detail')?.scrollIntoView({ block: 'start' }), 50);
  };
  const record = RESEARCH.find((r) => r.id === active);
  const list = useMemo(
    () => RESEARCH.filter((r) => r.org.toLowerCase().includes(filter.toLowerCase()) || r.id.includes(filter.toLowerCase())),
    [filter],
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
      <style>{'.ntt-md p{margin:0 0 8px}.ntt-md ul{margin:0 0 8px;padding-left:20px}.ntt-md code{font-size:12px;background:#f2f4f7;padding:0 3px;border-radius:3px}.ntt-inline-md p{display:inline;margin:0}'}</style>
      <nav style={{ position: 'sticky', top: 12, maxHeight: 'calc(100vh - 24px)', overflow: 'auto', fontSize: 13 }} aria-label="Style guides">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter houses"
          style={{ width: '100%', marginBottom: 8, padding: '4px 6px', fontSize: 12 }}
        />
        <button type="button" onClick={() => open('overview')} style={tabStyle(active === 'overview')}>Overview</button>
        <button type="button" onClick={() => open('issues')} style={tabStyle(active === 'issues')}>Issues</button>
        {list.map((r) => {
          const theme = THEME_BY_ID.get(r.id);
          return (
            <button key={r.id} type="button" onClick={() => open(r.id)} style={tabStyle(active === r.id)} data-tab={r.id}>
              <span style={{ flex: 1, textAlign: 'left' }}>{r.org}</span>
              <span style={{ fontSize: 10.5, color: theme ? siteTheme.accent : siteTheme.navInactive }}>{theme ? theme.gaps.length : '·'}</span>
            </button>
          );
        })}
      </nav>
      <main style={{ minWidth: 0 }}>
        {!fontsReady ? <p style={{ color: siteTheme.textMuted }}>Loading house fonts…</p>
          : active === 'issues' ? <Issues issue={params.get('issue')} onIssue={openIssue} onOpen={open} />
            : active === 'overview' || !record ? <Overview onIssue={openIssue} /> : <ThemeTab key={record.id} r={record} />}
      </main>
    </div>
  );
}

function tabStyle(selected: boolean): CSSProperties {
  return {
    display: 'flex', width: '100%', gap: 6, alignItems: 'center', border: 'none', borderRadius: 4,
    padding: '4px 8px', margin: '1px 0', cursor: 'pointer', fontSize: 12.5, textAlign: 'left',
    background: selected ? siteTheme.accentBg : 'transparent', color: selected ? siteTheme.accent : siteTheme.text,
    fontWeight: selected ? 600 : 400,
  };
}
