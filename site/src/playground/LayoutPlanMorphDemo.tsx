import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assembleVegaLite, getChartTransitions, type ChartAssemblyInput } from 'flint-chart';
import { compile as compileVegaLite } from 'vega-lite';
import { parse as parseVega, View as VegaView } from 'vega';
import { BASKET_ROWS, TEAMS } from './layout-plan-shared';
import './layout-plan-morph.css';

// ─── Engine types ──────────────────────────────────────────────────────────

type Point = [number, number];
type Rgba = [number, number, number, number];

type PrimClass = 'mark' | 'tick' | 'grid' | 'domain' | 'label' | 'title' | 'legend-symbol' | 'legend-label' | 'frame' | 'other';

interface TextGeom {
  kind: 'text';
  x: number;
  y: number;
  angle: number;
  /** Offset of the start/alphabetic anchor in the rotated frame. */
  lx: number;
  ly: number;
  size: number;
  font: string;
  weight: string;
  content: string;
}

type Geom =
  | { kind: 'poly'; pts: Point[] }
  | { kind: 'rule'; x1: number; y1: number; x2: number; y2: number }
  | TextGeom
  | { kind: 'path'; d: string; x: number; y: number };

interface Prim {
  key: string;
  alt?: string;
  role: string;
  cls: PrimClass;
  layer: number;
  order: number;
  geom: Geom;
  fill: Rgba | null;
  stroke: Rgba | null;
  strokeWidth: number;
  opacity: number;
  dash?: string;
  /** Centre of an arc mark; arc-to-arc tweens run in polar coordinates around it. */
  pivot?: Point;
  /** Where a line or area drawn through this mark passes (top) and closes (base). */
  top?: Point;
  base?: Point;
}

interface Connector {
  kind: 'line' | 'area';
  key: string;
  members: Prim[];
  fill: Rgba | null;
  stroke: Rgba | null;
  strokeWidth: number;
  opacity: number;
}

interface MorphScene {
  width: number;
  height: number;
  background: Rgba | null;
  svg: string;
  prims: Prim[];
  connectors: Connector[];
}

export interface MorphSummary {
  keyFields: string[];
  marks: { matched: number; split: number };
  ticks: number;
  gridlines: number;
  labels: number;
  crossRole: number;
  legend: number;
  titles: number;
  fadedIn: number;
  fadedOut: number;
}

export interface MorphOptions {
  duration?: number;
  /** Fields that identify a mark across both charts; inferred from the shared non-measure row fields when omitted. */
  keyFields?: string[];
  signal?: AbortSignal;
  onFrame?: (t: number) => void;
}

export interface PreparedMorph {
  width: number;
  height: number;
  summary: MorphSummary;
  /** The overlay; draw frames into it with `renderAt`. */
  element: SVGSVGElement;
  /** Markup of the real target chart. */
  targetSvg: string;
  sourceSvg: string;
  renderAt: (t: number) => void;
}

// ─── Spec helpers ──────────────────────────────────────────────────────────

const SIDE = 20;
const MARK_STAGGER = 0.2;
const TITLE_ROLES = new Set(['title-text', 'title-subtitle', 'axis-title', 'legend-title']);
const SVG_NS = 'http://www.w3.org/2000/svg';

const vegaLiteCache = new WeakMap<object, any>();

function toVegaLite(spec: any): any {
  if (!spec || typeof spec !== 'object' || !('chart_spec' in spec)) return spec;
  let compiled = vegaLiteCache.get(spec);
  if (!compiled) {
    compiled = assembleVegaLite(spec as ChartAssemblyInput);
    vegaLiteCache.set(spec, compiled);
  }
  return compiled;
}

function rowFields(input: any, vl: any): string[] {
  const row = input?.data?.values?.[0] ?? vl?.data?.values?.[0];
  return row && typeof row === 'object' ? Object.keys(row) : [];
}

function measureFields(vl: any, out = new Set<string>()): Set<string> {
  if (!vl || typeof vl !== 'object') return out;
  for (const channel of Object.values<any>(vl.encoding ?? {})) {
    for (const def of Array.isArray(channel) ? channel : [channel]) {
      if (def && typeof def.field === 'string' && (def.type === 'quantitative' || def.aggregate)) out.add(def.field);
    }
  }
  for (const child of [vl.spec, ...(vl.layer ?? []), ...(vl.vconcat ?? []), ...(vl.hconcat ?? []), ...(vl.concat ?? [])]) measureFields(child, out);
  return out;
}

export function inferKeyFields(from: any, to: any): string[] {
  const a = toVegaLite(from);
  const b = toVegaLite(to);
  const measures = measureFields(b, measureFields(a));
  const shared = new Set(rowFields(to, b));
  return rowFields(from, a).filter((field) => shared.has(field) && !measures.has(field));
}

const DATE_LIKE = /^\d{4}-\d{2}(-\d{2})?/;

function normalize(value: unknown): string {
  if (value instanceof Date) return String(value.getTime());
  if (typeof value === 'string' && DATE_LIKE.test(value)) {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return String(ms);
  }
  return String(value);
}

// ─── Colour ────────────────────────────────────────────────────────────────

const colourCache = new Map<string, Rgba | null>();
let colourContext: CanvasRenderingContext2D | null = null;

function parseColour(value: unknown, alpha = 1): Rgba | null {
  if (typeof value !== 'string' || value === '' || value === 'none') return null;
  let parsed = colourCache.get(value);
  if (parsed === undefined) {
    colourContext ??= document.createElement('canvas').getContext('2d');
    parsed = null;
    if (colourContext) {
      colourContext.fillStyle = '#000';
      colourContext.fillStyle = value;
      const style = String(colourContext.fillStyle);
      if (style.startsWith('#')) {
        const hex = parseInt(style.slice(1), 16);
        parsed = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 1];
      } else {
        const parts = style.match(/[\d.]+/g)?.map(Number) ?? [];
        parsed = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
      }
    }
    colourCache.set(value, parsed);
  }
  if (!parsed) return null;
  return [parsed[0], parsed[1], parsed[2], parsed[3] * alpha];
}

function lerpColour(a: Rgba | null, b: Rgba | null, t: number): Rgba | null {
  if (!a && !b) return null;
  const from = a ?? [b![0], b![1], b![2], 0];
  const to = b ?? [a![0], a![1], a![2], 0];
  return [0, 1, 2, 3].map((i) => from[i] + (to[i] - from[i]) * t) as Rgba;
}

const css = (colour: Rgba | null): string =>
  colour ? `rgba(${Math.round(colour[0])},${Math.round(colour[1])},${Math.round(colour[2])},${colour[3].toFixed(3)})` : 'none';

