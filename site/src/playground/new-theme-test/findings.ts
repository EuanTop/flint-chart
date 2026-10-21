/**
 * Cross-house findings, written once every house has been examined, and one line per recurring gap:
 * what the ThemeSpec, the chart spec or the compiler is missing. The overview groups gaps by probe id.
 */
export const FINDINGS = `
**Scope.** 69 style guides from datavizstyleguide.com/examples (79 entries; duplicates merged — BBC ×2, GitLab ×2, IBM ×2, Urban ×2, Trafford ×2, the Economist chart + map guides, the two Storymaps links — and three link collections set aside). 44 were read in full, 22 in part, 3 not at all (DHL, Finastra, Mailchimp — built from secondary sources and said so). 37 are product design systems, 10 government, 8 report, 6 editorial, 4 brand, 4 academic. Every house has a closest-possible ThemeSpec, the standard gallery under it, and 6–10 gaps: **601 gaps**, 456 with Flint and a hand-crafted Vega-Lite of the guide side by side, every one reviewed from screenshots. With chart annotations deferred (below), **550 gaps** remain in scope, 409 with both panels.

**By kind, in scope:** 206 the ThemeSpec cannot state · 43 need content the chart spec has no slot for · 113 stated but not drawn as stated (Flint bugs) · 101 drawn as stated but visibly off · 87 product-UI concerns outside a static chart. The **Issues** tab groups them into families with representative examples.

### 1. Deferred: chart annotations
Emphasising one category against grey (\`highlight\`, 30 houses), written callouts on the chart (\`annotation\`, 15) and series named by coloured words in the headline (\`in-text-legend\`, 6) are **annotations of a particular chart**, authored per chart rather than per house. They belong to an annotation layer built separately, so their 51 gaps are set aside: they are kept on each house tab under “Deferred”, but they are left out of the counts and issues here. The theme's part in them — which ink emphasis takes, which grey context takes, how a callout is set — will come back when that layer exists.

### 1b. The chart spec is missing its furniture
Nearly every editorial, government and report guide closes a chart with a **source line** (23 houses filed it; most signature cards show it missing too); many add notes, a figure number (5) or a wordmark (9). This is content the author gives and the theme places, and the chart spec has only \`title\` and \`subtitle\`. Proposal: \`chart_spec.source\`, \`notes[]\`, \`label\` (figure/kicker), and a semantic marker for estimated rows; the theme then states how each is drawn (\`type.footnote\`, a footer layout, \`annotation.forecast\`).

### 2. Colour is one ordered list; houses describe a colour *system*
- **Count-specific palettes** (17): IBM, Urban, Dell and others publish a set for 2, 3, 4… series.
- **Per-mark palettes** (13): the Economist's scatter order differs from its bars; lines need darker inks than bars.
- **Colour bound to a value** (6): Refugees always blue, a party colour, "Other" always grey.
- **Status beyond three slots, with polarity** (8): severity scales, "a rise in cost is bad" (IBCS, Opower).
- **Text variants of series inks** (13): end labels in a light series hue are unreadable; guides give a darker text ink.
- **Hue families, patterns** (8), **gradients** (5), **dark mode** (25 — one ThemeSpec holds one surface; \`variants\` may not change ink).
Proposal: \`ink.series.categoricalByCount\`, \`geometry.<kind>.palette\`, \`ink.series.byValue\`, \`ink.modes: { light, dark }\`, \`ink.series.textVariant\`, \`marks.pattern\`.

### 3. Product design systems need the chart as a component
37 houses are design systems. Their charts live in **cards** (19), with **tooltips** in house paint (22), **hover/focus** rules such as "dim the rest to 40%" (14), keys with checkboxes or values, and dark mode. ThemeSpec stops at the chart's edge and has \`tooltipFormat\` only. Proposal: a \`container\` block (border, radius, shadow, padding, header slot), \`interaction.tooltip\` paint, \`interaction.focus\`.

### 4. Axis and label rules the vocabulary cannot say
Tick labels that sit **on their gridline** inside the plot (Economist, London, Polaris, Morningstar), labels **left-aligned to the block edge** (Urban), **abbreviated years** and two-row time axes (15), **number formats** — k/M/B, currency, locale decimals (19), **units** on the top tick only. And the label plan itself: **26 houses** saw tick labels turned, shrunk below \`type.minSize\`, truncated or colliding although the theme says \`labels.angle: "horizontal"\` — the theme has no way to ask for thinning, wrapping or flipping the bars instead.

### 5. Type is close, with holes
Weights stop at bold (13 houses need 900 or 200–300); \`case\` is accepted but never drawn (6); house fonts cannot be loaded from the theme (no \`@font-face\` source); axis/key label weight, deck weight and italic axis titles are stated but never written.

### 6. Flint realisation bugs (stated, not drawn) — see the table below
The most widespread: the label plan overriding \`labels.angle\`; \`legend.placement\` falling back to positions the house never listed; \`numberFormat\` never reaching axis ticks; \`geometry.area.edge\` folded into a global outline (outlines leak onto bars and dots while areas lose their edge); \`band.opacity\` and \`marks.trailingFill\` never drawn; \`structure.baseline\` never drawn; an exhausted palette silently replaced by Vega's defaults; \`axisTitles: "omit"\` restating a measure the deck already names; the \`headerRule\` drawn under the title block.

### 7. Presets drift from their guides
The shipped \`economist\` preset prints units on every tick against the guide's bare numbers; the \`apple\` preset is missing the seventh system colour and centres its key.

### Priorities
1. Chart-spec furniture: source/notes/figure label and an estimate marker (emphasis and annotations wait for the annotation layer).
2. Fix the realisation bugs in the table — many houses look wrong for reasons the theme already states.
3. A colour system: per-count, per-mark, by-value, light/dark modes, text variants.
4. A label policy the theme can steer (thin / wrap / flip / never turn) and number/date formats that reach the axes.
5. A component layer for design systems (container, tooltip, focus).
`;

