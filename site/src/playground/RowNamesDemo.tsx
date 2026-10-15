/**
 * Names above bars — one design question, every house: where a horizontal bar chart's names stand.
 *
 * Beside the axis is the convention, and it costs a gutter: a long name either takes a third of
 * the chart or is wrapped or cut. Some houses set each name on its own line over its bar instead
 * (Datawrapper's "labels on a separate line"), which gives the names the chart's width and costs
 * height. Flint makes it a theme choice, `labels.rowNames`, laid out by the same stretch as any band:
 * the band takes twice its room, and where the canvas cannot give it the names stand beside.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assembleVegaLite, THEME_PRESETS, type ThemeSpec } from 'flint-chart';
import { loadHouses } from '../shared/house-themes';
import { ScaleToFit } from '../components/ScaleToFit';
import { VegaLiteView } from '../components/VegaLiteView';
import { siteTheme } from '../shared/theme';

type Mode = 'house' | 'beside';
type Names = 'long' | 'short';

const LONG = [
  ['Diseases of heart', 703], ['Malignant neoplasms', 608], ['Unintentional injuries', 227],
  ['Cerebrovascular diseases', 165], ['Chronic lower respiratory diseases', 148], ['Alzheimer disease', 120],
  ['Diabetes mellitus', 102], ['Nephritis, nephrotic syndrome and nephrosis', 58],
  ['Chronic liver disease and cirrhosis', 55], ['Intentional self-harm (suicide)', 49],
] as const;
const SHORT = [
  ['Heart', 703], ['Cancer', 608], ['Injuries', 227], ['Stroke', 165], ['Lungs', 148],
  ['Alzheimer', 120], ['Diabetes', 102], ['Kidney', 58], ['Liver', 55], ['Suicide', 49],
] as const;

const SIZES = [
  { id: 'roomy', label: '300 × 300, ×1.5', base: { width: 300, height: 300 }, stretch: 1.5 },
  { id: 'wide', label: '400 × 300, ×1.5', base: { width: 400, height: 300 }, stretch: 1.5 },
  { id: 'short', label: '300 × 200, ×1.5', base: { width: 300, height: 200 }, stretch: 1.5 },
  { id: 'tile', label: '200 × 200, ×1.2', base: { width: 200, height: 200 }, stretch: 1.2 },
] as const;

/** What each house's guide says, where it sets its names above its bars. */
const HOUSE_NOTES: Record<string, string> = {
  datawrapper: 'Datawrapper\'s "labels on a separate line", meant for long category names; the chart grows downward with the list.',
  metlife: '“Horizontal bar lists: label above each bar”, the bar on a thin grey track, a large percentage right of it.',
  'shopify-polaris': '“Include a label on each bar”: the category name above the bar\'s start, the value inside its end.',
};

/** A theme that sets where its row names stand. */
interface Asking { id: string; label: string; theme: ThemeSpec }

interface Tile {
  id: string;
  label: string;
  spec: any;
  placed: 'above' | 'beside' | 'fallback';
  setting: string;
}

/** Flint's bookkeeping keys are not Vega-Lite's. */
function strip(spec: any): any {
  if (!spec || typeof spec !== 'object') return spec;
  if (Array.isArray(spec)) return spec.map(strip);
  return Object.fromEntries(Object.entries(spec).filter(([key]) => !/^_[^_]/.test(key)).map(([key, value]) => [key, strip(value)]));
}