// ─── Shapes ────────────────────────────────────────────────────────────────
// Every filled shape is sampled to 4 × SIDE points, clockwise on screen, starting at the
// bottom-left corner: left side up, top across, right side down, bottom back.

function rectPoly(x: number, y: number, width: number, height: number): Point[] {
  const x0 = Math.min(x, x + width);
  const x1 = Math.max(x, x + width);
  const y0 = Math.min(y, y + height);
  const y1 = Math.max(y, y + height);
  const corners: Point[] = [[x0, y1], [x0, y0], [x1, y0], [x1, y1]];
  const pts: Point[] = [];
  for (let side = 0; side < 4; side++) {
    const [ax, ay] = corners[side];
    const [bx, by] = corners[(side + 1) % 4];
    for (let i = 0; i < SIDE; i++) pts.push([ax + ((bx - ax) * i) / SIDE, ay + ((by - ay) * i) / SIDE]);
  }
  return pts;
}

const polar = (cx: number, cy: number, r: number, angle: number): Point => [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];

function arcPoly(cx: number, cy: number, inner: number, outer: number, start: number, end: number): Point[] {
  const [sa, ea] = start <= end ? [start, end] : [end, start];
  const pts: Point[] = [];
  for (let i = 0; i < SIDE; i++) pts.push(polar(cx, cy, inner + ((outer - inner) * i) / SIDE, sa));
  for (let i = 0; i < SIDE; i++) pts.push(polar(cx, cy, outer, sa + ((ea - sa) * i) / SIDE));
  for (let i = 0; i < SIDE; i++) pts.push(polar(cx, cy, outer - ((outer - inner) * i) / SIDE, ea));
  for (let i = 0; i < SIDE; i++) pts.push(polar(cx, cy, inner, ea - ((ea - sa) * i) / SIDE));
  return pts;
}

function circlePoly(cx: number, cy: number, r: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 4 * SIDE; i++) pts.push(polar(cx, cy, r, (5 * Math.PI) / 4 + (2 * Math.PI * i) / (4 * SIDE)));
  return pts;
}

function centroid(pts: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const [px, py] of pts) { x += px; y += py; }
  return [x / pts.length, y / pts.length];
}

function scalePoly(pts: Point[], factor: number): Point[] {
  const [cx, cy] = centroid(pts);
  return pts.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
}

function polarLerp(from: Point[], to: Point[], pivotFrom: Point, pivotTo: Point, t: number): Point[] {
  const centre = lerpPoint(pivotFrom, pivotTo, t);
  return from.map(([ax, ay], i) => {
    const [bx, by] = to[i];
    const ra = Math.hypot(ax - pivotFrom[0], ay - pivotFrom[1]);
    const rb = Math.hypot(bx - pivotTo[0], by - pivotTo[1]);
    const ta = Math.atan2(ay - pivotFrom[1], ax - pivotFrom[0]);
    let tb = Math.atan2(by - pivotTo[1], bx - pivotTo[0]);
    tb -= 2 * Math.PI * Math.round((tb - ta) / (2 * Math.PI));
    const r = lerp(ra, rb, t);
    const angle = lerp(ta, tb, t);
    return [centre[0] + r * Math.cos(angle), centre[1] + r * Math.sin(angle)];
  });
}

const polyPath = (pts: Point[]): string => `M${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`;

// ─── Scene extraction ──────────────────────────────────────────────────────

let measureContext: CanvasRenderingContext2D | null = null;

function textWidth(content: string, size: number, font: string, weight: string): number {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return content.length * size * 0.55;
  measureContext.font = `${weight} ${size}px ${font}`;
  return measureContext.measureText(content).width;
}

const ALIGN: Record<string, number> = { left: 0, center: 0.5, right: 1 };
const BASELINE: Record<string, number> = { top: 0.79, middle: 0.3, bottom: -0.21, 'line-top': 0.79, 'line-bottom': -0.21 };

function textGeom(item: any, ox: number, oy: number): TextGeom | undefined {
  const content = Array.isArray(item.text) ? item.text.join(' ') : item.text == null ? '' : String(item.text);
  if (!content) return undefined;
  const size = item.fontSize ?? 11;
  const font = item.font ?? 'sans-serif';
  const weight = String(item.fontWeight ?? 'normal');
  let x = ox + (item.x ?? 0);
  let y = oy + (item.y ?? 0);
  if (item.radius) {
    const angle = (item.theta ?? 0) - Math.PI / 2;
    x += item.radius * Math.cos(angle);
    y += item.radius * Math.sin(angle);
  }
  const width = textWidth(content, size, font, weight);
  return {
    kind: 'text',
    x,
    y,
    angle: item.angle ?? 0,
    lx: (item.dx ?? 0) - width * (ALIGN[item.align] ?? 0),
    ly: (item.dy ?? 0) + size * (BASELINE[item.baseline] ?? 0),
    size,
    font,
    weight,
    content,
  };
}

function classOf(role: string): PrimClass {
  if (role === 'mark') return 'mark';
  if (role === 'axis-tick') return 'tick';
  if (role === 'axis-grid') return 'grid';
  if (role === 'axis-domain') return 'domain';
  if (role === 'axis-label') return 'label';
  if (role === 'legend-symbol') return 'legend-symbol';
  if (role === 'legend-label') return 'legend-label';
  if (TITLE_ROLES.has(role)) return 'title';
  return 'other';
}

const LAYER: Record<PrimClass, number> = { frame: 0, grid: 1, other: 2, mark: 4, domain: 5, tick: 5, label: 6, title: 6, 'legend-symbol': 6, 'legend-label': 6 };

class SceneReader {
  prims: Prim[] = [];
  connectors: Connector[] = [];
  private order = 0;
  private markIndex = 0;

  constructor(private keyFields: string[]) {}

  private markKey(datum: any): string {
    if (!datum || this.keyFields.length === 0) return `#${this.markIndex++}`;
    return this.keyFields.map((field) => normalize(datum[field] ?? datum.datum?.[field])).join('|');
  }

  private style(item: any) {
    const opacity = item.opacity ?? 1;
    return {
      fill: parseColour(item.fill, item.fillOpacity ?? 1),
      stroke: parseColour(item.stroke, item.strokeOpacity ?? 1),
      strokeWidth: item.strokeWidth ?? (item.stroke ? 1 : 0),
      dash: Array.isArray(item.strokeDash) && item.strokeDash.length ? item.strokeDash.join(' ') : undefined,
      opacity,
    };
  }

  private push(prim: Omit<Prim, 'order' | 'layer'> & { layer?: number }) {
    const full: Prim = { ...prim, layer: prim.layer ?? LAYER[prim.cls], order: this.order++ };
    this.prims.push(full);
    return full;
  }

