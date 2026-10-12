import { describe, expect, it } from 'vitest';
import { TEST_GENERATORS } from '../src/test-data';
import { THEME_PRESETS } from '../src/core/theme/presets';
import { vlGetTemplateDef } from '../src/vegalite/templates';
import { vegaLiteTitleFits } from '../src/vegalite/assemble';
import type { ChartAssemblyInput } from '../src/core/types';

function input(testCase: any, theme: string | undefined, title?: { title: string; subtitle?: string; width: number }): ChartAssemblyInput {
    const names = new Map(testCase.fields.map((field: any) => [field.id, field.name]));
    const encodings: Record<string, any> = {};
    for (const [channel, encoding] of Object.entries<any>(testCase.encodingMap)) {
        const field = names.get(encoding?.fieldID);
        if (field) encodings[channel] = { field, ...(encoding.aggregate ? { aggregate: encoding.aggregate } : {}) };
    }
    const semanticTypes = Object.fromEntries(Object.entries<any>(testCase.metadata).map(([field, meta]) => [field, meta.semanticType]));
    return {
        data: { values: testCase.data },
        semantic_types: semanticTypes,
        ...(theme ? { theme_spec: theme } : {}),
        chart_spec: {
            chartType: testCase.chartType, encodings, chartProperties: testCase.chartProperties,
            ...(title ? { title: title.title, ...(title.subtitle ? { subtitle: title.subtitle } : {}), baseSize: { width: title.width, height: 300 } } : {}),
        },
        options: testCase.assembleOptions,
    } as ChartAssemblyInput;
}

const LONG_TITLE = 'A long headline that will not fit on one line beside a chart this narrow, so a theme has to set it smaller or break it';
const LONG_DECK = 'And a deck under it that runs long enough to wrap onto a second line as well';
const TITLES = [{ title: LONG_TITLE, subtitle: LONG_DECK, width: 320 }, { title: 'Short headline', width: 560 }];
// Headline fit depends on the theme's type sizes; these four span them.
const TITLED_THEMES: Array<string | undefined> = [undefined, 'nyt', 'economist', 'datawrapper'];

describe('title plan', () => {
    // Realization applies the plan's title fit; on its own it must reach the same fit from the built spec.
    it('fits every test case and theme as realization would', () => {
        const mismatches: string[] = [];
        const themes = [undefined, ...Object.keys(THEME_PRESETS)];
        for (const [section, generate] of Object.entries(TEST_GENERATORS as Record<string, () => any[]>)) {
            let cases: any[] = [];
            try {
                cases = generate();
            } catch {
                continue;
            }
            for (const testCase of cases) {
                if (!vlGetTemplateDef(testCase.chartType)) continue;
                for (const theme of themes) {
                    const titled = TITLED_THEMES.includes(theme);
                    for (const title of titled ? [undefined, ...TITLES] : [undefined]) {
                        const { planned, own } = vegaLiteTitleFits(input(testCase, theme, title));
                        if (JSON.stringify(planned) !== JSON.stringify(own)) {
                            mismatches.push(`${section} | ${testCase.title} | ${theme ?? 'none'} | ${title ? title.width : 'untitled'}`);
                        }
                    }
                }
            }
        }
        expect(mismatches).toEqual([]);
    }, 300_000);
});
