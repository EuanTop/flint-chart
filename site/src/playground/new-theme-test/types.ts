import type { ChartAssemblyInput, ThemeSpec } from 'flint-chart';

/** One organisation's style guide, as the research step read it (see research/<id>.json). */
export interface ResearchRecord {
  id: string;
  org: string;
  urls: string[];
  access: 'full' | 'partial' | 'none';
  accessNotes?: string | null;
  summary: string;
  context?: string | null;
  colors?: Record<string, unknown> | null;
  typography?: Record<string, unknown> | null;
  structure?: Record<string, unknown> | null;
  legend?: Record<string, unknown> | null;
  marks?: Record<string, unknown> | null;
  labels?: Record<string, unknown> | null;
  furniture?: Record<string, unknown> | null;
  annotations?: string | null;
  layout?: string | null;
  interaction?: string | null;
  accessibility?: string | null;
  chartTypes?: { preferred?: string[]; discouraged?: string[]; notes?: string | null } | null;
  distinctiveRules?: { rule: string; source?: string | null; quote?: string | null }[];
  referenceImages?: { file?: string | null; url?: string | null; describes?: string | null }[];
}

/**
 * What kind of shortfall a gap is.
 *
 * - `expressiveness`: the ThemeSpec has no field that can state the rule.
 * - `chart-spec`: the rule needs content only the chart spec can carry (a source line, a highlighted
 *   category), and the chart spec has no slot for it either.
 * - `realization`: the ThemeSpec states it, but the compiled chart does not draw it as stated.
 * - `visual-quality`: drawn as stated, but it looks wrong next to the guide (fonts, spacing, weight).
 * - `product-ui`: a design-system concern outside a static chart (card, tooltip, hover, dark mode).
 */
export type GapKind = 'expressiveness' | 'chart-spec' | 'realization' | 'visual-quality' | 'product-ui';
export type GapSeverity = 'high' | 'medium' | 'low';

export interface ThemeGap {
  id: string;
  title: string;
  kind: GapKind;
  severity: GapSeverity;
  /** Shared id when the same shortfall recurs across houses; the overview groups by it. */
  probe?: string;
  /** What the guide asks for. */
  rule: string;
  /** What Flint draws today, and why. */
  current: string;
  /** What it should look like. */
  expected: string;
  /** The ThemeSpec or compiler change that would close it. */
  proposal?: string;
  /** Rendered with the house theme: the "current" panel. */
  flint?: ChartAssemblyInput;
  /** Hand-crafted Vega-Lite of what the guide asks for: the "expected" panel. */
  expectedSpec?: Record<string, unknown>;
  /** HTML around the expected chart, for what a chart cannot draw itself: a card, a coloured headline. */
  expectedFrame?: { style?: Record<string, string | number>; headerHtml?: string; footerHtml?: string };
  /** What the reviewer saw comparing the two panels (vision notes). */
  observed?: string;
  /** A theme-improvement stage closed this gap: the house now states it, and the current panel shows the result. */
  addressed?: { stage: string; note: string };
}

export interface StyleGuideTheme {
  id: string;
  org: string;
  research: ResearchRecord;
  /** The closest ThemeSpec the current schema can state. */
  theme: ThemeSpec;
  /** Markdown: how the guide was mapped onto the ThemeSpec, and what could not be. */
  notes: string;
  gaps: ThemeGap[];
  /** Preview cases shown in the gallery; defaults to the shared set. */
  gallery?: string[];
}
