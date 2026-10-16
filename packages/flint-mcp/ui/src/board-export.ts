// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * The board as one PNG, drawn as it looks: its paper, the theme's tab, the headline and the cell
 * headings in their own type, the rules between rows, and every chart's SVG or table at its place. The
 * controls (the bar, the selection chip, edit outlines) are left out.
 */

import { drawTable } from './table-export';

const SCALE = 2;
const TEXT = '.board-title, .board-subtitle, .board-cell-title, .board-cell-subtitle, .board-source';
const RULED = '.board-header, .board-cell, .board-tile, .board-source';

function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('A chart could not be drawn')); };
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

  for (const tab of root.querySelectorAll<HTMLElement>('.board-tab')) {
    const rect = tab.getBoundingClientRect();
    const { x, y } = at(rect);
    ctx.fillStyle = getComputedStyle(tab).backgroundColor;
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
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const { x, y } = at(rect);
    ctx.drawImage(await svgImage(svg), x, y, rect.width, rect.height);
  }

  for (const table of root.querySelectorAll<HTMLElement>('.board-cell-chart .flint-table')) drawTable(ctx, table, origin);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The board could not be exported'))), 'image/png');
  });
}
