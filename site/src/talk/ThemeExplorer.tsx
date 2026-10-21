// A small version of the site's themes page for the deck: pick a preset or a style-guide house on
// the left, and eight charts on the right take it on at once.
import { useEffect, useMemo, useState } from 'react';
import { THEME_PRESETS, type ChartAssemblyInput, type ThemeSpec } from 'flint-chart';
import { FlintChart } from 'flint-chart/react';
import { loadHouses, type HouseChoice } from '../shared/house-themes';
import { PREVIEW_CASES } from '../shared/preview-cases';

/** Eight chart types that cover the mark vocabulary, as on the themes page. */
const CASE_IDS = ['life-expectancy', 'gapminder-bubble', 'population-waterfall', 'browser-pie', 'temp-heatmap', 'co2-lollipop', 'electricity-mix-area', 'big-mac'];
const CASES = CASE_IDS.map((id) => PREVIEW_CASES.find((c) => c.id === id)).filter((c) => c !== undefined);

const PRESET_IDS = ['economist', 'nyt', 'datawrapper', 'swiss', 'nature', 'mckinsey', 'bbc', 'pop', 'cartoon', 'de-stijl'];
const HOUSE_COUNT = 8;

type Choice = { key: string; label: string; theme: string | ThemeSpec };

function input(c: (typeof CASES)[number], theme: string | ThemeSpec): ChartAssemblyInput {
  return {
    data: { values: c.data },
    semantic_types: c.semantic_types,
    chart_spec: { chartType: c.chartType, encodings: c.encodings, title: c.title, ...(c.chartProperties ? { chartProperties: c.chartProperties } : {}) },
    theme_spec: theme,
  } as ChartAssemblyInput;
}

export function ThemeExplorer() {
  const [houses, setHouses] = useState<HouseChoice[]>([]);
  useEffect(() => { void loadHouses().then((all) => setHouses(all.slice(0, HOUSE_COUNT))); }, []);
  const presets: Choice[] = useMemo(() => PRESET_IDS
    .filter((id) => id in THEME_PRESETS)
    .map((id) => ({ key: id, label: (THEME_PRESETS as Record<string, { label: string }>)[id].label, theme: id })), []);
  const houseChoices: Choice[] = houses.map((h) => ({ key: `house:${h.id}`, label: h.name, theme: h.theme }));
  const [key, setKey] = useState('economist');
  const current = [...presets, ...houseChoices].find((c) => c.key === key) ?? presets[0];

  const group = (title: string, choices: Choice[]) => (
    <div className="talk-themes-group">
      <p>{title}</p>
      <div className="talk-themes-chips">
        {choices.map((c) => (
          <button key={c.key} type="button" aria-pressed={c.key === current.key} onClick={() => setKey(c.key)}>{c.label}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="talk-themes">
      <div className="talk-themes-picker">
        {group('Presets', presets)}
        {group('From style guides', houseChoices)}
      </div>
      <div className="talk-themes-wall">
        {CASES.map((c, i) => (
          <div key={c.id} className="talk-themes-card" style={{
            left: `${(i % 4) * 23.6}%`, top: `${Math.floor(i / 4) * 46}%`,
            transform: `rotate(${((i % 3) - 1) * 1.2}deg)`, zIndex: i + 1,
          }}>
            <FlintChart spec={input(c, current.theme)} renderer="svg" width="100%" height="100%" fit="relayout" />
          </div>
        ))}
      </div>
    </div>
  );
}
