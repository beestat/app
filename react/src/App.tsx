import { Alert, Box, CircularProgress } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardProvider, useDashboard } from './state/DashboardContext';
import { AppShell } from './components/layout/AppShell';
import { DetailPage } from './pages/DetailPage';
import { NoThermostatsPage } from './pages/NoThermostatsPage';

const AnalyzePage = lazy(() => import('./pages/AnalyzePage').then((module) => ({ default: module.AnalyzePage })));
const ComparePage = lazy(() => import('./pages/ComparePage').then((module) => ({ default: module.ComparePage })));
const AirQualityPage = lazy(() => import('./pages/AirQualityPage').then((module) => ({ default: module.AirQualityPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage').then((module) => ({ default: module.AnnouncementsPage })));
const DownloadPage = lazy(() => import('./pages/DownloadPage').then((module) => ({ default: module.DownloadPage })));
const ContributePage = lazy(() => import('./pages/ContributePage').then((module) => ({ default: module.ContributePage })));
const VisualizePage = lazy(() => import('./pages/VisualizePage').then((module) => ({ default: module.VisualizePage })));

function RoutedApp() {
  const { data, loading, error } = useDashboard();
  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}><img src="/favicon.png" width="72" height="72" alt="beestat" /><br /><CircularProgress sx={{ mt: 3 }} /></Box>
      </Box>
    );
  }
  if (error) {
    return <Box sx={{ maxWidth: 720, mx: 'auto', mt: 8, p: 2 }}><Alert severity="error">{error}</Alert></Box>;
  }
  if (Object.keys(data?.thermostat ?? {}).length === 0) return <AppShell><NoThermostatsPage /></AppShell>;
  return (
    <AppShell>
      <Suspense fallback={<Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>}><Routes>
        <Route index element={<DetailPage />} />
        <Route path="detail" element={<DetailPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="visualize" element={<VisualizePage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="air-quality" element={<AirQualityPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="contribute" element={<ContributePage />} />
        <Route path="*" element={<Navigate to="detail" replace />} />
      </Routes></Suspense>
    </AppShell>
  );
}

export function App() {
  return <DashboardProvider><RoutedApp /></DashboardProvider>;
}
