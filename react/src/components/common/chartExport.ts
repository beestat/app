import type { Theme } from '@mui/material/styles';
import type Highcharts from 'highcharts';

export function exportColors(theme: Theme) {
  return { background: theme.palette.background.paper, text: theme.palette.text.primary, textSecondary: theme.palette.text.secondary };
}

/** One row of an exported card: a chart, or a text label that introduces the next chart. */
export type ExportSection = { chart?: Highcharts.Chart | null; label?: string };

export interface ChartExportOptions {
  title: string;
  subtitle?: string;
  sections: ExportSection[];
  colors: { background: string; text: string; textSecondary: string };
  /** Pixel density of the PNG; 2 keeps text sharp on high-DPI screens. */
  scale?: number;
}

const gutter = 16;
const fontFiles = [[300, '/font/montserrat/montserrat_300.woff'], [400, '/font/montserrat/montserrat_400.woff'], [600, '/font/montserrat/montserrat_600.woff']] as const;
let fontCss: Promise<string> | undefined;

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

async function dataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// An SVG drawn into a canvas cannot load the page's web fonts, so Montserrat is embedded.
function embeddedFonts() {
  fontCss ??= Promise.all(fontFiles.map(async ([weight, url]) => {
    const source = await dataUrl(url);
    const range = weight === 400 ? '400 500' : weight === 600 ? '600 900' : '300';
    return `@font-face{font-family:Montserrat;font-weight:${range};src:url(${source}) format('woff');}`;
  })).then((rules) => rules.join('')).catch(() => '');
  return fontCss;
}

// Live chart markup references theme CSS variables, which do not exist inside a standalone image.
function resolveVariables(markup: string) {
  const style = getComputedStyle(document.body);
  return markup.replace(/var\((--[\w-]+)\)/g, (match, name: string) => style.getPropertyValue(name).trim() || match);
}

// Legacy exported at a 980px source width; narrower (phone) charts are redrawn at that
// width for the export and restored in the same task, so the page never paints it.
const minimumExportWidth = 980;

function snapshot(chart: Highcharts.Chart, width: number) {
  const height = chart.chartHeight;
  const resize = chart.chartWidth !== width;
  if (resize) chart.setSize(width, height, false);
  try {
    const source = chart.container.querySelector('svg');
    if (!source) return undefined;
    const clone = source.cloneNode(true) as SVGSVGElement;
    // Hover state (guides, tooltips, hover halos) is not part of the chart.
    clone.querySelectorAll('.highcharts-tooltip, .highcharts-crosshair, .beestat-synchronized-crosshair, .highcharts-halo').forEach((node) => node.remove());
    clone.setAttribute('x', '0');
    clone.setAttribute('width', String(chart.chartWidth));
    clone.setAttribute('height', String(chart.chartHeight));
    return { height: chart.chartHeight, markup: resolveVariables(new XMLSerializer().serializeToString(clone)) };
  } finally {
    if (resize) chart.setSize(null, height, false);
  }
}

function isVisible(chart: Highcharts.Chart) {
  const container = chart.container as HTMLElement | undefined;
  return Boolean(container?.isConnected && container.getClientRects().length);
}

/** Builds one SVG containing the card's title and every visible chart, stacked as on screen. */
export async function composeChartsSvg({ title, subtitle, sections, colors }: ChartExportOptions) {
  const visible = sections.filter((section) => section.label || (section.chart && isVisible(section.chart)));
  const chartWidth = Math.max(minimumExportWidth, ...visible.map((section) => section.chart?.chartWidth ?? 0));
  const charts = visible.map((section) => (section.label ? { label: section.label } : { snapshot: snapshot(section.chart!, chartWidth) })).filter((section) => section.label || section.snapshot);
  const width = chartWidth + gutter * 2;
  const parts: string[] = [];
  let y = gutter + 18;
  parts.push(`<text x="${gutter}" y="${y}" fill="${colors.text}" font-size="16" font-weight="600">${escapeXml(title)}</text>`);
  if (subtitle) {
    y += 22;
    parts.push(`<text x="${gutter}" y="${y}" fill="${colors.textSecondary}" font-size="13" font-weight="500">${escapeXml(subtitle)}</text>`);
  }
  y += gutter;
  charts.forEach((section, index) => {
    if (section.label) {
      y += 18;
      parts.push(`<text x="${gutter}" y="${y}" fill="${colors.text}" font-size="13" font-weight="600">${escapeXml(section.label)}</text>`);
      y += 10;
      return;
    }
    const { markup, height } = section.snapshot!;
    if (index > 0) y += 8;
    parts.push(`<g transform="translate(${gutter} ${y})">${markup}</g>`);
    y += height;
  });
  y += gutter + 4;
  parts.push(`<text x="${width - gutter}" y="${y}" fill="${colors.textSecondary}" font-size="11" font-weight="500" text-anchor="end">beestat.io</text>`);
  const height = y + gutter;
  const fonts = await embeddedFonts();
  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Montserrat, Helvetica, sans-serif"><style>${fonts}</style><rect width="100%" height="100%" fill="${colors.background}"/>${parts.join('')}</svg>`,
  };
}

async function svgToPng(svg: string, width: number, height: number, scale: number) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The chart image could not be rendered.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed.'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// "Thermostat Detail - Past 7 days.png"; long descriptive subtitles give way to the date.
export function exportFilename(title: string, subtitle?: string, now = new Date()) {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const detail = subtitle && subtitle.length <= 40 ? subtitle : date;
  return `${title} - ${detail}`.replace(/[\\/:*?"<>|]+/g, '-').replace(/[.\s]+$/, '') + '.png';
}

/** Downloads a PNG of every visible chart in a card, titled like the card. */
export async function downloadChartsPng(options: ChartExportOptions) {
  const { svg, width, height } = await composeChartsSvg(options);
  const png = await svgToPng(svg, width, height, options.scale ?? 2);
  const url = URL.createObjectURL(png);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFilename(options.title, options.subtitle);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