/** Flint bugs found while mapping the houses: stated in the theme (or obvious) but not drawn as stated. */
export const FLINT_BUGS: {
  id: string; summary: string; houses: number; issue: string;
  /** The theme-improvement stage that fixed it, and what it left, if anything. */
  fixed?: { stage: string; partly?: string };
}[] = [
  { id: 'label-angle-overridden', summary: '`labels.angle: "horizontal"` is overridden: crowded x labels turned −45°/−90°, heatmap row labels turned, labels shrunk below `type.minSize` instead of thinned', houses: 26, issue: 'tick-label-fit', fixed: { stage: 'A1', partly: 'names stay flat down to the floor before they turn; crowded rulers still shrink, and thinning is not a house option yet (eBay, Datadog)' } },
  { id: 'legend-placement-fallback', summary: '`legend.placement` falls back to positions the house never listed (key goes right on stacked bars, areas, pies, dash keys); `legend.title: "omit"` ignored on dash keys; `legend.align` ignored at bottom', houses: 9, issue: 'legend-placement' },
  { id: 'number-format-axes', summary: '`annotation.numberFormat` (thousands suffix, none) never reaches axis ticks; on labels the suffix is d3 SI (“1.30G”), separators missing (“1429”)', houses: 10, issue: 'number-format', fixed: { stage: 'A6', partly: 'a house reaches its axes by stating `compact`; `thousands: "suffix"` alone stays on value labels. Labels write B, not G, and keep their separators' } },
  { id: 'axis-title-restated', summary: '`annotation.axisTitles: "omit"` appends the measure to a deck that already names it (“…, %; Unemployment (%)”, “.; Population (m)”, doubled units)', houses: 10, issue: 'axis-title-relocation', fixed: { stage: 'A4' } },
  { id: 'area-edge-outline', summary: '`geometry.area.edge` is folded into the global `marks.outline` (ground.ts): bars, wedges and dots get outlines, stacked areas lose their edge line', houses: 7, issue: 'fill-and-outline' , fixed: { stage: 'M1' } },
  { id: 'palette-exhausted', summary: 'With more series than the house palette and no overflow ink, the whole house palette is replaced by Vega-Lite defaults, unreported', houses: 6, issue: 'palette-structure', fixed: { stage: 'R1' } },
  { id: 'type-case', summary: '`TypeRole.case` is accepted but never read — upper-case headlines and axis titles stay as typed', houses: 6, issue: 'type-case', fixed: { stage: 'T3' } },
  { id: 'band-opacity', summary: '`geometry.band.opacity` lands in `marks.fillOpacity`, written only to areas — bars stay opaque; `band.cornerRadius` also rounds donut wedges', houses: 4, issue: 'fill-and-outline' , fixed: { stage: 'M2', partly: 'bar opacity fixed; band.cornerRadius still reaches config.arc, which only matters on a chart drawing both bars and wedges' } },
  { id: 'baseline', summary: '`structure.baseline` is grounded but no realiser draws it; the zero rule appears only when data crosses zero, is skipped when zero is the axis bottom, and is drawn at the bottom when the axis does not start at zero', houses: 5, issue: 'zero-line', fixed: { stage: 'A7', partly: 'the stated baseline is drawn — at zero inside the domain, else along the floor the chart chose; a zero-only policy (London) and a separate weight or ink are not' } },
  { id: 'scatter-grid', summary: '`grid.category` / `grid.measure: "omit"` ignored on scatter and regression charts (log x)', houses: 4, issue: 'gridline-style', fixed: { stage: 'GR1' } },
  { id: 'grouped-slivers', summary: '`bandFraction` applied inside each group as well as to the group — grouped bars become slivers', houses: 3, issue: 'bar-shape' , fixed: { stage: 'G1' } },
  { id: 'label-weights', summary: 'Axis/key label weight, deck weight (`subtitleFontWeight`) and axis-title italic (`titleFontStyle`) are never written', houses: 6, issue: 'type-weight-scale', fixed: { stage: 'T1' } },
  { id: 'orphan-axis-title', summary: 'When printed values suppress the value axis, its title (and sometimes the grid) stays behind', houses: 5, issue: 'labels-replace-axis', fixed: { stage: 'L6', partly: 'the title moves to the deck or goes; RSS’s gridlines when the labels are drawn are still open' } },
  { id: 'pie-order', summary: 'Pie/donut wedges stacked alphabetically while the key keeps data order; dash/shape scales alphabetical while colour follows data', houses: 5, issue: 'pie-rules' , fixed: { stage: 'M3' } },
  { id: 'status-signed', summary: '`selection.signed: "status"` ignored for a single signed measure without a colour field — negative bars stay in the single ink', houses: 4, issue: 'status-colors', fixed: { stage: 'R2' } },
  { id: 'series-label-ink', summary: 'Series-end and point labels take the series fill as text ink — yellow/cyan/pale greys unreadable; `contrastWithMark` picks white on orange', houses: 6, issue: 'text-ink-contrast', fixed: { stage: 'R4' } },
  { id: 'points', summary: 'Line markers: hollow points vanish (white outline, no fill), single-series dots take Vega blue `#4c78a8`, `presence: full` dropped past 12 readings, not drawn on areas', houses: 4, issue: 'point-visibility', fixed: { stage: 'R3', partly: 'dot ink and hollow rings fixed; dots dropped past 12 readings and dots on areas are still open' } },
  { id: 'header-rule', summary: '`furniture.headerRule` drawn under the title block at plot width, not across the chart top', houses: 3, issue: 'brand-rule', fixed: { stage: 'F1' } },
  { id: 'trailing-fill', summary: '`marks.trailingFill` never drawn', houses: 1, issue: 'fill-and-outline' },
  { id: 'texture', summary: '`marks.redundantChannels: ["texture"]` accepted but reported unrealisable and dropped', houses: 2, issue: 'pattern-fill', fixed: { stage: 'R13' } },
  { id: 'sort-lost', summary: 'An explicit value sort is dropped once a theme adds a value-label layer (Vega-Lite cannot union `sum`-sorted domains)', houses: 1, issue: 'ordering' },
  { id: 'narrow-plot', summary: 'Without `layout.bandStepFit`, few categories collapse the plot to 90–150px', houses: 4, issue: 'bar-shape' },
  { id: 'y-title-key', summary: 'A flat y title floats far above the plot or collides with a key placed above it', houses: 3, issue: 'axis-title-relocation', fixed: { stage: 'A2', partly: 'a top key now clears a flat title; a title floating far above the plot is not addressed' } },
  { id: 'type-scale', summary: 'Stated type sizes drift: titles grow with canvas width (24px vs 20), ticks shrink to 7–9px on long series', houses: 4, issue: 'tick-label-fit' },
  { id: 'dates', summary: 'Month fields re-sorted Jan–Dec (fiscal years lost), uncommon weekday abbreviations mis-sorted, daily ticks unevenly spaced, time tick text truncated', houses: 4, issue: 'date-label-format' },
  { id: 'variant-guard', summary: '`canvasWidth` variant guard is compared against the plot width, not the canvas', houses: 1, issue: 'responsive' },
];

