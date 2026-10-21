/**
 * The typography cases: each fix adds the charts that show its rule; every case stays in the theme
 * matrix from then on. A case whose fix changed a default is compared against a snapshot of the code
 * taken just before its stage.
 */
import type { ChartAssemblyInput, ThemeSpec } from 'flint-chart';
import airbnb from '../../new-theme-test/themes/airbnb-visx';
import baltimore from '../../new-theme-test/themes/baltimore-storymaps';
import catalyst from '../../new-theme-test/themes/catalyst-california';
import dmn from '../../new-theme-test/themes/dallas-morning-news';
import finastra from '../../new-theme-test/themes/finastra';
import humanManaged from '../../new-theme-test/themes/human-managed';
import metlife from '../../new-theme-test/themes/metlife';
import microsoft from '../../new-theme-test/themes/microsoft';
import minnpost from '../../new-theme-test/themes/minnpost';
import morningstar from '../../new-theme-test/themes/morningstar';
import ons from '../../new-theme-test/themes/ons';
import radx from '../../new-theme-test/themes/radx-up';
import sunlight from '../../new-theme-test/themes/sunlight';
import urban from '../../new-theme-test/themes/urban-institute';
import usaid from '../../new-theme-test/themes/usaid-oha';
import visa from '../../new-theme-test/themes/visa';
import wwf from '../../new-theme-test/themes/wwf';
import { chart, gapChart, preview, type FixCase } from './colour';

const DECK = { subtitle: 'Share of new car sales, 2018–2023' };

/** The same chart with some type roles as the house wrote them before the stage. */
function was(input: ChartAssemblyInput, roles: Record<string, Record<string, unknown>>): { input: ChartAssemblyInput } {
  const theme = input.theme_spec as ThemeSpec;
  const type: Record<string, unknown> = { ...(theme.type ?? {}) };
  for (const [role, patch] of Object.entries(roles)) type[role] = { ...((theme.type as any)?.[role] ?? {}), ...patch };
  return { input: { ...input, theme_spec: { ...theme, type } } as ChartAssemblyInput };
}

function withBefore(c: Omit<FixCase, 'before'>, roles: Record<string, Record<string, unknown>>): FixCase {
  return { ...c, before: was(c.input, roles) };
}