  walk(mark: any, ox: number, oy: number, depth = 0) {
    if (!mark?.marktype) return;
    const role: string = mark.role ?? '';
    const cls = classOf(role);
    const items: any[] = mark.items ?? [];
    switch (mark.marktype) {
      case 'group':
        items.forEach((item, index) => {
          const style = this.style(item);
          if ((style.fill && style.fill[3] > 0) || (style.stroke && style.stroke[3] > 0 && style.strokeWidth > 0)) {
            if (item.width > 0 && item.height > 0) {
              this.push({ key: `frame:${role}:${mark.name ?? ''}:${depth}:${index}`, role, cls: 'frame', geom: { kind: 'poly', pts: rectPoly(ox + (item.x ?? 0), oy + (item.y ?? 0), item.width, item.height) }, ...style });
            }
          }
          for (const child of item.items ?? []) this.walk(child, ox + (item.x ?? 0), oy + (item.y ?? 0), depth + 1);
        });
        return;
      case 'rect':
        for (const item of items) {
          const x = ox + (item.x ?? 0);
          const y = oy + (item.y ?? 0);
          const width = item.width ?? (item.x2 ?? item.x ?? 0) - (item.x ?? 0);
          const height = item.height ?? (item.y2 ?? item.y ?? 0) - (item.y ?? 0);
          const key = cls === 'mark' ? `mark:${this.markKey(item.datum)}` : `${role}:${normalize(item.datum?.value ?? item.datum?.label ?? '')}`;
          this.push({ key, role, cls, geom: { kind: 'poly', pts: rectPoly(x, y, width, height) }, ...this.style(item), top: [x + width / 2, Math.min(y, y + height)], base: [x + width / 2, Math.max(y, y + height)] });
        }
        return;
      case 'arc':
        for (const item of items) {
          const cx = ox + (item.x ?? 0);
          const cy = oy + (item.y ?? 0);
          const mid = ((item.startAngle ?? 0) + (item.endAngle ?? 0)) / 2;
          const key = cls === 'mark' ? `mark:${this.markKey(item.datum)}` : `${role}:${normalize(item.datum?.value ?? '')}`;
          this.push({ key, role, cls, geom: { kind: 'poly', pts: arcPoly(cx, cy, item.innerRadius ?? 0, item.outerRadius ?? 0, item.startAngle ?? 0, item.endAngle ?? 0) }, ...this.style(item), pivot: [cx, cy], top: polar(cx, cy, item.outerRadius ?? 0, mid), base: [cx, cy] });
        }
        return;
      case 'symbol':
        for (const item of items) {
          const cx = ox + (item.x ?? 0);
          const cy = oy + (item.y ?? 0);
          const size = item.size ?? 64;
          const half = Math.sqrt(size) / 2;
          const pts = item.shape === 'square' ? rectPoly(cx - half, cy - half, 2 * half, 2 * half) : circlePoly(cx, cy, Math.sqrt(size / Math.PI));
          const key = cls === 'mark'
            ? `mark:${this.markKey(item.datum)}`
            : cls === 'legend-symbol' ? `legend-symbol:${normalize(item.datum?.label ?? item.datum?.value)}` : `${role}:${this.order}`;
          this.push({ key, role, cls, geom: { kind: 'poly', pts }, ...this.style(item), top: [cx, cy], base: [cx, cy] });
        }
        return;
      case 'rule':
        for (const item of items) {
          const x1 = ox + (item.x ?? 0);
          const y1 = oy + (item.y ?? 0);
          const x2 = ox + (item.x2 ?? item.x ?? 0);
          const y2 = oy + (item.y2 ?? item.y ?? 0);
          const orient = Math.abs(x2 - x1) < Math.abs(y2 - y1) ? 'v' : 'h';
          const key = cls === 'mark'
            ? `mark-rule:${this.markKey(item.datum)}`
            : `${role}:${orient}:${normalize(item.datum?.value ?? (cls === 'domain' ? '' : this.order))}`;
          this.push({ key, role, cls, geom: { kind: 'rule', x1, y1, x2, y2 }, ...this.style(item) });
        }
        return;
      case 'text':
        for (const item of items) {
          const geom = textGeom(item, ox, oy);
          if (!geom) continue;
          const key = cls === 'mark' && item.datum ? `mark-text:${mark.name ?? ""}:${this.markKey(item.datum)}` : `${role}:${geom.content}`;
          this.push({ key, ...(cls === 'mark' ? {} : { alt: `text:${geom.content}` }), role, cls, geom, ...this.style(item) });
        }
        return;
      case 'line':
      case 'area':
        this.walkSeries(mark, ox, oy, role, cls);
        return;
      case 'path':
        for (const item of items) {
          if (typeof item.path !== 'string') continue;
          this.push({ key: `${role}:path:${this.order}`, role, cls, geom: { kind: 'path', d: item.path, x: ox + (item.x ?? 0), y: oy + (item.y ?? 0) }, ...this.style(item) });
        }
        return;
      default:
        return;
    }
  }

  private walkSeries(mark: any, ox: number, oy: number, role: string, cls: PrimClass) {
    const items: any[] = (mark.items ?? []).filter((item: any) => item.defined !== false);
    if (items.length === 0) return;
    const area = mark.marktype === 'area';
    const horizontal = area && items[0].x2 !== undefined && items[0].y2 === undefined;
    const along = items.map((item) => (horizontal ? item.y ?? 0 : item.x ?? 0));
    const halfStep = (index: number, direction: -1 | 1): number => {
      const neighbour = along[index + direction] ?? along[index - direction];
      return neighbour === undefined ? 1 : Math.abs(along[index] - neighbour) / 2;
    };
    const members: Prim[] = [];
    items.forEach((item, index) => {
      const x = ox + (item.x ?? 0);
      const y = oy + (item.y ?? 0);
      const top: Point = [x, y];
      const base: Point = area ? [ox + (item.x2 ?? item.x ?? 0), oy + (item.y2 ?? item.y ?? 0)] : top;
      const before = halfStep(index, -1);
      const after = halfStep(index, 1);
      const pts = !area
        ? circlePoly(x, y, Math.max(2, (item.strokeWidth ?? 2) * 1.2))
        : horizontal
          ? rectPoly(Math.min(x, base[0]), y - before, Math.abs(base[0] - x), before + after)
          : rectPoly(x - before, Math.min(y, base[1]), before + after, Math.abs(base[1] - y));
      const style = this.style(item);
      const key = cls === 'mark' ? `mark:${this.markKey(item.datum)}` : `${role}:vertex:${this.order}`;
      members.push(this.push({ key, role, cls, geom: { kind: 'poly', pts }, fill: style.fill ?? style.stroke, stroke: null, strokeWidth: 0, opacity: 0, top, base }));
    });
    const first = this.style(items[0]);
    this.connectors.push({
      kind: area ? 'area' : 'line',
      key: `${area ? 'area' : 'line'}:${members.map(({ key }) => key).join(',')}`,
      members,
      fill: area ? first.fill : null,
      stroke: first.stroke,
      strokeWidth: area ? (first.stroke ? first.strokeWidth : 0) : first.strokeWidth || 2,
      opacity: first.opacity,
    });
  }
}

