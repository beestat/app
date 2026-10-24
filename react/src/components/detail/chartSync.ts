import type Highcharts from 'highcharts';

function nearestPoint(series: Highcharts.Series, x: number) {
  const points = series.points.length ? series.points : series.data;
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].x < x) low = middle + 1;
    else high = middle;
  }
  for (let distance = 0; distance < points.length; distance++) {
    const right = points[low + distance];
    const left = points[low - 1 - distance];
    if (right && right.y !== null && (!left || left.y === null || Math.abs(right.x - x) <= Math.abs(left.x - x))) return right;
    if (left && left.y !== null) return left;
  }
  return undefined;
}

export function synchronizeChartPointers(charts: Array<Highcharts.Chart | undefined>) {
  const activeCharts = charts.filter(Boolean) as Highcharts.Chart[];
  // Highcharts clears chart.container during its own React cleanup. Retain the
  // exact DOM nodes we registered so route transitions can always detach the
  // listeners regardless of effect-cleanup ordering.
  const registrations = activeCharts.map((chart) => ({ chart, container: chart.container }));
  const move = (event: MouseEvent | TouchEvent) => {
    activeCharts.forEach((chart) => {
      const normalized = chart.pointer.normalize(event as any);
      const syncChart = chart as Highcharts.Chart & { beestatCrosshair?: Highcharts.SVGElement };
      const x = Math.max(chart.plotLeft, Math.min(chart.plotLeft + chart.plotWidth, normalized.chartX));
      if (!syncChart.beestatCrosshair) {
        syncChart.beestatCrosshair = chart.renderer.path()
          .addClass('highcharts-crosshair beestat-synchronized-crosshair')
          .attr({ stroke: '#a5b1c2', 'stroke-width': 1, zIndex: 4 })
          .add();
      }
      syncChart.beestatCrosshair.attr({ d: [['M', x, chart.plotTop], ['L', x, chart.plotTop + chart.plotHeight]] }).show();
      const points = chart.series
        .filter((series) => series.visible && (series.options as { enableMouseTracking?: boolean }).enableMouseTracking !== false)
        .map((series) => nearestPoint(series, chart.xAxis[0].toValue(normalized.chartX)))
        .filter(Boolean) as Highcharts.Point[];
      chart.xAxis[0]?.drawCrosshair(normalized, points[0]);
      if (points.length && chart.tooltip.options.enabled !== false) chart.tooltip.refresh(points, normalized);
    });
  };
  const leave = () => activeCharts.forEach((chart) => {
    chart.xAxis[0]?.hideCrosshair();
    chart.tooltip.hide(0);
    (chart as Highcharts.Chart & { beestatCrosshair?: Highcharts.SVGElement }).beestatCrosshair?.hide();
  });
  registrations.forEach(({ container }) => {
    container.addEventListener('mousemove', move);
    container.addEventListener('touchmove', move, { passive: true });
    container.addEventListener('touchstart', move, { passive: true });
    container.addEventListener('mouseleave', leave);
  });
  return () => registrations.forEach(({ container }) => {
    container.removeEventListener('mousemove', move);
    container.removeEventListener('touchmove', move);
    container.removeEventListener('touchstart', move);
    container.removeEventListener('mouseleave', leave);
  });
}
