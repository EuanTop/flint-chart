import { describe, expect, it } from 'vitest';
import { TEST_GENERATORS } from '../src/test-data';
import { THEME_PRESETS } from '../src/core/theme/presets';
import { vlGetTemplateDef } from '../src/vegalite/templates';
import { vegaLiteStages, vegaLiteTitleFits } from '../src/vegalite/assemble';
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
    // Realization applies the plan's title fit; on its own it must reach the same fit from a single
    // view's built spec. A chart of several views is fitted across its planned views instead.
    it('fits every single-view test case and theme as realization would', () => {
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
                        const { planned, own, composite } = vegaLiteTitleFits(input(testCase, theme, title));
                        if (!composite && JSON.stringify(planned) !== JSON.stringify(own)) {
                            mismatches.push(`${section} | ${testCase.title} | ${theme ?? 'none'} | ${title ? title.width : 'untitled'}`);
                        }
                    }
                }
            }
        }
        expect(mismatches).toEqual([]);
    }, 300_000);

    it('lets the title run over keys beside the plot', () => {
        // Institutions down the side, four answers in a key at the right: the title spans the whole
        // drawing, keys and all, rather than breaking over the plot and its labels alone.
        const institutions = ['Small business', 'Scientists', 'The military', 'The police', 'The Supreme Court', 'The press', 'Congress'];
        const answers = ['A great deal', 'Some', 'Not much', 'None at all'];
        const { plan } = vegaLiteStages({
            data: { values: institutions.flatMap((Institution, i) => answers.map((Answer, k) => ({ Institution, Answer, Share: 10 + ((i + k) % 4) * 10 }))) },
            semantic_types: { Institution: 'Category', Answer: 'Category', Share: 'Percentage' },
            chart_spec: {
                chartType: 'Stacked Bar Chart', encodings: { x: 'Share', y: 'Institution', color: 'Answer' }, baseSize: { width: 300, height: 260 },
                title: 'Confidence in America’s public institutions, by trust (% of adults)',
            },
            options: { canvasFit: 'off' },
        } as ChartAssemblyInput);
        const side = (plan.legend.layout?.footprint ?? []).filter((edge) => edge.orient === 'right');
        expect(side.length).toBe(1);
        expect(plan.title!.block).toBeGreaterThan(plan.plot.width * 1.07 + side[0].width);
        expect(plan.title!.headline?.lines).toBeUndefined();
    });
});