function compileTile(asking: Asking, mode: Mode, names: Names, size: (typeof SIZES)[number]): Tile {
  const own = (asking.theme as any).labels ?? {};
  const setting = mode === 'house' ? own.rowNames ?? 'beside' : mode;
  const theme = mode === 'house' ? asking.theme : { ...asking.theme, labels: { ...own, rowNames: mode } };
  const rows = (names === 'long' ? LONG : SHORT).map(([Cause, Deaths]) => ({ Cause, 'Deaths (thousands)': Deaths }));
  const spec: any = assembleVegaLite({
    data: { values: rows },
    semantic_types: { Cause: 'Category', 'Deaths (thousands)': 'Quantity' },
    chart_spec: {
      chartType: 'Bar Chart',
      title: 'What Americans die of',
      subtitle: 'Leading causes of death, United States, 2022',
      encodings: { y: 'Cause', x: 'Deaths (thousands)' },
      baseSize: size.base,
      canvasSize: { width: size.base.width * size.stretch, height: size.base.height * size.stretch },
    },
    theme_spec: theme,
  } as any);
  const codes = new Set((spec._theme?.report ?? []).map((note: any) => note.code));
  const placed = codes.has('row-names-above') ? 'above' : codes.has('row-names-beside') ? 'fallback' : 'beside';
  return { id: asking.id, label: asking.label, spec: strip(spec), placed, setting };
}

/** Whether a theme sets its names above its bars, always or where they would not fit beside. */
function asks(theme: ThemeSpec | undefined): boolean {
  const setting = (theme as any)?.labels?.rowNames;
  return setting === 'above' || setting === 'auto';
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly { id: T; label: string }[]; onChange: (next: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: siteTheme.navInactive, minWidth: 92 }}>{label}</span>
      <span style={{ display: 'inline-flex', border: `1px solid ${siteTheme.border}`, borderRadius: 6, overflow: 'hidden' }}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === value}
            onClick={() => onChange(option.id)}
            style={{
              padding: '5px 10px', fontSize: 12, border: 0, cursor: 'pointer',
              background: option.id === value ? siteTheme.text : 'transparent',
              color: option.id === value ? siteTheme.surface : siteTheme.text,
            }}
          >
            {option.label}
          </button>
        ))}
      </span>
    </div>
  );
}

const BADGE: Record<Tile['placed'], { text: string; color: string; background: string }> = {
  above: { text: 'Names above', color: '#0b5d1e', background: '#e3f4e6' },
  beside: { text: 'Names beside', color: siteTheme.navInactive, background: 'rgba(0,0,0,0.05)' },
  fallback: { text: 'Beside — would not fit', color: '#8a5300', background: '#fdf0dc' },
};