export const PROBES: Record<string, string> = {
  signature: 'The house look overall: the guide’s own specimen redrawn by hand next to Flint with the closest theme.',
  'source-line': 'No chart-spec slot for a source, notes or credit line, and no theme rule for where and how it sits (lead-in word, alignment, size).',
  'brand-mark': 'No furniture kind for a logo, wordmark or tagline anchored to a corner of the chart.',
  'brand-rule': 'Header/footer rules and tabs: the kinds exist, but their placement (chart top edge vs under the title) cannot be stated and is drawn in one place.',
  highlight: 'No way to say “this category is the subject”: an emphasis ink plus a context grey for everything else.',
  'count-palette': 'Palettes prescribed per series count (2, 3, 4… series each get their own set) — ThemeSpec has one ordered list.',
  'per-mark-palette': 'Palette, opacity or order specific to a mark family (scatter dots vs bars) — ThemeSpec has one categorical sequence for all marks.',
  'in-text-legend': 'Series named by coloured words in the headline or deck instead of a key.',
  'card-container': 'The chart as a product-UI card: container border, radius, shadow, padding, header with actions.',
  'tooltip-style': 'Tooltip paint and layout (dark/inverse panels, swatches, values bold) — ThemeSpec only has a format string.',
  'focus-hover-state': 'Hover/focus/selection states the guide prescribes (dim others to 40%, focus ring).',
  'dark-mode': 'Paired light/dark token sets switched by context — ThemeSpec states one surface.',
  annotation: 'No chart-spec slot for written callouts, and no theme rule for their ink, leader lines or type.',
  'forecast-style': 'Projected/estimated values drawn in a house style (dashed, hatched, lighter, shaded band with label) — no semantic marker for estimates.',
  'labels-above-bars': 'Category names placed above horizontal bars instead of beside them.',
  'labels-replace-axis': 'When values are printed on the marks, the value axis and its grid should go — conditional on the labels being drawn.',
  'value-label-placement': 'Where value labels sit (inside the bar start/end, outside, above) and in what ink.',
  'axis-label-on-gridline': 'Value labels drawn on top of their gridlines inside the plot rather than beside the axis.',
  'axis-label-alignment': 'Tick-label alignment relative to the plot vs the chart block edge.',
  'axis-title-relocation': 'Where axis titles go, and the deck repeating a measure the author already named.',
  'date-label-format': 'House rules for date ticks (abbreviated years, month/year two-row axes).',
  'number-format': 'House number formats: abbreviations (k/M/B), currency, decimals, signs.',
  'unit-placement': 'Where units are written: top tick only, deck, axis title, every tick.',
  'figure-number': 'No slot for a figure number or kicker above the title.',
  'type-weight-scale': 'Type weights beyond regular/medium/semibold/bold (e.g. black 900, light 300).',
  'type-case': 'Case rules (ALL CAPS titles, sentence case) and letter-spacing.',
  'font-source': 'Fonts named by the house but not loadable from the theme (no @font-face source).',
  'pie-rules': 'Pie/donut ordering, start angle, slice limits, labels and centre totals.',
  'gridline-style': 'Gridline style or extent the house prescribes that the theme cannot state.',
  'zero-line': 'A distinct zero/baseline rule.',
  'bar-shape': 'Bar geometry: width in px, gaps, corner radius on both ends, outlines, tinted fills with borders.',
  'legend-swatch': 'Key symbol shape (line, circle, square) the house prescribes.',
  'legend-placement': 'Key position, alignment or layout the theme cannot state or Flint does not honour.',
  'pattern-fill': 'Patterns or textures for accessibility (hatching) — no fill-pattern vocabulary.',
  'gradient-fill': 'Gradient fills under lines/areas.',
  'chart-type-policy': 'Chart-type rules (avoid pies over N slices, no dual axes) a theme could enforce or report.',
  'sort-lost-with-labels': 'An explicit value sort dropped once a theme’s value-label layer is added.',
  'turned-row-labels': 'Category labels on a vertical axis turned diagonally.',
  'title-wrapping': 'Headline and deck wrapping/breaking rules.',
  'small-multiples': 'Small-multiple panel rules (headers, shared axes, spacing).',
  'scenario-notation': 'Notation for scenarios (actual/plan/forecast/previous year) as a visual grammar — IBCS.',
};

