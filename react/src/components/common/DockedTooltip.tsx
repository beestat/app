import { Box } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDashboard } from '../../state/DashboardContext';

/**
 * Legacy beestat.component.chart docks tooltips into a panel under the chart when
 * "Always Dock Tooltips" is on or the window is narrower than 600px. Wrap a chart's
 * tooltip HTML in `show()`: it returns the HTML for a floating tooltip, or stores it
 * for `panel` and returns false so Highcharts draws nothing over the chart.
 */
export function useDockedTooltip() {
  const { data } = useDashboard();
  const narrow = useMediaQuery('(max-width:599.95px)');
  const dock = narrow || data?.user?.settings?.ui?.always_dock_tooltips === true;
  const dockRef = useRef(dock);
  dockRef.current = dock;
  const [html, setHtml] = useState('');
  useEffect(() => { if (!dock) setHtml(''); }, [dock]);
  const show = useCallback((tooltip: string): string | false => {
    if (!dockRef.current) return tooltip;
    setHtml(tooltip);
    return false;
  }, []);
  const panel = dock && html ? <Box data-docked-tooltip sx={{ mt: 1 }} dangerouslySetInnerHTML={{ __html: html }} /> : null;
  return { show, panel };
}
