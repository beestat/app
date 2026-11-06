import { Alert, Box, Button } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardProvider, useDashboard } from './state/DashboardContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { BeestatLoader } from './components/common/BeestatLoader';
import { AppThemeProvider } from './components/layout/AppThemeProvider';

// Detail is the overwhelmingly common entry route. Start its split chunk in
// parallel with the dashboard API so it costs no post-data round trip while
// keeping all card code out of the bootstrap bundle.
let detailPagePromise: ReturnType<typeof importDetailPage> | undefined;
function importDetailPage() { return import('./pages/DetailPage'); }
function loadDetailPage() { return detailPagePromise ??= importDetailPage(); }
if (['', '#/', '#/detail'].includes(window.location.hash)) void loadDetailPage();
const DetailPage = lazy(() => loadDetailPage().then((module) => ({ default: module.DetailPage })));
const NoThermostatsPage = lazy(() => import('./pages/NoThermostatsPage').then((module) => ({ default: module.NoThermostatsPage })));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage').then((module) => ({ default: module.AnalyzePage })));
const ComparePage = lazy(() => import('./pages/ComparePage').then((module) => ({ default: module.ComparePage })));
const AirQualityPage = lazy(() => import('./pages/AirQualityPage').then((module) => ({ default: module.AirQualityPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const DownloadPage = lazy(() => import('./pages/DownloadPage').then((module) => ({ default: module.DownloadPage })));
const ContributePage = lazy(() => import('./pages/ContributePage').then((module) => ({ default: module.ContributePage })));
const VisualizePage = lazy(() => import('./pages/VisualizePage').then((module) => ({ default: module.VisualizePage })));
const GlenwoodEnrollmentPage = lazy(() => import('./pages/GlenwoodPage').then((module) => ({ default: module.GlenwoodEnrollmentPage })));
const GlenwoodReportPage = lazy(() => import('./pages/GlenwoodPage').then((module) => ({ default: module.GlenwoodReportPage })));

function RoutedApp() {
  const { data, loading, error, refresh } = useDashboard();
  const location = useLocation();
  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <BeestatLoader size={80} label="Loading beestat" />
      </Box>
    );
  }
  if (error) {
    return <Box sx={{ maxWidth: 720, mx: 'auto', mt: 8, p: 2 }}><Alert severity="error" action={<Button color="inherit" onClick={() => void refresh()}>Retry</Button>}>{error}</Alert></Box>;
  }
  const hasThermostats = Object.keys(data?.thermostat ?? {}).length > 0;
  return (
    <AppShell>
      <ErrorBoundary key={location.pathname}><Suspense fallback={<Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}><BeestatLoader label="Loading page" /></Box>}><Routes>
        {!hasThermostats ? <>
          <Route path="settings" element={<SettingsPage />} />
          <Route path="contribute" element={<ContributePage />} />
          <Route path="glenwood-enrollment" element={<GlenwoodEnrollmentPage />} />
          <Route path="glenwood-report" element={<GlenwoodReportPage />} />
          <Route path="*" element={<NoThermostatsPage />} />
        </> : <>
        <Route index element={<DetailPage />} />
        <Route path="detail" element={<DetailPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="visualize" element={<VisualizePage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="air-quality" element={<AirQualityPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="contribute" element={<ContributePage />} />
        <Route path="glenwood-enrollment" element={<GlenwoodEnrollmentPage />} />
        <Route path="glenwood-report" element={<GlenwoodReportPage />} />
        <Route path="*" element={<Navigate to="detail" replace />} />
        </>}
      </Routes></Suspense></ErrorBoundary>
    </AppShell>
  );
}

export function App() {
  return <DashboardProvider><AppThemeProvider><RoutedApp /></AppThemeProvider></DashboardProvider>;
}