/** Probe ids the houses coined for the same shortfall, folded onto one name for the overview. */
export const PROBE_ALIASES: Record<string, string> = {
  'label-angle': 'tick-label-fit', 'label-angle-fallback': 'tick-label-fit', 'rotated-labels': 'tick-label-fit',
  'turned-labels': 'tick-label-fit', 'turned-row-labels': 'tick-label-fit', 'label-collision': 'tick-label-fit',
  'label-thinning': 'tick-label-fit', 'label-truncation': 'tick-label-fit', 'label-shrink': 'tick-label-fit',
  'type-size-override': 'tick-label-fit',
  'per-category-ink': 'category-color-binding', 'fixed-category-colors': 'category-color-binding',
  'semantic-category-color': 'category-color-binding', 'semantic-category-colors': 'category-color-binding',
  'reserved-category-ink': 'category-color-binding', 'subject-palette': 'category-color-binding',
  'status-palette': 'status-colors', 'signed-color': 'status-colors', 'signed-ink': 'status-colors',
  'status-polarity': 'status-colors',
  'series-text-ink': 'text-ink-contrast', 'series-label-contrast': 'text-ink-contrast', 'label-ink-contrast': 'text-ink-contrast',
  'palette-surface-contrast': 'text-ink-contrast', 'series-ink-variants': 'text-ink-contrast', 'paired-ink': 'text-ink-contrast',
  'area-edge': 'fill-and-outline', 'area-fill': 'fill-and-outline', 'mark-outline': 'fill-and-outline',
  'zero-baseline': 'zero-line',
  'surface-swap': 'dark-mode', 'palette-themes': 'dark-mode',
  'responsive-scale': 'responsive', 'responsive-variant': 'responsive',
  'accessible-table': 'accessible-alternatives', 'data-table': 'accessible-alternatives', 'alt-text': 'accessible-alternatives',
  'accessibility-default': 'accessible-alternatives',
  'headline-emphasis': 'title-block', 'title-emphasis': 'title-block', 'structured-title': 'title-block',
  'title-block-alignment': 'title-block', 'title-wrapping': 'title-block',
  'flat-title-overlap': 'axis-title-relocation', 'axis-title-alignment': 'axis-title-relocation',
  'line-dash-redundancy': 'redundant-encoding', 'marker-shape': 'redundant-encoding',
  'entry-animation': 'motion',
  'axis-from-zero': 'domain-policy', 'measure-domain': 'domain-policy', 'axis-headroom': 'domain-policy', 'ramp-domain': 'domain-policy',
  'legend-values': 'legend-content', 'legend-box': 'legend-content', 'legend-order': 'legend-content',
  'single-series-key': 'legend-content', 'legend-suppression': 'legend-content',
  'donut-centre-value': 'pie-rules', 'donut-thickness': 'pie-rules',
  'monochrome-palette': 'palette-structure', 'hue-family-order': 'palette-structure', 'palette-rotation': 'palette-structure',
  'named-palettes': 'palette-structure', 'ordinal-series-ramp': 'palette-structure',
  'plot-fill': 'plot-surface-layout', 'plot-frame': 'plot-surface-layout', 'layout-padding': 'plot-surface-layout',
  'plot-aspect': 'plot-surface-layout',
  'variance-tiers': 'scenario-notation', 'signed-ramp': 'status-colors', 'status-palette-steps': 'status-colors',
  'sort-policy': 'ordering', 'residual-last': 'ordering', 'sort-lost-with-labels': 'ordering',
  'label-chip': 'value-label-placement',
  'axis-placement': 'axis-structure', 'axis-line-style': 'axis-structure',
};

