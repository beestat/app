import type Highcharts from 'highcharts';
import './highchartsSetup';

/** Keep chart tooltips on a stable horizontal rail, as in legacy beestat. */
export function stableTooltipPositioner(y = 60) {
  return function (this: Highcharts.Tooltip, width: number, _height: number, point: Highcharts.Point) {
    const chart = this.chart;
    const plotX = Number(point.plotX ?? 0);
    const left = chart.plotLeft;
    const right = chart.plotLeft + chart.plotWidth;
    const preferred = plotX < chart.plotWidth / 2 ? left + plotX : left + plotX - width;
    return { x: Math.max(left, Math.min(preferred, right - width)), y };
  };
}

export function chartTooltipHtml(title: string | null, sections: { label: string; value: string; color: string }[][]) {
  const heading = title == null ? '' : `<div style="color:var(--beestat-text-secondary);font-size:14px;font-weight:600;margin-bottom:4px">${title}</div>`;
  const rows = sections.filter((section) => section.length).map((section) => section.map((item) =>
    `<tr style="color:${item.color}"><td style="font-size:12px;font-weight:600;line-height:12px">${item.label}</td><td style="font-size:12px;line-height:12px;padding-left:4px">${item.value}</td></tr>`,
  ).join('')).join('<tr><td style="padding-bottom:4px"></td></tr>');
  return `<div style="background:var(--beestat-surface-tooltip);border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24);padding:8px">${heading}<table cellpadding="0" cellspacing="0">${rows}</table></div>`;
}
