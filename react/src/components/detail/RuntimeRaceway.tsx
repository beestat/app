import { memo, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { colors } from '../../theme';
import type { RuntimeChartData } from './runtimeData';

export const RuntimeRaceway = memo(function RuntimeRaceway({ data }: { data: RuntimeChartData }) {
  const options = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 44, marginLeft: 45, marginRight: 45, marginTop: 0, marginBottom: 0, animation: false },
    title: { text: undefined }, credits: { enabled: false }, exporting: { enabled: false }, legend: { enabled: false },
    xAxis: { type: 'datetime', min: data.min, max: data.max, visible: false },
    yAxis: { min: 0, max: 44, reversed: true, endOnTick: false, gridLineWidth: 0, title: { text: undefined }, labels: { enabled: false } },
    tooltip: { enabled: false },
    plotOptions: { series: { animation: false, marker: { enabled: false }, connectNulls: false, enableMouseTracking: false, states: { inactive: { enabled: false } } } },
    series: Object.entries(data.equipment).filter(([, series]) => series.points.some((point) => point[1] !== null)).map(([code, series]) => ({
      type: 'line', name: code, data: series.points, color: series.color, lineWidth: series.width, linecap: 'square', step: 'left', turboThreshold: 0,
    })),
  }), [data]);
  return <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { height: 44, background: colors.slate.dark } }} />;
});