Object.assign(PROBES, {
  'tick-label-fit': 'Tick labels turned, shrunk below the stated size, truncated or collided, although the theme says `labels.angle: horizontal` — Flint has no thinning or flipping strategy the theme can ask for.',
  'category-color-binding': 'A colour tied to a category value (Refugees always blue, a party colour, “Other” always grey) — ThemeSpec colours by position only.',
  'status-colors': 'Good/bad, positive/negative or severity colours: more than three status slots, polarity (a rise can be bad), and single-measure charts coloured by sign.',
  'text-ink-contrast': 'Text drawn in a series colour (end labels, keys) needs a darker text variant; light hues become unreadable on the surface.',
  'fill-and-outline': 'Area edges, tinted fills with borders and mark outlines — stated, but folded into one global outline or never drawn.',
  responsive: 'Rules that change with the container (phone vs desktop) and type that scales with width.',
  'accessible-alternatives': 'Data table, alt text and screen-reader alternatives that travel with the chart.',
  'title-block': 'Headline structure: emphasised words, structured message titles, alignment to the plot or block.',
  'redundant-encoding': 'Dash and marker shapes paired with each colour in a fixed order.',
  motion: 'Entry animation and transitions.',
  'domain-policy': 'House rules for the value domain: always from zero, headroom, ramp domains for signed data.',
  'legend-content': 'What a key contains: values, box, order, a heading, whether a single series gets one.',
  'palette-structure': 'Palettes with structure: hue families with shades, rotations, named sets, monochrome ramps for ordered series.',
  'plot-surface-layout': 'Plot fill, frame, padding and aspect the house prescribes.',
  ordering: 'Category and series order policies (largest first, residual last) and sorts that are lost.',
  'axis-structure': 'Axis placement per orientation and axis-line styling.',
  'missing-data': 'How gaps in the data are shown (bridged dashed, hatched, labelled).',
  'point-visibility': 'Markers on lines: presence, size and visibility.',
  'preset-drift': 'A shipped preset disagrees with the published guide it is named after.',
  'office-theme-import': 'Importing a corporate Office theme as the palette.',
});

