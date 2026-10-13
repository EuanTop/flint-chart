# 扩展图表模板

当后端已存在、你想为其添加另一种图表类型时使用本指南。若要添加新的渲染目标，请从 [Extending backends](/documentation/adding-a-backend) 开始。

---

## 目录

- [§1 选择图表名称与通道](#1-选择图表名称与通道)
- [§2 编写模板](#2-编写模板)
- [§3 描述模板所画的内容](#3-描述模板所画的内容)
- [§4 组合多个视图](#4-组合多个视图)
- [§5 注册模板](#5-注册模板)
- [§6 添加测试数据并通过计划测试](#6-添加测试数据并通过计划测试)
- [§7 接入站点、文档与 agent skill](#7-接入站点文档与-agent-skill)
- [§8 跨后端对等](#8-跨后端对等)
- [§9 相关文档](#9-相关文档)

---

# §1 选择图表名称与通道

公开标识是 `ChartTemplateDef` 上的 **`chart` 字符串**。它必须与 `chart_spec.chartType` 完全一致，例如 `"Scatter Plot"`。

只选择标记实际使用的通道。以相似模板为起点复制：

| 族 | Vega-Lite 参考 |
|---|---|
| Scatter / point | `vegalite/templates/scatter.ts` |
| Bar / column | `vegalite/templates/bar.ts` |
| Line / area | `vegalite/templates/line.ts`、`area.ts`、`range-area.ts` |
| Distribution | `vegalite/templates/density.ts`、`violin.ts` |
| Radial | `vegalite/templates/pie.ts` |
| 多视图 | `vegalite/templates/bar-table.ts`、`marginal.ts` |

作为现有图表变体的新图表，外观应与原图表一致。复用同族模板的 mark 定义与属性（从其文件导出），或在自己 spec 的某个单元上调用同族模板的 `instantiate`，让主题与读者看到同一个家族。Ridgeline Plot 按 Range Area Chart 的方式画带；Marginal Plot 按轴类型用 Scatter Plot、Strip Plot 或 Heatmap 的 `instantiate` 画主图，用 Density Plot、Histogram、Boxplot 或 Bar Chart 的画边缘分布。

ECharts、Chart.js 与 Plotly 在各自的 `templates/` 目录下使用相同的 `ChartTemplateDef` 接口。

---

# §2 编写模板

`ChartTemplateDef` 位于 `packages/flint-js/src/core/types.ts`。

```typescript
import { ChartTemplateDef } from '../../core/types';
import { defaultBuildEncodings } from './utils';

export const dotPlotDef: ChartTemplateDef = {
    chart: 'Dot Plot',
    template: { mark: 'circle', encoding: {} },
    channels: ['x', 'y', 'color', 'size', 'column', 'row'],
    interactionSupport: {
        elements: true,            // 标记可解析到数据行
        region: ['cartesian'],     // 矩形与套索拖拽可解析标记
        navigation: {},            // 连续 x、y 可平移缩放
        legend: true,              // 离散颜色图例可切换
    },
    markCognitiveChannel: 'position',

    declareLayoutMode: (channelSemantics, table, chartProperties) => {
        // 可选：带状轴、σ 覆盖、Q→O 转换
        return { /* LayoutDeclaration */ };
    },

    instantiate: (spec, ctx) => {
        defaultBuildEncodings(spec, ctx.resolvedEncodings);
        // ctx.channelSemantics, ctx.layout, ctx.table, ctx.chartProperties, …
    },

    properties: [
        { key: 'opacity', label: 'Opacity', type: 'continuous',
          min: 0.1, max: 1, step: 0.05, defaultValue: 1 },
    ],
};
```

### 关键规则

1. **`template`** — 最小原生骨架；`instantiate` 填充 encodings 与 mark 属性。
2. **`markCognitiveChannel`** — 告诉编译器读者如何解码数值（影响零基线与 [Auto Layout Algorithm](/documentation/layout-model) 压缩）。
3. **`instantiate`** — 接收 `template` 的**深拷贝**以及 `InstantiateContext`（已解析 encodings、`ChannelSemantics`、`LayoutResult`、数据表、画布尺寸，以及计划定好尺寸后的 `plot` / `views`）。
4. **不做语义分支** — 读取 `ctx.channelSemantics[channel].format`、`.type`、`.zero` 等；不要按原始字段名或存储类型 switch。按通道的*类型*分支（离散 `y` 命名系列，度量 `y` 被画出）是允许的。
5. **`interactionSupport`** — 该图表类型向交互预设提供的能力（`core/interaction-spec.ts` 中的 `ChartInteractionSupport`）。只声明图表能兑现的：`elements`、`region`、`navigation`、`reorder`、`legend`、`discreteAxis`、`index`。缺省键表示"从不"；组装器会按绑定的 encodings 确认依赖数据的项。准入会丢弃或拒绝 `requires` 列表中点名了图表缺少能力的预设，`list_chart_types` 也从同一块报告支持的预设。
6. **`semanticInteractions`** — 交互读取的字段、系列字段、可选标记与悬停样式，以及 `resolve` 与 `presentUpdate`。照抄同族模板。

可选钩子：`normalizeEncodings`（在语义与布局之前重排作者给的通道；仅 Vega-Lite）、`postProcess`（布局与主题之后）、`encodingActions`（shelf 快捷操作）。

### 组装器写到哪里

组装器与主题把轴、比例尺、键与颜色的决策写到它们能看到的 encodings 上：根 `encoding`、分面下的 `spec.encoding`，以及每个 `layer`。`vconcat` / `hconcat` 内的单元不会被访问。希望某个单元拿到这些决策的组合模板，在 `instantiate` 期间把该单元的 encodings 留在根上，在 `postProcess` 中再移入单元（见 `marginal.ts`）。

### 主题读哪里

主题按构建出的 spec 的 mark 类型做决定：`area` 或 `line` 会引来系列末端的名字与数值标签。主题是分布形状的图表（小提琴图、密度图、山脊图、散点的边缘分布）列在 `core/theme/ground.ts` 的 `DISTRIBUTION_SHAPE_CHARTS` 中，主题对二者都不画。

---

# §3 描述模板所画的内容

计划在模板构建之前为图表定尺寸，因此它读取一份**结构**：标记、每个位置轴编码的内容、系列、堆叠与键。`skeletonStructure(template, ctx)` 从骨架推导；构建出骨架没有体现的内容的模板，用 `structure` 钩子自述（`core/structure.ts` 中的 `ChartStructure`）。

`tests/chart-structure.test.ts` 让描述与 `instantiate` 的构建在每个测试用例、每个主题下保持一致。它比较的事实，以及从构建出的 spec 读取的方式：

| 事实 | 描述方式 | 从构建读取 |
|---|---|---|
| `marks` | 标记种类，含各 layer | 树中的每个 `mark` |
| `x` / `y` `fields` | 轴读取的数据字段 | encoding 的 field，或 transform 读取的字段 |
| `derived` | 模板计算的度量（`count`、`density`……；新增时扩展 `DerivedMeasure`） | 跳过字段检查 |
| `baseline` | `'zero'` 或 `'data'` | `scale.zero`，或显式 `domain` |
| `ownScale` | 模板自己写定义域或刻度值 | `scale.domain`、`axis.values` |
| `rounded` | `false` 保持数据跨度 | `scale.nice`、显式 `domain`；与分箱 encoding 相邻时为未设 |
| `stacking` | `stacked`、`normalized`、`centered`、`none` | 度量上的 `stack`，以及一个带内是否有多行 |
| `series`、`keys` | 颜色系列与所画的键 | `legend` 不为 `null` 的颜色 encoding |
| `axisTitles` | 模板自设的标题，`null` 表示无 | 轴标题 |

精确陈述构建会显示的内容。工作轴（山脊图的基线）是 `derived`，带 `ownScale: true` 与其 `baseline`；写显式定义域的图表是 `rounded: false`。

另有两项测试把发出的 spec 与计划对照。`tests/plan-honour.test.ts` 遍历每个单元与 layer，把每个颜色 encoding 的 `sort` 与计划的类别顺序对照，把每个度量 encoding 的 `zero` 与计划的定义域对照；因此在该通道上画的不是计划度量的单元（边缘分布的密度轴）声明 `zero: false` 并带 `domainMin: 0`，每个颜色 encoding 都带上主图的 `sort`。`tests/title-plan.test.ts` 分别从构建出的 spec 与计划拟合标题；模板自己命名的轴必须写进 `axisTitles`，否则二者不一致。

---

# §4 组合多个视图

并排画多个视图的模板设置 `composite: true` 并做计划：

- **`planPlot(ctx)`** — 图区尺寸不是布局给的时（正方形饼图、为边缘分布让出空间而缩小的散点）。在计划中运行。
- **`planViews(ctx)`** — 视图及其排布：由 `view`、`concat`（行或列，带间距）与 `facet` 节点组成的 `ViewNode`（`core/views.ts`）。在图区之后运行；`instantiate` 从 `ctx.views` 读回尺寸与间距并照画。

`tests/plan-views.test.ts` 编译 spec，把每个画出的视图尺寸与视图数量和计划对照，因此 spec 必须按 `planViews` 所说、按同样顺序画。

Vega-Lite 不在嵌套的 concat 之间共享比例尺。必须对齐的视图（边缘分布与其主图）各自带上显式且相同的 `scale.domain`；在 `postProcess` 中写入，此时主题与布局已定好主图的比例尺。

---

# §5 注册模板

在 `packages/flint-js/src/<backend>/templates/index.ts` 中：

1. 导入新的 `*Def` 常量。
2. 将其加入 `*TemplateDefs` 内合适的 category 数组（例如 `"Points"`）。
3. 确保 `*GetTemplateDef(chartType)` 能找到它：`defs.find(t => t.chart === chartType)`。

Vega-Lite 还会运行 `withInjectedProperties()`，按模板的认知通道附加共享的分面、对数比例尺、零基线、轴类型与数值标签属性。新模板无需添加。

---

# §6 添加测试数据并通过计划测试

### 生成器模式

`TestCase` 接口位于 `packages/flint-js/src/test-data/types.ts`。

典型流程（见 `scatter-tests.ts`、`bar-tests.ts`）：

1. 定义小型参数矩阵（基数、是否着色、是否分面、每个会改变所画内容的 `chartProperties` 值）。
2. 导出 `gen<Chart>Tests(): TestCase[]`，其中 `chartType` 与 `ChartTemplateDef.chart` 一致。
3. 在 `packages/flint-js/src/test-data/index.ts` 中注册：

```typescript
TEST_GENERATORS['Dot Plot'] = genDotPlotTests;
```

每个生成的用例都会在无主题与每个预设下跑 §3 与 §4 的结构、honour、视图与标题测试。在模板完成之前就注册生成器；失败项就是清单。

### 验证

```bash
npm run typecheck
npm run test
npm run site    # Gallery → find your chart type
```

在 3–6 个代表性用例上检查格式化、布局拉伸、图例与分面行为。

---

# §7 接入站点、文档与 agent skill

以下都不从注册表读取，各需一行：

| 位置 | 内容 |
|---|---|
| `site/src/shared/chart-categories.ts` | 一条 `createChart(...)`，图标来自 `site/src/assets/chart-icons/` |
| `site/src/shared/gallery-labels.ts` | 中文标签 |
| `scripts/gen-chart-reference.ts` | `ICON_BY_CHART` 中的图标，以及 `PARAM_DESCRIPTIONS` 中每个新属性键的一句说明 |
| `agent-skills/flint-chart-author/SKILL.md` | 图表类型表与属性表中各一行 |
| `packages/flint-js/src/core/chart-transitions.ts` | 与最近图表类型之间、encodings 可沿用的 θ 转换 |
| `packages/flint-js/src/core/recommendation.ts` | 一条 `ChannelRoleMap`，否则其通道按 auxiliary 计 |

然后重新生成并同步：

```bash
npm run gen:reference   # docs/reference-*.md 与交互附录
npm run sync:skills     # 把 skills 复制到 flint-mcp 的 assets
npm run build           # flint-mcp 打包注册表与 skills
node scripts/sync-copilot-plugin.mjs
```

MCP 服务器测试会把打包的 app 与 skill 副本和源文件对照，因此同步是变更的一部分。

---

# §8 跨后端对等

面向用户的契约是：在模板存在的前提下，相同的 `chartType` 字符串应能在 `assembleVegaLite`、`assembleECharts`、`assembleChartjs` 与 `assemblePlotly` 上工作。实践中：

- 先移植到你立即需要的后端；其余可另开跟进。在此之前，在 skill 的图表类型表中注明 **Vega-Lite only**。
- `site/src/shared/supported-backends.ts` 按各后端注册表过滤图表类型。仅 Vega-Lite 的模板在注册到 ECharts 之前不会出现在 ECharts 中。

---

# §9 相关文档

- [Extending backends](/documentation/adding-a-backend) — 完整组装器接线
- [Semantic Type](/documentation/semantic-types) — `channelSemantics` 包含的内容
- [Auto Layout Algorithm](/documentation/layout-model) — `declareLayoutMode` 与 stretch 模型
- [API reference](/documentation/api-reference) — `chart_spec.chartType` 与 encodings