const sceneCache = new WeakMap<object, Map<string, Promise<MorphScene>>>();

function sceneOf(vl: any, keyFields: string[]): Promise<MorphScene> {
  const cacheKey = keyFields.join('\u0000');
  let byKey = sceneCache.get(vl);
  if (!byKey) {
    byKey = new Map();
    sceneCache.set(vl, byKey);
  }
  let scene = byKey.get(cacheKey);
  if (!scene) {
    scene = buildScene(vl, keyFields);
    byKey.set(cacheKey, scene);
  }
  return scene;
}

async function buildScene(vl: any, keyFields: string[]): Promise<MorphScene> {
  const view = new VegaView(parseVega(compileVegaLite(vl).spec as any), { renderer: 'none' } as any);
  await view.runAsync();
  const svg = await view.toSVG();
  const width = Number(svg.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1] ?? view.width());
  const height = Number(svg.match(/<svg[^>]*\sheight="([\d.]+)"/)?.[1] ?? view.height());
  const translate = svg.match(/<g[^>]*transform="translate\(([-\d.]+),\s*([-\d.]+)\)"/);
  const [ox, oy] = translate ? [Number(translate[1]), Number(translate[2])] : view.origin();
  const reader = new SceneReader(keyFields);
  reader.walk((view.scenegraph() as any).root, ox, oy);
  view.finalize();
  return { width, height, background: parseColour(view.background()), svg, prims: reader.prims, connectors: reader.connectors };
}

// ─── Matching ──────────────────────────────────────────────────────────────

interface Pair {
  a?: Prim;
  b?: Prim;
  /** Rank among the marks, for the stagger. */
  rank: number;
}

function matchScenes(a: MorphScene, b: MorphScene, keyFields: string[]) {
  const pairs: Pair[] = [];
  const usedA = new Set<Prim>();
  const usedB = new Set<Prim>();
  const summary: MorphSummary = { keyFields, marks: { matched: 0, split: 0 }, ticks: 0, gridlines: 0, labels: 0, crossRole: 0, legend: 0, titles: 0, fadedIn: 0, fadedOut: 0 };
  const pair = (pa: Prim, pb: Prim) => {
    usedA.add(pa);
    usedB.add(pb);
    pairs.push({ a: pa, b: pb, rank: 0 });
    if (pb.cls === 'mark') summary.marks.matched++;
    else if (pb.cls === 'tick') summary.ticks++;
    else if (pb.cls === 'grid') summary.gridlines++;
    else if (pb.cls === 'legend-symbol') summary.legend++;
    else if (pb.cls === 'title' || pa.cls === 'title') summary.titles++;
    else if (pb.geom.kind === 'text') {
      summary.labels++;
      if (pa.role !== pb.role) summary.crossRole++;
    }
  };
  const group = (prims: Prim[], used: Set<Prim>, key: (prim: Prim) => string | undefined) => {
    const map = new Map<string, Prim[]>();
    for (const prim of prims) {
      const k = used.has(prim) ? undefined : key(prim);
      if (k === undefined) continue;
      const list = map.get(k);
      if (list) list.push(prim);
      else map.set(k, [prim]);
    }
    return map;
  };

  const byKeyA = group(a.prims, usedA, ({ key }) => key);
  for (const [key, listB] of group(b.prims, usedB, ({ key }) => key)) {
    const listA = byKeyA.get(key);
    if (!listA) continue;
    const kindA = listA[0].geom.kind;
    if (kindA !== listB[0].geom.kind) continue;
    const count = listA[0].cls === 'mark' ? Math.max(listA.length, listB.length) : Math.min(listA.length, listB.length);
    if (listA[0].cls === 'mark' && count > Math.min(listA.length, listB.length)) summary.marks.split += count - Math.min(listA.length, listB.length);
    for (let i = 0; i < count; i++) pair(listA[Math.min(i, listA.length - 1)], listB[Math.min(i, listB.length - 1)]);
  }

  const byAltA = group(a.prims, usedA, ({ alt }) => alt);
  for (const [alt, listB] of group(b.prims, usedB, ({ alt }) => alt)) {
    const listA = byAltA.get(alt) ?? [];
    for (let i = 0; i < Math.min(listA.length, listB.length); i++) pair(listA[i], listB[i]);
  }

  const titlesA = group(a.prims, usedA, ({ role }) => (TITLE_ROLES.has(role) ? role : undefined));
  for (const [role, listB] of group(b.prims, usedB, ({ role }) => (TITLE_ROLES.has(role) ? role : undefined))) {
    const listA = titlesA.get(role) ?? [];
    for (let i = 0; i < Math.min(listA.length, listB.length); i++) pair(listA[i], listB[i]);
  }

  for (const prim of a.prims) {
    if (usedA.has(prim)) continue;
    pairs.push({ a: prim, rank: 0 });
    if (prim.opacity > 0) summary.fadedOut++;
  }
  for (const prim of b.prims) {
    if (usedB.has(prim)) continue;
    pairs.push({ b: prim, rank: 0 });
    if (prim.opacity > 0) summary.fadedIn++;
  }

  const marks = pairs.filter(({ a: pa, b: pb }) => (pb ?? pa)!.cls === 'mark');
  marks
    .sort((p, q) => (p.b?.order ?? p.a!.order + 1e6) - (q.b?.order ?? q.a!.order + 1e6))
    .forEach((p, index) => { p.rank = marks.length > 1 ? index / (marks.length - 1) : 0; });
  pairs.sort((p, q) => ((p.b ?? p.a)!.layer - (q.b ?? q.a)!.layer) || ((p.b ?? p.a)!.order - (q.b ?? q.a)!.order));
  return { pairs, summary };
}

// ─── Frames ────────────────────────────────────────────────────────────────

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPoint = (a: Point, b: Point, t: number): Point => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Progress of one pair at global time t: marks are staggered, everything else moves together. */
function localTime(pair: Pair, t: number): number {
  const prim = (pair.b ?? pair.a)!;
  if (prim.cls !== 'mark') return ease(t);
  return ease(clamp01((t - pair.rank * MARK_STAGGER) / (1 - MARK_STAGGER)));
}

