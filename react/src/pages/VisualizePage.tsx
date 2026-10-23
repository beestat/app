import { Alert, Box } from '@mui/material';
import { DashboardCard } from '../components/common/DashboardCard';

export function VisualizePage() {
  return <Box py={2}><DashboardCard title="Visualize" subheader="Floor plan editor and 3D environmental visualization"><Alert severity="info" sx={{ mb: 2 }}>The proven visualizer engine is running in an isolated compatibility surface while its controls are migrated. Floor plans and visualizer settings use the existing API unchanged.</Alert><Box component="iframe" title="Beestat visualizer" src="/?layer=visualize&embedded=1" sx={{ width: '100%', height: 'calc(100dvh - 230px)', minHeight: 680, border: 0, borderRadius: 1, bgcolor: 'background.default' }} /></DashboardCard></Box>;
}