/**
 * Where an issue stands in the plan, beyond the stages: `skip` — not being worked on now; `later` —
 * to be fixed together with another piece of work. Its gaps stay listed and counted.
 */
export const ISSUE_STATUS: Record<string, { status: 'skip' | 'later'; note: string }> = {
  'legend-content': { status: 'skip', note: 'What a key contains is not under consideration now.' },
  'legend-swatch': { status: 'skip', note: 'Key symbol shapes are not under consideration now.' },
  // Data semantics, product UI and the overall house look are not under consideration now.
  ...Object.fromEntries([
    'forecast-style', 'scenario-notation', 'missing-data', 'ordering', 'chart-type-policy', 'small-multiples',
    'card-container', 'tooltip-style', 'focus-hover-state', 'responsive', 'motion', 'accessible-alternatives',
    'signature', 'preset-drift',
  ].map((issue) => [issue, { status: 'skip' as const, note: 'Not under consideration now.' }])),
  ...Object.fromEntries([
    'date-label-format', 'axis-label-on-gridline', 'domain-policy', 'unit-placement', 'axis-label-alignment',
  ].map((issue) => [issue, { status: 'skip' as const, note: 'Not under consideration now.' }])),
  'legend-placement': { status: 'later', note: 'A placement the house lists (bottom among them) should be a preference the layout weighs, not a position forced or silently dropped — to be fixed with the layout work.' },
};

/** Probes that annotate one chart rather than describe a house; set aside for the annotation layer. */
export const DEFERRED_PROBES = new Set(['highlight', 'annotation', 'in-text-legend']);

export const canonicalProbe = (probe: string | undefined): string => {
  const raw = probe ?? 'other';
  return PROBE_ALIASES[raw] ?? raw;
};

export interface IssueFamily {
  id: string;
  label: string;
  /** The principle a fix for this family should follow, not a list of patches. */
  principle: string;
  issues: string[];
}