/** Opacity factor of a one-sided pair: fade out in the first half, in during the second. */
const fadeOut = (t: number) => 1 - clamp01(t / 0.5);
const fadeIn = (t: number) => clamp01((t - 0.5) / 0.5);

function svgNode<K extends keyof SVGElementTagNameMap>(tag: K, parent: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  parent.appendChild(node);
  return node;
}

function styleNode(node: SVGElement, fill: Rgba | null, stroke: Rgba | null, strokeWidth: number, opacity: number, dash?: string) {
  if (dash) node.setAttribute('stroke-dasharray', dash);
  else node.removeAttribute('stroke-dasharray');
  node.setAttribute('fill', css(fill));
  node.setAttribute('stroke', css(stroke));
  node.setAttribute('stroke-width', strokeWidth.toFixed(2));
  node.setAttribute('opacity', clamp01(opacity).toFixed(3));
}

function drawText(node: SVGTextElement, geom: TextGeom) {
  node.textContent = geom.content;
  node.setAttribute('transform', `translate(${geom.x.toFixed(2)},${geom.y.toFixed(2)}) rotate(${geom.angle.toFixed(2)})`);
  node.setAttribute('x', geom.lx.toFixed(2));
  node.setAttribute('y', geom.ly.toFixed(2));
  node.setAttribute('font-size', geom.size.toFixed(2));
  node.setAttribute('font-family', geom.font);
  node.setAttribute('font-weight', geom.weight);
}

const NUMBER = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/;

/** The text between two numbers that share a prefix and suffix ("$1.48" → "$1.52"), or undefined when they are not such a pair. */
function countBetween(a: string, b: string, t: number): string | undefined {
  const ma = NUMBER.exec(a);
  const mb = NUMBER.exec(b);
  if (!ma || !mb || ma[1] !== mb[1] || ma[3] !== mb[3]) return undefined;
  const va = Number(ma[2].replace(/,/g, ''));
  const vb = Number(mb[2].replace(/,/g, ''));
  if (!Number.isFinite(va) || !Number.isFinite(vb)) return undefined;
  const decimals = Math.max(ma[2].split('.')[1]?.length ?? 0, mb[2].split('.')[1]?.length ?? 0);
  const grouped = ma[2].includes(',') || mb[2].includes(',');
  const value = lerp(va, vb, t).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped });
  return `${mb[1]}${value}${mb[3]}`;
}

function lerpText(a: TextGeom, b: TextGeom, t: number, content: string): TextGeom {
  return {
    kind: 'text',
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    angle: lerp(a.angle, b.angle, t),
    lx: lerp(a.lx, b.lx, t),
    ly: lerp(a.ly, b.ly, t),
    size: lerp(a.size, b.size, t),
    font: t < 0.5 ? a.font : b.font,
    weight: t < 0.5 ? a.weight : b.weight,
    content,
  };
}

/** Whether a one-sided mark enters or leaves by growing from its own baseline or centre, rather than fading. */
const grows = (prim: Prim): boolean => prim.cls === 'mark' && prim.geom.kind === 'poly' && !prim.pivot && prim.top !== undefined && prim.base !== undefined;

/** The geometry a one-sided mark grows from or shrinks into: a bar flat on its baseline, a point at its centre. */
function collapsed(prim: Prim): Geom {
  if (prim.geom.kind !== 'poly' || prim.cls !== 'mark') return prim.geom;
  if (grows(prim)) {
    const [, baseY] = prim.base!;
    const flat = Math.abs(prim.top![1] - baseY) > 0.5;
    return { kind: 'poly', pts: flat ? prim.geom.pts.map(([x]) => [x, baseY] as Point) : scalePoly(prim.geom.pts, 0.01) };
  }
  return { kind: 'poly', pts: scalePoly(prim.geom.pts, 0.4) };
}

type Drawer = (t: number) => void;

function pairDrawer(pair: Pair, layer: SVGGElement): { draw: Drawer; anchor: (t: number) => { top: Point; base: Point } | undefined } {
  const { a, b } = pair;
  const from = a ?? b!;
  const to = b ?? a!;
  const geomA = a ? a.geom : collapsed(b!);
  const geomB = b ? b.geom : collapsed(a!);
  const opacityAt = (t: number) => {
    if (a && b) return lerp(a.opacity, b.opacity, t);
    if (grows(from)) return a ? a.opacity * (t < 1 ? 1 : 0) : b!.opacity;
    return a ? a.opacity * fadeOut(t) : b!.opacity * fadeIn(t);
  };
  const colours = (t: number) => {
    const k = a && b ? t : a ? 0 : 1;
    return {
      fill: lerpColour(from.fill, to.fill, k),
      stroke: lerpColour(from.stroke, to.stroke, k),
      strokeWidth: lerp(from.strokeWidth, to.strokeWidth, k),
    };
  };
  const anchor = (t: number) => {
    const topA = from.top ?? to.top;
    const topB = to.top ?? from.top;
    if (!topA || !topB) return undefined;
    const k = localTime(pair, t);
    return { top: lerpPoint(topA, topB, k), base: lerpPoint(from.base ?? topA, to.base ?? topB, k) };
  };

  if (geomA.kind === 'poly' && geomB.kind === 'poly') {
    const node = svgNode('path', layer);
    return {
      anchor,
      draw: (t) => {
        const k = localTime(pair, t);
        const { fill, stroke, strokeWidth } = colours(k);
        const pts = a?.pivot && b?.pivot
          ? polarLerp(geomA.pts, geomB.pts, a.pivot, b.pivot, k)
          : geomA.pts.map((p, i) => lerpPoint(p, geomB.pts[i], k));
        node.setAttribute('d', polyPath(pts));
        styleNode(node, fill, stroke, strokeWidth, opacityAt(k), (k < 0.5 ? from : to).dash);
      },
    };
  }
  if (geomA.kind === 'rule' && geomB.kind === 'rule') {
    const node = svgNode('line', layer);
    return {
      anchor,
      draw: (t) => {
        const k = localTime(pair, t);
        const { stroke, strokeWidth } = colours(k);
        node.setAttribute('x1', lerp(geomA.x1, geomB.x1, k).toFixed(2));
        node.setAttribute('y1', lerp(geomA.y1, geomB.y1, k).toFixed(2));
        node.setAttribute('x2', lerp(geomA.x2, geomB.x2, k).toFixed(2));
        node.setAttribute('y2', lerp(geomA.y2, geomB.y2, k).toFixed(2));
        styleNode(node, null, stroke, strokeWidth, opacityAt(k), (k < 0.5 ? from : to).dash);
      },
    };
  }
  if (geomA.kind === 'text' && geomB.kind === 'text') {
    const counted = a && b && a.cls === 'mark' && geomA.content !== geomB.content && countBetween(geomA.content, geomB.content, 0) !== undefined;
    if (counted) {
      const node = svgNode('text', layer);
      return {
        anchor,
        draw: (t) => {
          const k = localTime(pair, t);
          drawText(node, lerpText(geomA, geomB, k, countBetween(geomA.content, geomB.content, k)!));
          styleNode(node, colours(k).fill, null, 0, opacityAt(k));
        },
      };
    }
    const same = geomA.content === geomB.content;
    const nodeA = svgNode('text', layer);
    const nodeB = same ? nodeA : svgNode('text', layer);
    return {
      anchor,
      draw: (t) => {
        const k = localTime(pair, t);
        const { fill } = colours(k);
        const opacity = opacityAt(k);
        drawText(nodeA, lerpText(geomA, geomB, k, geomA.content));
        styleNode(nodeA, fill, null, 0, same ? opacity : opacity * (1 - k));
        if (!same) {
          drawText(nodeB, lerpText(geomA, geomB, k, geomB.content));
          styleNode(nodeB, fill, null, 0, opacity * k);
        }
      },
    };
  }
  const node = from.geom.kind === 'path' ? svgNode('path', layer) : undefined;
  return {
    anchor,
    draw: (t) => {
      if (!node || from.geom.kind !== 'path') return;
      const k = ease(t);
      node.setAttribute('d', from.geom.d);
      node.setAttribute('transform', `translate(${from.geom.x},${from.geom.y})`);
      styleNode(node, from.fill, from.stroke, from.strokeWidth, opacityAt(k));
    },
  };
}

