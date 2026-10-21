import { TEST_GENERATORS } from '../src/test-data';
import { THEME_PRESETS } from '../src/core/theme/presets';
import { vlGetTemplateDef } from '../src/vegalite/templates';
import type { ChartAssemblyInput } from '../src/core/types';

/** A generated test case as a compile input, in a theme or none. */
export function generatedInput(testCase: any, theme: string | undefined): ChartAssemblyInput {
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
        chart_spec: { chartType: testCase.chartType, encodings, chartProperties: testCase.chartProperties },
        options: testCase.assembleOptions,
    } as ChartAssemblyInput;
}

/** Every generated case Vega-Lite draws, in no theme and in each preset. */
export function* generatedVegaLiteCases(): Generator<{ section: string; testCase: any; theme: string | undefined; input: ChartAssemblyInput }> {
    for (const [section, generate] of Object.entries(TEST_GENERATORS as Record<string, () => any[]>)) {
        let cases: any[] = [];
        try {
            cases = generate();
        } catch {
            continue;
        }
        for (const testCase of cases) {
            if (!vlGetTemplateDef(testCase.chartType)) continue;
            for (const theme of [undefined, ...Object.keys(THEME_PRESETS)]) {
                yield { section, testCase, theme, input: generatedInput(testCase, theme) };
            }
        }
    }
}
