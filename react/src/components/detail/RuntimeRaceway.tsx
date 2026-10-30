import { memo, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { RefObject } from 'react';
import { colors } from '../../theme';
import type { RuntimeChartData } from './runtimeData';

export const RuntimeRaceway = memo(function RuntimeRaceway({ data, extremes, chartRef, marginRight = 0 }: { data: RuntimeChartData; extremes?: [number, number]; chartRef?: RefObject<HighchartsReact.RefObject | null>; marginRight?: number }) {
  const options = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 44, marginLeft: 45, marginRight, marginBottom: 0, spacing: [8, 0, 0, 0], style: { fontFamily: 'Montserrat' }, animation: false },
    title: { text: undefined }, credits: { enabled: false }, exporting: { enabled: false }, legend: { enabled: false },
    xAxis: { type: 'datetime', min: extremes?.[0] ?? data.min, max: extremes?.[1] ?? data.max, lineWidth: 0, tickLength: 0, labels: { enabled: false } },
    yAxis: { min: 0, max: 44, reversed: true, endOnTick: false, gridLineWidth: 0, title: { text: undefined }, labels: { enabled: false } },
    tooltip: { enabled: false },
    plotOptions: { series: { animation: false, marker: { enabled: false }, connectNulls: false, enableMouseTracking: false, states: { inactive: { enabled: false } } } },
    series: Object.entries(data.equipment)
      .filter(([, series]) => series.points.some((point) => point[1] !== null))
      .sort(([left], [right]) => Number(right.startsWith('calendar_event_')) - Number(left.startsWith('calendar_event_')))
      .map(([code, series]) => ({
        type: 'line', name: code, data: series.points, color: series.color, lineWidth: series.width, linecap: 'square', className: 'crisp_edges', turboThreshold: 0,
      })),
  }), [data, extremes, marginRight]);
  return <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} containerProps={{ style: { height: 44, background: colors.slate.dark } }} />;
});