/**
 * Pairs each old line or area with the new one sharing the most vertices, so a series that
 * gains or loses points is the same series, not a new one cross-fading over the old.
 */
function matchConnectors(from: Connector[], to: Connector[]): Map<Connector, Connector> {
  const out = new Map<Connector, Connector>();
  const used = new Set<Connector>();
  for (const connector of from) {
    const keys = new Set(connector.members.map(({ key }) => key));
    let best: Connector | undefined;
    let shared = 0;
    for (const candidate of to) {
      if (used.has(candidate) || candidate.kind !== connector.kind) continue;
      const count = candidate.members.filter(({ key }) => keys.has(key)).length;
      if (count > shared) { best = candidate; shared = count; }
    }
    if (best) { out.set(connector, best); used.add(best); }
  }
  return out;
}

function connectorDrawers(a: MorphScene, b: MorphScene, anchors: Map<Prim, (t: number) => { top: Point; base: Point } | undefined>, layers: { area: SVGGElement; line: SVGGElement }): Drawer[] {
  const partner = matchConnectors(a.connectors, b.connectors);
  const drawers: Drawer[] = [];
  const add = (from: Connector | undefined, to: Connector | undefined) => {
    const shape = (to ?? from)!;
    const node = svgNode('path', shape.kind === 'area' ? layers.area : layers.line);
    node.setAttribute('stroke-linejoin', 'round');
    const members = shape.members;
    drawers.push((t) => {
      const points = members.map((member) => anchors.get(member)?.(t)).filter((point): point is { top: Point; base: Point } => point !== undefined);
      if (points.length < 2) {
        node.setAttribute('d', '');
        return;
      }
      const k = ease(t);
      const opacity = from && to ? lerp(from.opacity, to.opacity, k) : from ? from.opacity * fadeOut(t) : to!.opacity * fadeIn(t);
      const tops = points.map(({ top }) => top);
      const d = shape.kind === 'area'
        ? polyPath([...tops, ...points.map(({ base }) => base).reverse()])
        : `M${tops.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}`;
      node.setAttribute('d', d);
      const side = from && to ? k : from ? 0 : 1;
      styleNode(node, shape.kind === 'area' ? lerpColour((from ?? to)!.fill, (to ?? from)!.fill, side) : null, lerpColour((from ?? to)!.stroke, (to ?? from)!.stroke, side), lerp((from ?? to)!.strokeWidth, (to ?? from)!.strokeWidth, side), opacity);
    });
  };
  const taken = new Set(partner.values());
  for (const connector of a.connectors) add(connector, partner.get(connector));
  for (const connector of b.connectors) if (!taken.has(connector)) add(undefined, connector);
  return drawers;
}

/**
 * A line or area vertex that only the new chart has starts where its nearest matched neighbour
 * was, so a growing series extends from its end instead of a point appearing out of nowhere.
 */
