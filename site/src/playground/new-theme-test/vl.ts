/**
 * Hand-crafted Vega-Lite for the "expected" panels: what each guide asks for, drawn directly with
 * Vega-Lite's own vocabulary, so the gap between the guide and Flint's theme is visible side by side.
 *
 * Nothing here goes through Flint. Each house states its tokens once (`HouseTokens`) and the
 * builders lay out the chart the way the guide's own examples do.
 */

export interface HouseTokens {
  font: string;
  titleFont?: string;
  text: string;
  muted: string;
  /** Gridline ink; null draws none. */
  grid?: string | null;
  gridDash?: number[];
  gridWidth?: number;
  /** Axis-line ink; null draws none. */
  axis?: string | null;
  background?: string;
  palette: string[];
  highlight?: string;
  /** The grey that non-highlighted data takes. */
  context?: string;
  titleSize?: number;
  titleWeight?: number | 'normal' | 'bold';
  titleAnchor?: 'start' | 'middle';
  subtitleSize?: number;
  subtitleStyle?: 'normal' | 'italic';
  subtitleColor?: string;
  subtitleWeight?: number | 'normal' | 'bold';
  labelSize?: number;
  sourceSize?: number;
  /** Gridlines across which axis: `y` rules horizontal lines (the common case). */
  gridAxis?: 'x' | 'y' | 'both' | 'none';
  /** Draw the y axis on the right. */
  yRight?: boolean;
  lineWidth?: number;
  barCorner?: number;
  legendOrient?: 'top' | 'right' | 'bottom' | 'top-left' | 'none';
}

export const W = 360;
export const H = 210;

export function houseConfig(t: HouseTokens): Record<string, unknown> {
  const grid = t.grid ?? null;
  const gridAxis = t.gridAxis ?? 'y';
  return {
    background: t.background ?? '#ffffff',
    font: t.font,
    padding: 14,
    view: { stroke: null },
    title: {
      anchor: t.titleAnchor ?? 'start',
      frame: 'group',
      font: t.titleFont ?? t.font,
      fontSize: t.titleSize ?? 16,
      fontWeight: t.titleWeight ?? 'bold',
      color: t.text,
      subtitleFont: t.font,
      subtitleFontSize: t.subtitleSize ?? 12,
      subtitleFontStyle: t.subtitleStyle ?? 'normal',
      subtitleColor: t.subtitleColor ?? t.muted,
      subtitleFontWeight: t.subtitleWeight ?? 'normal',
      subtitlePadding: 4,
      offset: 14,
    },
    axis: {
      labelFont: t.font,
      titleFont: t.font,
      labelColor: t.muted,
      titleColor: t.muted,
      labelFontSize: t.labelSize ?? 11,
      titleFontSize: t.labelSize ?? 11,
      titleFontWeight: 'normal',
      domainColor: t.axis ?? '#000000',
      domain: t.axis !== null,
      tickColor: t.axis ?? '#000000',
      ticks: false,
      labelPadding: 6,
      gridColor: grid ?? '#000000',
      gridDash: t.gridDash ?? [],
      gridWidth: t.gridWidth ?? 1,
    },
    axisX: { grid: grid !== null && (gridAxis === 'x' || gridAxis === 'both') },
    axisY: {
      grid: grid !== null && (gridAxis === 'y' || gridAxis === 'both'),
      domain: false,
      ...(t.yRight ? { orient: 'right' } : {}),
    },
    axisBand: { grid: false },
    legend: {
      labelFont: t.font,
      titleFont: t.font,
      labelColor: t.text,
      titleColor: t.text,
      labelFontSize: t.labelSize ?? 11,
      orient: t.legendOrient ?? 'top',
      direction: 'horizontal',
      title: null,
      symbolType: 'square',
    },
    range: { category: t.palette },
    bar: { color: t.palette[0], ...(t.barCorner ? { cornerRadiusEnd: t.barCorner } : {}) },
    line: { strokeWidth: t.lineWidth ?? 2, color: t.palette[0] },
    point: { color: t.palette[0] },
    arc: { stroke: t.background ?? '#ffffff', strokeWidth: 1 },
    text: { font: t.font, color: t.text },
  };
}