export function RowNamesDemo() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('house');
  const [names, setNames] = useState<Names>('long');
  const [sizeId, setSizeId] = useState<(typeof SIZES)[number]['id']>('roomy');
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[0];
  // Only the themes that set their names above their bars: the presets', then the style-guide houses'.
  const [houses, setHouses] = useState<Asking[]>([]);
  useEffect(() => {
    let live = true;
    loadHouses().then((all) => { if (live) setHouses(all.filter((house) => asks(house.theme)).map((house) => ({ id: house.id, label: house.name, theme: house.theme }))); });
    return () => { live = false; };
  }, []);
  const asking = useMemo<Asking[]>(() => [
    ...Object.values(THEME_PRESETS).filter((preset) => asks(preset.spec)).map((preset) => ({ id: preset.id, label: preset.label, theme: preset.spec })),
    ...houses,
  ], [houses]);
  const tiles = useMemo(() => asking.map((entry) => compileTile(entry, mode, names, size)), [asking, mode, names, size]);

  return (
    <>
      <style>{styles}</style>
      <div className="rn-scroll">
        <article className="rn-article">
          <header className="rn-intro">
            <h1>{t('rowNames.title', 'Names above bars')}</h1>
            <p>
              {t('rowNames.lead', 'A horizontal bar chart names its bars down the axis, and a long name costs a gutter: it takes a third of the chart, or it is wrapped, or cut. Some houses set each name on its own line over its bar instead, giving the names the full width of the chart and paying in height.')}
            </p>
            <p>
              {t('rowNames.rule', 'In Flint this is a theme choice, labels.rowNames: beside (the default), above, or auto — above only where, beside, a name would be cut or wrapped. The band holding a name and its bar starts at twice the house band and stretches by the same budget as any band; where the canvas cannot give it that room, the names stand beside as before. It applies to one bar to a band — plain and stacked bars; grouped bars, small multiples and columns keep their names on the axis.')}
            </p>
          </header>

          <section className="rn-houses" aria-labelledby="rn-houses-title">
            <h2 id="rn-houses-title">{t('rowNames.housesTitle', 'Which houses set names above')}</h2>
            <ul>
              {asking.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.label}</strong>
                  <code>{(entry.theme as any).labels?.rowNames}</code>
                  <span>{HOUSE_NOTES[entry.id] ?? ''}</span>
                </li>
              ))}
            </ul>
            <p className="rn-note">
              {t('rowNames.others', 'Every other preset and style-guide house keeps its names beside; any theme can ask for this with labels.rowNames.')}
            </p>
          </section>

          <section aria-labelledby="rn-wall-title">
            <h2 id="rn-wall-title">{t('rowNames.wallTitle', 'One chart, each of these houses')}</h2>
            <div className="rn-controls">
              <Segmented label={t('rowNames.setting', 'Setting')} value={mode} onChange={setMode} options={[
                { id: 'house', label: t('rowNames.asHouse', 'As each house sets it') },
                { id: 'beside', label: t('rowNames.forceBeside', 'Beside, for comparison') },
              ]} />
              <Segmented label={t('rowNames.names', 'Names')} value={names} onChange={setNames} options={[
                { id: 'long', label: t('rowNames.long', 'Long') },
                { id: 'short', label: t('rowNames.short', 'Short') },
              ]} />
              <Segmented label={t('rowNames.size', 'Base and stretch')} value={sizeId} onChange={setSizeId} options={SIZES.map((s) => ({ id: s.id, label: s.label }))} />
            </div>
            <div className="rn-wall">
              {tiles.map((tile) => (
                <figure key={tile.id} className="rn-tile">
                  <figcaption>
                    <strong>{tile.label}</strong>
                    <code>{tile.setting}</code>
                    <span className="rn-badge" style={{ color: BADGE[tile.placed].color, background: BADGE[tile.placed].background }}>
                      {t(`rowNames.badge.${tile.placed}`, BADGE[tile.placed].text)}
                    </span>
                  </figcaption>
                  <div className="rn-chart">
                    <ScaleToFit height={360} minHeight={160} adaptiveHeight padding={4}>
                      <VegaLiteView spec={tile.spec} renderer="svg" />
                    </ScaleToFit>
                  </div>
                </figure>
              ))}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}

const styles = `
  .rn-scroll { flex: 1; min-height: 0; overflow-y: auto; background: ${siteTheme.surface}; }
  .rn-article { max-width: 1180px; margin: 0 auto; padding: 28px 24px 72px; color: ${siteTheme.text}; }
  .rn-intro { max-width: 760px; }
  .rn-intro h1 { font-size: 30px; margin: 4px 0 12px; }
  .rn-intro p { font-size: 15px; line-height: 1.6; margin: 0 0 10px; }
  .rn-houses { margin: 28px 0 8px; max-width: 900px; }
  .rn-houses h2, .rn-article section h2 { font-size: 18px; margin: 0 0 10px; }
  .rn-houses ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
  .rn-houses li { display: grid; grid-template-columns: 150px 70px minmax(0, 1fr); gap: 10px; font-size: 13px; line-height: 1.45; padding: 4px 0; border-bottom: 1px solid ${siteTheme.border}; }
  .rn-houses code, .rn-tile code { font-size: 11.5px; color: ${siteTheme.navInactive}; }
  .rn-note { font-size: 13px; color: ${siteTheme.navInactive}; margin: 10px 0 0; }
  .rn-article section { margin-top: 28px; }
  .rn-controls { display: flex; flex-direction: column; gap: 8px; margin: 4px 0 16px; }
  .rn-wall { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .rn-tile { margin: 0; padding: 10px; border: 1px solid ${siteTheme.border}; border-radius: 6px; background: #fff; min-width: 0; }
  .rn-tile figcaption { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px; }
  .rn-badge { margin-left: auto; font-size: 11px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
  @media (max-width: 980px) { .rn-wall { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) { .rn-wall { grid-template-columns: minmax(0, 1fr); } .rn-houses li { grid-template-columns: 1fr; } }
`;