function extendEnteringVertices(b: MorphScene, pairs: Pair[], anchors: Map<Prim, (t: number) => { top: Point; base: Point } | undefined>) {
  const pairOf = new Map<Prim, Pair>();
  for (const pair of pairs) if (pair.b) pairOf.set(pair.b, pair);
  for (const connector of b.connectors) {
    const matched = connector.members.map((member) => pairOf.get(member)?.a);
    connector.members.forEach((member, index) => {
      if (matched[index] || !member.top) return;
      let from: Prim | undefined;
      for (let step = 1; step < connector.members.length && !from; step++) from = matched[index - step] ?? matched[index + step];
      if (!from?.top) return;
      const pair = pairOf.get(member)!;
      const startTop = from.top;
      const startBase = from.base ?? from.top;
      anchors.set(member, (t) => {
        const k = localTime(pair, t);
        return { top: lerpPoint(startTop, member.top!, k), base: lerpPoint(startBase, member.base ?? member.top!, k) };
      });
    });
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Build the overlay that tweens chart `from` into chart `to`. Either side may be a Flint input
 * (anything with `chart_spec`) or a compiled Vega-Lite spec. `renderAt(t)` draws the frame at t ∈ [0, 1].
 */
export async function prepareMorph(from: any, to: any, options: Pick<MorphOptions, 'keyFields'> = {}): Promise<PreparedMorph> {
  const keyFields = options.keyFields ?? inferKeyFields(from, to);
  const [a, b] = await Promise.all([sceneOf(toVegaLite(from), keyFields), sceneOf(toVegaLite(to), keyFields)]);
  const { pairs, summary } = matchScenes(a, b, keyFields);
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);

  const element = document.createElementNS(SVG_NS, 'svg');
  element.setAttribute('width', String(width));
  element.setAttribute('height', String(height));
  element.setAttribute('viewBox', `0 0 ${width} ${height}`);
  element.setAttribute('class', 'lm-overlay');
  const background = svgNode('rect', element);
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  const layerNodes = new Map<number, SVGGElement>();
  const layer = (index: number) => {
    let node = layerNodes.get(index);
    if (!node) {
      node = document.createElementNS(SVG_NS, 'g');
      layerNodes.set(index, node);
    }
    return node;
  };
  const connectorLayers = { area: layer(3), line: layer(5) };

  const anchors = new Map<Prim, (t: number) => { top: Point; base: Point } | undefined>();
  const drawers: Drawer[] = [];
  for (const pair of pairs) {
    const prim = (pair.b ?? pair.a)!;
    const { draw, anchor } = pairDrawer(pair, layer(prim.layer === LAYER.mark ? 4 : prim.layer < 3 ? prim.layer : prim.layer + 2));
    drawers.push(draw);
    for (const side of [pair.a, pair.b]) if (side && !anchors.has(side)) anchors.set(side, anchor);
  }
  extendEnteringVertices(b, pairs, anchors);
  drawers.push(...connectorDrawers(a, b, anchors, connectorLayers));
  [...layerNodes.entries()].sort(([p], [q]) => p - q).forEach(([, node]) => element.appendChild(node));

  const renderAt = (t: number) => {
    const k = clamp01(t);
    background.setAttribute('fill', css(lerpColour(a.background, b.background, ease(k))));
    for (const draw of drawers) draw(k);
  };
  renderAt(0);
  return { width, height, summary, element, targetSvg: b.svg, sourceSvg: a.svg, renderAt };
}

const running = new WeakMap<HTMLElement, AbortController>();

function showStatic(container: HTMLElement, svg: string) {
  container.innerHTML = '';
  const holder = document.createElement('div');
  holder.className = 'lm-static';
  holder.innerHTML = svg;
  container.appendChild(holder);
}

/** Draw `spec` into `container` without animating, cancelling any morph running there. */
export async function renderStatic(container: HTMLElement, spec: any): Promise<void> {
  running.get(container)?.abort();
  running.delete(container);
  const scene = await sceneOf(toVegaLite(spec), []);
  showStatic(container, scene.svg);
}

/**
 * Animate `container` from chart `from` to chart `to`, then leave the real `to` chart in it.
 * A second call on the same container cancels the first. Resolves with what was matched.
 */
export async function morphBetween(container: HTMLElement, from: any, to: any, options: MorphOptions = {}): Promise<MorphSummary> {
  running.get(container)?.abort();
  const controller = new AbortController();
  running.set(container, controller);
  options.signal?.addEventListener('abort', () => controller.abort());
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? 0 : options.duration ?? 800;

  const morph = await prepareMorph(from, to, options);
  if (controller.signal.aborted) return morph.summary;
  container.innerHTML = '';
  container.appendChild(morph.element);

  await new Promise<void>((resolve) => {
    if (duration <= 0) return resolve();
    const start = performance.now();
    const step = (now: number) => {
      if (controller.signal.aborted) return resolve();
      const t = clamp01((now - start) / duration);
      morph.renderAt(t);
      options.onFrame?.(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
  if (!controller.signal.aborted) {
    showStatic(container, morph.targetSvg);
    running.delete(container);
  }
  return morph.summary;
}

/** A chart that morphs from its previous spec whenever `spec` changes; a zero duration swaps it in place. */
export function MorphingChart({ spec, duration = 800, onMorph, className }: { spec: any; duration?: number; onMorph?: (summary: MorphSummary | undefined) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef<any>(undefined);
  const latest = useRef({ duration, onMorph });
  latest.current = { duration, onMorph };

  useEffect(() => {
    const container = ref.current;
    if (!container || shown.current === spec) return;
    const previous = shown.current;
    shown.current = spec;
    if (previous === undefined || latest.current.duration <= 0) {
      renderStatic(container, spec)
        .then(() => { if (previous !== undefined) latest.current.onMorph?.(undefined); })
        .catch((error) => { container.textContent = String(error); });
      return;
    }
    morphBetween(container, previous, spec, { duration: latest.current.duration })
      .then((summary) => latest.current.onMorph?.(summary))
      .catch((error) => { container.textContent = String(error); });
  }, [spec]);

  return <div ref={ref} className={className ?? 'lm-chart'} />;
}

export function summaryText(summary: MorphSummary): string {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  const parts: string[] = [];
  const by = summary.keyFields.length ? summary.keyFields.join(' + ') : 'draw order';
  parts.push(`${plural(summary.marks.matched, 'mark')} matched by ${by}${summary.marks.split ? ` (${summary.marks.split} split one-to-many)` : ''}`);
  const axes = [summary.ticks && plural(summary.ticks, 'tick'), summary.gridlines && plural(summary.gridlines, 'gridline'), summary.labels && plural(summary.labels, 'label')].filter(Boolean);
  if (axes.length) parts.push(`${axes.join(', ')} by value${summary.crossRole ? ` (${summary.crossRole} changed role, e.g. axis label to legend label)` : ''}`);
  if (summary.legend) parts.push(`${plural(summary.legend, 'legend entry').replace('entrys', 'entries')} by label`);
  if (summary.titles) parts.push(`${plural(summary.titles, 'title')} by role`);
  parts.push(`${summary.fadedIn} faded in, ${summary.fadedOut} faded out`);
  return parts.join(' · ');
}

// ─── Demo ──────────────────────────────────────────────────────────────────

const TOP_TEAMS = [...TEAMS].sort((a, b) => b.Goals - a.Goals).slice(0, 8);
const TEAM_TYPES = { Team: 'Country', Confederation: 'Category', Goals: 'Count' };
const EGG_ROWS = BASKET_ROWS.filter(({ Food }) => Food === 'Eggs').slice(-24);
const EGG_TYPES = { Month: 'YearMonth', Price: { semanticType: 'Price', unit: 'USD' }, Food: 'Category' };
const SIZE = { width: 380, height: 240 };

const teamChart = (chartType: string, encodings: Record<string, string>): ChartAssemblyInput => ({
  data: { values: TOP_TEAMS },
  semantic_types: TEAM_TYPES,
  chart_spec: { chartType, title: 'Goals per team, top eight', encodings, baseSize: SIZE },
});

const eggChart = (chartType: string): ChartAssemblyInput => ({
  data: { values: EGG_ROWS },
  semantic_types: EGG_TYPES,
  field_display_names: { Price: 'Price per dozen' },
  chart_spec: { chartType, title: 'Egg prices, last two years', encodings: { x: 'Month', y: 'Price' }, baseSize: SIZE },
});

export interface MorphDataset {
  id: string;
  label: string;
  charts: { type: string; label: string; spec: ChartAssemblyInput }[];
}

export const MORPH_DATASETS: MorphDataset[] = [
  {
    id: 'teams',
    label: 'Teams',
    charts: [
      { type: 'Bar Chart', label: 'Bar', spec: teamChart('Bar Chart', { x: 'Team', y: 'Goals', color: 'Confederation' }) },
      { type: 'Pie Chart', label: 'Pie', spec: teamChart('Pie Chart', { size: 'Goals', color: 'Team' }) },
      { type: 'Donut Chart', label: 'Donut', spec: teamChart('Donut Chart', { size: 'Goals', color: 'Team' }) },
      { type: 'Lollipop Chart', label: 'Lollipop', spec: teamChart('Lollipop Chart', { x: 'Team', y: 'Goals', color: 'Confederation' }) },
      { type: 'Strip Plot', label: 'Strip', spec: teamChart('Strip Plot', { x: 'Confederation', y: 'Goals', color: 'Confederation' }) },
    ],
  },
  {
    id: 'eggs',
    label: 'Egg prices',
    charts: [
      { type: 'Bar Chart', label: 'Bar', spec: eggChart('Bar Chart') },
      { type: 'Line Chart', label: 'Line', spec: eggChart('Line Chart') },
      { type: 'Area Chart', label: 'Area', spec: eggChart('Area Chart') },
      { type: 'Scatter Plot', label: 'Scatter', spec: eggChart('Scatter Plot') },
    ],
  },
];

export function MorphDemo() {
  const [datasetId, setDatasetId] = useState(MORPH_DATASETS[0].id);
  const dataset = MORPH_DATASETS.find(({ id }) => id === datasetId)!;
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | undefined>(undefined);
  const [duration, setDuration] = useState(900);
  const [summary, setSummary] = useState<MorphSummary | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [scrub, setScrub] = useState<number | undefined>(undefined);
  const stage = useRef<HTMLDivElement>(null);
  const shownSpec = useRef<ChartAssemblyInput | undefined>(undefined);
  const latestRequest = useRef(0);
  const scrubMorph = useRef<{ from: ChartAssemblyInput; to: ChartAssemblyInput; morph: Promise<PreparedMorph> } | undefined>(undefined);

  const siblings = useMemo(() => new Set(getChartTransitions(dataset.charts[current].type).map(({ to }) => to)), [dataset, current]);

  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    const spec = dataset.charts[0].spec;
    shownSpec.current = spec;
    scrubMorph.current = undefined;
    latestRequest.current++;
    setBusy(false);
    setCurrent(0);
    setPrevious(undefined);
    setSummary(undefined);
    setScrub(undefined);
    renderStatic(container, spec).catch((error) => { container.textContent = String(error); });
  }, [dataset]);

  /** Resolves true when this morph finished without being superseded by a newer one. */
  const morphTo = useCallback(async (index: number): Promise<boolean> => {
    const container = stage.current;
    const from = shownSpec.current;
    const to = dataset.charts[index].spec;
    if (!container || !from || from === to) return true;
    const request = ++latestRequest.current;
    shownSpec.current = to;
    setScrub(undefined);
    setBusy(true);
    try {
      const result = await morphBetween(container, from, to, { duration });
      if (request === latestRequest.current) setSummary(result);
    } finally {
      if (request === latestRequest.current) setBusy(false);
    }
    return request === latestRequest.current;
  }, [dataset, duration]);

  const choose = (index: number) => {
    if (index === current) return;
    setPrevious(current);
    setCurrent(index);
    void morphTo(index);
  };

  const playBothWays = async () => {
    const away = previous ?? (current + 1) % dataset.charts.length;
    if (await morphTo(away)) await morphTo(current);
  };

  const scrubTo = async (t: number) => {
    const container = stage.current;
    const from = previous === undefined ? undefined : dataset.charts[previous].spec;
    const to = dataset.charts[current].spec;
    if (!container || !from) return;
    setScrub(t);
    if (scrubMorph.current?.from !== from || scrubMorph.current.to !== to) {
      scrubMorph.current = { from, to, morph: prepareMorph(from, to) };
    }
    const morph = await scrubMorph.current.morph;
    if (morph.element.parentNode !== container) {
      container.innerHTML = '';
      container.appendChild(morph.element);
    }
    morph.renderAt(t);
    setSummary(morph.summary);
  };

  const endScrub = () => {
    const container = stage.current;
    if (!container || scrub === undefined) return;
    const spec = dataset.charts[current].spec;
    shownSpec.current = spec;
    setScrub(undefined);
    void renderStatic(container, spec);
  };

  return (
    <section className="ov-demo lp-demo" data-demo="morph">
      <header className="ov-demo-header">
        <div>
          <h2>One chart becomes another</h2>
          <p>Every part of one chart is matched to a part of the next before anything moves: marks by data row, ticks and labels by value, titles by role. Whatever has no partner fades.</p>
        </div>
        <div className="ov-backends" role="group" aria-label="Data">
          {MORPH_DATASETS.map(({ id, label }) => (
            <button type="button" key={id} className={id === datasetId ? 'active' : ''} onClick={() => setDatasetId(id)}>{label}</button>
          ))}
        </div>
      </header>
      <div className="lm-controls">
        <div className="ov-backends lm-targets" role="group" aria-label="Chart type">
          {dataset.charts.map(({ type, label }, index) => (
            <button
              type="button"
              key={type}
              className={index === current ? 'active' : ''}
              data-type={type}
              title={siblings.has(type) ? `${type} · a registered transition from ${dataset.charts[current].type}` : type}
              onClick={() => choose(index)}
            >
              {label}{siblings.has(type) ? <span className="lm-edge" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
        <label className="lp-slider lm-slider">
          <span>{duration} ms</span>
          <input type="range" min={200} max={3000} step={100} value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
        </label>
        <label className="lp-slider lm-slider">
          <span>{scrub === undefined ? 'Scrub' : `t = ${scrub.toFixed(2)}`}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            disabled={previous === undefined || busy}
            value={scrub ?? 1}
            onChange={(event) => void scrubTo(Number(event.target.value))}
            onPointerUp={endScrub}
            onKeyUp={endScrub}
          />
        </label>
        <div className="ov-backends" role="group" aria-label="Play">
          <button type="button" className="lm-play" disabled={busy} onClick={() => void playBothWays()}>Play both ways</button>
        </div>
      </div>
      <div ref={stage} className="lm-stage" />
      <p className="lp-note lm-summary">
        {summary ? summaryText(summary) : 'Pick a chart type to morph into. A dot marks the types Flint suggests from the current one.'}
      </p>
    </section>
  );
}
