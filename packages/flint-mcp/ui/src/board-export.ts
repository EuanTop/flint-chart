// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * The board as one PNG, drawn as it looks: its paper, the theme's furniture and rules, the headline in its
 * own type, the rules between rows, and every chart's SVG or table at its place. The
 * controls (the bar, the selection chip, edit outlines) are left out.
 */

import { drawTable } from './table-export';

const SCALE = 2;
const TEXT = '.board-title, .board-subtitle, .board-source';
const RULED = '.board-header, .board-cell, .board-tile, .board-source';

function svgImage(svg: SVGSVGElement, size?: { width: number; height: number }): Promise<HTMLImageElement> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (size) {
    copy.setAttribute('width', String(size.width));
    copy.setAttribute('height', String(size.height));
  }
  // A data URL, not a blob one: an MCP App's sandbox allows images from `data:` only.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('A chart could not be drawn'));
    image.src = url;
  });
}

/** Lines of text as the element wraps them, by its own width and font. */
function wrapped(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function boardPng(root: HTMLElement): Promise<Blob> {
  const origin = root.getBoundingClientRect();
  const bar = root.querySelector('.board-bar')?.getBoundingClientRect();
  const height = (bar ? bar.top : origin.bottom) - origin.top;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(origin.width * SCALE);
  canvas.height = Math.ceil(height * SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas to draw on');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = getComputedStyle(root).backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, origin.width, height);
  const at = (rect: DOMRect) => ({ x: rect.left - origin.left, y: rect.top - origin.top });

  for (const svg of root.querySelectorAll<SVGSVGElement>(':scope > .board-furniture')) {
    const rect = svg.getBoundingClientRect();
    const { x, y } = at(rect);
    ctx.drawImage(await svgImage(svg), x, y, rect.width, rect.height);
  }

  for (const rule of root.querySelectorAll<HTMLElement>('.board-rule')) {
    const rect = rule.getBoundingClientRect();
    const { x, y } = at(rect);
    ctx.fillStyle = getComputedStyle(rule).backgroundColor;
    ctx.fillRect(x, y, rect.width, rect.height);
  }

  for (const element of root.querySelectorAll<HTMLElement>(RULED)) {
    if (element.closest('.board-bar')) continue;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const { x, y } = at(rect);
    for (const [side, top] of [['Top', y], ['Bottom', y + rect.height]] as const) {
      const width = parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`));
      const color = style.getPropertyValue(`border-${side.toLowerCase()}-color`);
      if (!(width > 0) || style.getPropertyValue(`border-${side.toLowerCase()}-style`) === 'none' || color === 'rgba(0, 0, 0, 0)') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, side === 'Top' ? top : top - width, rect.width, width);
    }
  }

  for (const element of root.querySelectorAll<HTMLElement>(TEXT)) {
    const text = element.textContent?.trim();
    if (!text) continue;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const { x, y } = at(rect);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'top';
    const size = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight) || size * 1.25;
    const top = y + (element.matches('.board-source') ? parseFloat(style.paddingTop) || 0 : 0);
    wrapped(ctx, text, rect.width).forEach((line, index) => {
      ctx.fillText(line, x, top + index * lineHeight + (lineHeight - size) / 2);
    });
  }

  for (const svg of root.querySelectorAll<SVGSVGElement>('.board-cell-chart svg')) {
    if (svg.parentElement?.closest('svg') || getComputedStyle(svg).visibility === 'hidden') continue;
    // A chart's furniture is a 1px layer over the chart that draws past its box: it is drawn at the chart's size.
    const chart = svg.classList.contains('flint-canvas-furniture') ? svg.previousElementSibling : null;
    const rect = svg.getBoundingClientRect();
    const size = chart ? chart.getBoundingClientRect() : rect;
    if (size.width === 0 || size.height === 0) continue;
    const { x, y } = at(rect);
    ctx.drawImage(await svgImage(svg, chart ? size : undefined), x, y, size.width, size.height);
  }

  for (const table of root.querySelectorAll<HTMLElement>('.board-cell-chart .flint-table')) drawTable(ctx, table, origin);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The board could not be exported'))), 'image/png');
  });
}