/** Every in-scope issue, grouped by the part of the system a principled fix would change. */
export const ISSUE_FAMILIES: IssueFamily[] = [
  {
    id: 'colour',
    label: 'Colour system',
    principle: 'Houses describe colour as roles and rules, not one ordered list: a set per series count, per mark family, bound to a value, statuses with polarity, a text variant of each ink, a light and a dark mode. The fix is a colour *model* the compiler resolves per chart (count, mark, semantics, surface) — and reports when it falls back — rather than more lists.',
    issues: ['count-palette', 'per-mark-palette', 'category-color-binding', 'status-colors', 'text-ink-contrast', 'palette-structure', 'dark-mode', 'pattern-fill', 'gradient-fill', 'office-theme-import'],
  },
  {
    id: 'type',
    label: 'Typography',
    principle: 'Every TypeRole field should either be realised or rejected: weight on a 100–900 scale, case, italic, and a font source the host can load. Today several fields are accepted and silently dropped.',
    issues: ['type-weight-scale', 'type-case', 'font-source'],
  },
  {
    id: 'axes',
    label: 'Axes, ticks and labels',
    principle: 'Two layers are mixed up. The *label policy* (never turn, thin first, wrap, flip the bars) is a house decision the plan must honour or report; the *formats* (k/M/B, currency, locale, abbreviated years, unit on the top tick) must reach every place a number is printed — ticks, labels, tooltips — from one source.',
    issues: ['tick-label-fit', 'number-format', 'date-label-format', 'unit-placement', 'axis-label-on-gridline', 'axis-label-alignment', 'axis-title-relocation', 'axis-structure', 'zero-line', 'gridline-style', 'domain-policy'],
  },
  {
    id: 'values',
    label: 'Value labels',
    principle: 'Printed values are a replacement for a ruler, so their placement (start, end, inside, outside, above) and what they remove (axis, grid, axis title) should be one decision, not three independent switches.',
    issues: ['labels-replace-axis', 'value-label-placement', 'labels-above-bars'],
  },
  {
    id: 'legend',
    label: 'Legend',
    principle: 'The placement list is the house’s whole permission set: a key never lands somewhere unlisted (fall back down the list, then report). Swatch shape and contents follow the mark (line, circle, square) unless the house says otherwise.',
    issues: ['legend-placement', 'legend-swatch', 'legend-content'],
  },
  {
    id: 'marks',
    label: 'Mark geometry',
    principle: 'Geometry is per mark family and must not leak between families: an area’s edge is not a bar’s outline, a band’s opacity is not an area’s, a group’s band fraction is not each bar’s. Fixed sizes (10px bars, 2px gaps) need a px option beside fractions.',
    issues: ['bar-shape', 'fill-and-outline', 'point-visibility', 'pie-rules', 'redundant-encoding'],
  },
  {
    id: 'furniture',
    label: 'Chart furniture',
    principle: 'Furniture is content plus placement: the chart spec carries the words (source, notes, figure label), the theme places them (footer layout, lead-in, alignment, wordmark corner, rule edge).',
    issues: ['source-line', 'brand-mark', 'brand-rule', 'figure-number', 'title-block', 'plot-surface-layout'],
  },
  {
    id: 'semantics',
    label: 'Data semantics',
    principle: 'Some rules depend on what rows mean — estimated vs actual, plan vs previous year, missing, residual — which the chart spec cannot yet say. Mark the meaning in the data; let the theme state the notation.',
    issues: ['forecast-style', 'scenario-notation', 'missing-data', 'ordering', 'chart-type-policy', 'small-multiples'],
  },
  {
    id: 'product',
    label: 'Product UI',
    principle: 'Design systems ship the chart as a component. Container, tooltip paint, focus/hover and responsive rules are a separate block from the static theme, consumed by the interactive surface rather than the compiler.',
    issues: ['card-container', 'tooltip-style', 'focus-hover-state', 'responsive', 'motion', 'accessible-alternatives'],
  },
  {
    id: 'house',
    label: 'House look and presets',
    principle: 'The overall comparison per house, and shipped presets that drift from the guides they are named after.',
    issues: ['signature', 'preset-drift'],
  },
];

/**
 * Hand-picked examples for an issue, as `houseId:gapId`, ahead of the automatic choice. The automatic
 * choice prefers gaps with both panels, higher severity, a written observation, and — where Flint has
 * a bug for the issue — a realisation gap.
 */
export const REPRESENTATIVES: Record<string, string[]> = {
  'axis-label-on-gridline': ['economist:labels-on-gridlines', 'london-city-intelligence:labels-on-gridlines', 'morningstar:label-column'],
  'date-label-format': ['economist:year-abbreviation'],
  'brand-rule': ['economist:top-rule'],
  ordering: ['economist:sort-lost-with-labels'],
  'axis-title-relocation': ['economist:measure-restated'],
};