export const TYPE_CASES: FixCase[] = [
  // T1 — every weight and style a role states is drawn.
  {
    id: 't1-catalyst-deck', stage: 't1', theme: 'Catalyst California', before: 'baseline',
    title: 'A bold deck',
    look: 'The theme states `type.deck.weight: "bold"`; the deck was regular because `subtitleFontWeight` was never written.',
    input: gapChart(catalyst, 'deck-weight'),
  },
  {
    id: 't1-ons-deck', stage: 't1', theme: 'ONS', before: 'baseline',
    title: 'A semibold deck',
    look: 'The deck under the headline is semibold, as the theme states.',
    input: preview('ev-share', ons.theme, DECK),
  },
  {
    id: 't1-sunlight-labels', stage: 't1', theme: 'Sunlight Foundation', before: 'baseline',
    title: 'Semibold tick labels',
    look: 'The axis labels take the stated `axisLabel.weight: "semibold"`; before, only the axis title’s weight was passed.',
    input: gapChart(sunlight, 'axis-label-weight'),
  },
  {
    id: 't1-minnpost-key', stage: 't1', theme: 'MinnPost', before: 'baseline',
    title: 'Bold key labels',
    look: 'The key labels are bold (`keyLabel.weight: "bold"`); the legend got the font, size and colour but not the weight.',
    input: gapChart(minnpost, 'key-label-weight'),
  },
  {
    id: 't1-radx-axis-title', stage: 't1', theme: 'RADx-UP', before: 'baseline',
    title: 'Italic axis titles',
    look: 'The axis titles are bold italic (`axisTitle.style: "italic"`); the italic was resolved but never written.',
    input: preview('medals-grouped', radx.theme),
  },
  {
    id: 't1-pop-deck', stage: 't1', theme: 'pop (shipped preset)', before: 'baseline',
    title: 'Pop’s bold deck',
    look: 'The shipped Pop preset states `type.deck.weight: "bold"`; with a subtitle, the deck is now bold. The one shipped preset this stage changes.',
    input: preview('ev-share', 'pop', DECK),
  },
  {
    id: 't1-no-theme-guard', stage: 't1', theme: 'no theme', before: 'baseline', expect: 'same',
    title: 'Guard: a chart without a theme is unchanged',
    look: 'Nothing states a weight or a style, so nothing new is written.',
    input: preview('ev-share', undefined, DECK),
  },

  // T2 — the whole weight scale.
  withBefore({
    id: 't2-visa-light-head', stage: 't2', theme: 'Visa',
    title: 'A light headline',
    look: 'The headline is light (300) in Visa blue; before, the lightest the theme could name was regular.',
    input: preview('ev-share', visa.theme, DECK),
  }, { headline: { weight: 'regular' } }),
  withBefore({
    id: 't2-baltimore-light-head', stage: 't2', theme: 'Baltimore StoryMaps',
    title: 'A thin Montserrat headline',
    look: 'Montserrat Light (300) for the title: the hierarchy comes from size, not weight.',
    input: preview('ev-share', baltimore.theme, DECK),
  }, { headline: { weight: 'regular' } }),
  withBefore({
    id: 't2-urban-black-head', stage: 't2', theme: 'Urban Institute',
    title: 'A black headline',
    look: 'Lato Black (900) for the title; bold (700) was the heaviest the theme could name.',
    input: preview('ev-share', urban.theme, DECK),
  }, { headline: { weight: 'bold' } }),
  withBefore({
    id: 't2-human-managed-light-axis', stage: 't2', theme: 'Human Managed',
    title: 'Light axis text',
    look: 'Axis titles and tick labels in the light weight (300); directly labelled categories stay semibold.',
    input: preview('us-unemployment', humanManaged.theme),
  }, { axisLabel: { weight: 'regular' }, axisTitle: { weight: 'regular' } }),
  withBefore({
    id: 't2-finastra-light-labels', stage: 't2', theme: 'Finastra',
    title: 'Light key and value labels',
    look: 'The key and the values inside the slices are light (300), so they read as quiet annotations.',
    input: gapChart(finastra, 'other-grey'),
  }, { keyLabel: { weight: 'regular' }, valueLabel: { weight: 'regular' } }),
  withBefore({
    id: 't2-airbnb-hairline-ticks', stage: 't2', theme: 'Airbnb visx',
    title: 'Hairline tick labels',
    look: 'Tick labels at 200 against bold axis titles — the XYChart contrast.',
    input: preview('us-unemployment', airbnb.theme),
  }, { axisLabel: { weight: 'regular' } }),
  // T3 — the case a role asks for.
  {
    id: 't3-dmn-caps', stage: 't3', theme: 'Dallas Morning News', before: 'baseline',
    title: 'A headline in capitals',
    look: 'Gotham Condensed capitals, as the theme states; the wider capitals are measured before the headline is fitted.',
    input: preview('ev-share', dmn.theme, DECK),
  },
  {
    id: 't3-wwf-caps', stage: 't3', theme: 'WWF',
    before: 'baseline',
    title: 'WWF’s capital headline',
    look: 'The author wrote sentence case; the house sets the headline in capitals.',
    input: gapChart(wwf, 'caps-headline'),
  },
  {
    id: 't3-usaid-caps', stage: 't3', theme: 'USAID OHA', before: 'baseline',
    title: 'USAID’s capital headline',
    look: 'Bold capitals for the headline; the deck stays as written (`deck.case: "asIs"`).',
    input: gapChart(usaid, 'caps-title'),
  },
  {
    id: 't3-microsoft-deck', stage: 't3', theme: 'Microsoft', before: 'baseline',
    title: 'A deck in capitals',
    look: 'The deck — including the axis title it carries — is set in capitals under a sentence-case headline.',
    input: gapChart(microsoft, 'deck-caps'),
  },
  {
    id: 't3-radx-axis-caps', stage: 't3', theme: 'RADx-UP', before: 'baseline',
    title: 'Bold italic capital axis titles',
    look: 'The axis titles are capitals now (they were already bold italic after T1).',
    input: preview('medals-grouped', radx.theme),
  },
  {
    id: 't3-urban-title', stage: 't3', theme: 'Urban Institute', before: 'baseline',
    title: 'A title-case headline',
    look: 'Each word capitalised, short joining words kept lower-case (“Share of New Car Sales”).',
    input: preview('ev-share', urban.theme, DECK),
  },
  {
    id: 't3-human-managed-sentence', stage: 't3', theme: 'Human Managed', before: 'baseline',
    title: 'Title case for the title, sentence case for the rest',
    look: 'The headline in title case; the deck, axis text and key in sentence case — first letter capitalised, the rest as written.',
    input: preview('electricity-stacked', humanManaged.theme, { title: 'world electricity generation by source', subtitle: 'terawatt-hours, 2000–2020' }),
  },
  {
    id: 't3-pop-caps', stage: 't3', theme: 'pop (shipped preset)', before: 'baseline',
    title: 'Pop’s capital headline',
    look: 'The shipped Pop preset states `headline.case: "upper"`: its headlines are now capitals, fitted as capitals.',
    input: preview('ev-share', 'pop', DECK),
  },
  {
    id: 't3-nature-guard', stage: 't3', theme: 'nature (shipped preset)', before: 'baseline', expect: 'same',
    title: 'Guard: “as written” stays as written',
    look: 'Nature states `case: "asIs"`; nothing changes.',
    input: preview('ev-share', 'nature', DECK),
  },
  // T4 — the roles nothing read.
  {
    id: 't4-metlife-kpi', stage: 't4', theme: 'MetLife', before: 'baseline',
    title: 'The big number in the display role',
    look: 'The KPI’s number takes MetLife’s display face, weight and ink; its size stays the one fitted to the tile.',
    input: preview('renewable-kpi', metlife.theme),
  },
  {
    id: 't4-powerbi-kpi', stage: 't4', theme: 'powerbi (shipped preset)', before: 'baseline',
    title: 'Power BI’s display number',
    look: 'The shipped Power BI preset states a display role; its KPI tiles now use it.',
    input: preview('renewable-kpi', 'powerbi'),
  },
  {
    id: 't4-apple-kpi', stage: 't4', theme: 'apple (shipped preset)', before: 'baseline',
    title: 'Apple’s semibold display number',
    look: 'SF Pro Display, semibold: the shipped Apple preset’s display role on the KPI number.',
    input: preview('renewable-kpi', 'apple'),
  },
  {
    id: 't4-morningstar-annotation', stage: 't4', theme: 'Morningstar (with statistics)', before: 'baseline',
    title: 'A statistic’s note in the annotation role',
    look: 'The R² note takes Morningstar’s annotation type instead of borrowing the axis labels’.',
    input: chart('Regression', Array.from({ length: 16 }, (_, i) => ({ Risk: i, Return: Math.round((2 + 0.6 * i + ((i * 7) % 5) - 2) * 10) / 10 })),
      { Risk: 'Quantity', Return: 'Quantity' }, { x: 'Risk', y: 'Return' },
      { ...morningstar.theme, annotation: { ...(morningstar.theme.annotation ?? {}), statistics: { show: ['r2', 'n'] } }, type: { ...morningstar.theme.type, annotation: { ...morningstar.theme.type?.annotation, style: 'italic', color: '#5C6E77' } } },
      'Return against risk'),
  },
  {
    id: 't4-footnote-guard', stage: 't4', theme: 'MetLife', before: 'baseline', expect: 'same',
    title: 'Guard: the footnote role is reported, not drawn',
    look: 'Flint draws no footnote; the theme report now says so (`role-not-drawn`) and the chart is unchanged.',
    input: preview('ev-share', metlife.theme, DECK),
  },
];