/** A chart with its headline and deck on top, and footer lines (source, note) under the block. */
export function titled(
  t: HouseTokens,
  view: Record<string, unknown>,
  options: {
    title?: string;
    subtitle?: string;
    footer?: string[];
    footerAlign?: 'start' | 'end';
    footerColor?: string;
    /** Text on the footer's right, on the same line as its first line (a footnote beside the source). */
    footerRight?: string;
    width?: number;
    height?: number;
  },
): Record<string, unknown> {
  const width = options.width ?? W;
  const inner: Record<string, unknown> = { width, height: options.height ?? H, ...view };
  const size = t.sourceSize ?? 10;
  const views: Record<string, unknown>[] = [inner];
  if (options.footerRight) {
    const lines = options.footer ?? [];
    views.push({
      width,
      height: Math.max(1, lines.length) * (size + 4),
      data: { values: [{}] },
      layer: [
        ...lines.map((line, i) => ({
          mark: { type: 'text', align: 'left', baseline: 'top', font: t.font, fontSize: size, color: options.footerColor ?? t.muted, text: line },
          encoding: { x: { value: 0 }, y: { value: i * (size + 4) } },
        })),
        {
          mark: { type: 'text', align: 'right', baseline: 'top', font: t.font, fontSize: size, color: options.footerColor ?? t.muted, text: options.footerRight },
          encoding: { x: { value: width }, y: { value: 0 } },
        },
      ],
    });
  } else if (options.footer?.length) {
    inner.title = {
      text: options.footer,
      orient: 'bottom',
      anchor: options.footerAlign ?? 'start',
      frame: 'bounds',
      font: t.font,
      fontSize: size,
      fontWeight: 'normal',
      color: options.footerColor ?? t.muted,
      offset: 12,
      lineHeight: size + 4,
    };
  }
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    config: houseConfig(t),
    ...(options.title ? { title: { text: options.title, ...(options.subtitle ? { subtitle: options.subtitle } : {}) } } : {}),
    ...(views.length > 1 ? { spacing: 8 } : {}),
    vconcat: views,
  };
}

/** A placeholder wordmark (not the brand's artwork): the organisation's name in a small box. */
export function wordmarkLayer(t: HouseTokens, label: string, corner: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left', color?: string) {
  const right = corner.endsWith('right');
  const top = corner.startsWith('top');
  const x = right ? W : 0;
  const y = top ? -18 : H + 34;
  const width = Math.max(36, label.length * 7.5 + 10);
  return [
    {
      data: { values: [{}] },
      mark: { type: 'rect', clip: false, color: color ?? t.text, cornerRadius: 1 },
      encoding: {
        x: { value: right ? x - width : x },
        x2: { value: right ? x : x + width },
        y: { value: y - 9 },
        y2: { value: y + 9 },
      },
    },
    {
      data: { values: [{}] },
      mark: { type: 'text', clip: false, text: label, color: '#ffffff', fontWeight: 'bold', fontSize: 11, align: 'center', baseline: 'middle', font: t.font },
      encoding: { x: { value: right ? x - width / 2 : x + width / 2 }, y: { value: y } },
    },
  ];
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Footer lines as HTML, for what a Vega-Lite title cannot set: a bold lead-in ("Source:"), a note
 * on the right of the same line, a letter-spaced wordmark. Each line is `[lead, text]`.
 */
export function footerHtml(
  t: HouseTokens,
  lines: [string, string][],
  o: { right?: string; color?: string; size?: number; leadWeight?: number; margin?: string } = {},
): string {
  const size = o.size ?? t.sourceSize ?? 10;
  const color = o.color ?? t.muted;
  const body = lines.map(([lead, text]) =>
    `<div style="margin-top:2px">${lead ? `<span style="font-weight:${o.leadWeight ?? 700}">${escapeHtml(lead)}</span> ` : ''}${escapeHtml(text)}</div>`).join('');
  return `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin:${o.margin ?? '0 14px 8px'};font-family:${t.font};font-size:${size}px;line-height:1.35;color:${color}">`
    + `<div>${body}</div>${o.right ? `<div style="white-space:nowrap">${o.right}</div>` : ''}</div>`;
}
