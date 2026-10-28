import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppBar, Badge, Box, Button, Container, Dialog, DialogContent, DialogTitle, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Toolbar, Typography, useMediaQuery } from '@mui/material';
import { Activity, ArrowLeftRight, Building2, ChartNoAxesCombined, Download, EllipsisVertical, ExternalLink, Eye, FileChartColumn, Heart, LogOut, Megaphone, PanelsTopLeft, Settings, Wind } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDashboard } from '../../state/DashboardContext';
import { apiCall, config } from '../../api/client';
import { colors } from '../../theme';
import { AnnouncementsContent } from '../../pages/AnnouncementsPage';

const DownloadDialog = lazy(() => import('../../pages/DownloadPage').then((module) => ({ default: module.DownloadDialog })));

const navItems = [
  { path: '/detail', label: 'Detail', icon: Eye },
  { path: '/analyze', label: 'Analyze', icon: ChartNoAxesCombined },
  { path: '/visualize', label: 'Visualize', icon: PanelsTopLeft },
  { path: '/compare', label: 'Compare', icon: Activity },
  { path: '/air-quality', label: 'Air Quality', icon: Wind },
];

const preloadRoute = (path: string) => {
  if (path === '/visualize') void import('../../pages/VisualizePage');
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, thermostatId, setThermostatId } = useDashboard();
  const navigate = useNavigate();
  const location = useLocation();
  const compact = useMediaQuery('(max-width:900px)');
  const phone = useMediaQuery('(max-width:600px)');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [lastReadOverride, setLastReadOverride] = useState(0);
  const announcementsInitialized = useRef(false);
  const hasThermostats = Object.keys(data?.thermostat ?? {}).length > 0;
  const platform = new URLSearchParams(window.location.search).get('platform');
  const unread = useMemo(() => {
    if (announcementsOpen) return 0;
    const lastRead = Math.max(Number(data?.user?.settings?.last_read_announcement_id ?? 0), lastReadOverride);
    return Object.values(data?.announcement ?? {}).filter((item: any) => Number(item.announcement_id) > lastRead).length;
  }, [announcementsOpen, data?.announcement, data?.user?.settings?.last_read_announcement_id, lastReadOverride]);
  useEffect(() => {
    if (announcementsInitialized.current) return;
    announcementsInitialized.current = true;
    if (data?.user?.settings?.first_run === true) return;
    const items = Object.values(data?.announcement ?? {}) as any[];
    if (!items.length) return;
    const lastRead = data?.user?.settings?.last_read_announcement_id;
    const latestImportant = Math.max(0, ...items.filter((item) => item.important === true).map((item) => Number(item.announcement_id)));
    if (lastRead === undefined || (latestImportant > 0 && Number(lastRead) < latestImportant)) setAnnouncementsOpen(true);
  }, [data]);
  useEffect(() => {
    const read = (event: Event) => setLastReadOverride(Number((event as CustomEvent<number>).detail));
    window.addEventListener('beestat-announcements-read', read);
    return () => window.removeEventListener('beestat-announcements-read', read);
  }, []);

  const logout = async () => {
    try { await apiCall({ resource: 'user', method: 'log_out' }); } finally { window.location.assign('/'); }
  };

  return (
    <Box sx={{ minHeight: '100dvh', pb: 3 }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.default', backgroundImage: 'none' }}>
        <Container maxWidth="xl" disableGutters>
          <Toolbar sx={{ gap: { xs: .5, sm: 2 }, px: { xs: 1, sm: 2 }, minHeight: { xs: '56px !important', sm: '60px !important' } }}>
            <Box component={NavLink} to="/detail" sx={{ display: 'flex', alignItems: 'center', width: phone ? 32 : compact ? 39 : 144, flex: `0 0 ${phone ? 32 : compact ? 39 : 144}px`, textDecoration: 'none' }}>
              <Box component="img" src={compact ? '/favicon.png' : '/img/logo.png'} alt="beestat" sx={{ height: 32, maxWidth: '100%', objectFit: 'contain', position: 'relative', top: { sm: '1px' } }} />
            </Box>
            {hasThermostats && <Box component="nav" sx={{ display: 'flex', gap: { xs: 0, sm: .5 }, flex: phone ? '1 1 auto' : `0 0 ${compact ? 225 : 565}px`, minWidth: 0 }}>
              {navItems.map(({ path, label, icon: Icon }) => (
                <Button key={path} component={NavLink} to={path} aria-label={label} title={phone ? label : undefined} startIcon={<Icon size={18} />} sx={{
                  minWidth: phone ? 0 : compact ? 42 : undefined, px: phone ? 0 : compact ? 1 : 1.5, flex: phone ? 1 : undefined,
                  mt: { sm: '2px' },
                  color: `${location.pathname === path ? colors.slate.dark : '#fff'} !important`,
                  bgcolor: location.pathname === path ? '#fff' : 'transparent',
                  '&:hover': { color: `${colors.slate.dark} !important`, bgcolor: '#fff' },
                }} onPointerEnter={() => preloadRoute(path)} onFocus={() => preloadRoute(path)}>{compact ? null : label}</Button>
              ))}
            </Box>}
            {!phone && <Box sx={{ flex: 1 }} />}
            <IconButton color="inherit" onClick={(event) => setAnchor(event.currentTarget)} aria-label="Open menu" sx={{ mt: { sm: '2px' } }}>
              <Badge badgeContent={unread} color="error"><EllipsisVertical size={22} /></Badge>
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ list: { sx: { '& .MuiMenuItem-root': { gap: 2 } } } }}>
              {Object.keys(data?.ecobee_thermostat ?? {}).length > 1 && <MenuItem onClick={() => { setAnchor(null); setSwitcherOpen(true); }}><ArrowLeftRight size={18} /> Switch Thermostat</MenuItem>}
              {!config.isDemo && <MenuItem onClick={() => { setAnchor(null); navigate('/contribute'); }}><Heart size={18} /> Support beestat</MenuItem>}
              <MenuItem onClick={() => { setAnchor(null); setAnnouncementsOpen(true); }}><Badge badgeContent={unread} color="error" sx={{ '& .MuiBadge-badge': { right: -8, top: 1 } }}><Megaphone size={18} /></Badge> Announcements</MenuItem>
              {hasThermostats && <MenuItem onClick={() => { setAnchor(null); setDownloadOpen(true); }}><Download size={18} /> Download Data</MenuItem>}
              <MenuItem onClick={() => { setAnchor(null); navigate('/settings'); }}><Settings size={18} /> Settings</MenuItem>
              {(platform === 'ios' || platform === 'android') && <MenuItem component="a" href="ecobee://beestat"><ExternalLink size={18} /> Open Ecobee App</MenuItem>}
              {data?.user?.settings?.glenwood_enrolled !== undefined && <MenuItem onClick={() => { setAnchor(null); navigate('/glenwood-enrollment'); }}><Building2 size={18} /> Glenwood Enrollment</MenuItem>}
              {[1, 39285, 50885, 51345].includes(Number(data?.user?.user_id)) && <MenuItem onClick={() => { setAnchor(null); navigate('/glenwood-report'); }}><FileChartColumn size={18} /> Glenwood Report</MenuItem>}
              <MenuItem onClick={() => void logout()}><LogOut size={18} /> Log Out</MenuItem>
            </Menu>
            <Dialog open={announcementsOpen} onClose={() => setAnnouncementsOpen(false)} fullWidth maxWidth="md"><DialogTitle>Announcements</DialogTitle><DialogContent dividers><AnnouncementsContent /></DialogContent></Dialog>
            {downloadOpen && <Suspense fallback={<Dialog open fullWidth maxWidth="sm"><DialogTitle>Download Data</DialogTitle><DialogContent dividers>Loading…</DialogContent></Dialog>}><DownloadDialog onClose={() => setDownloadOpen(false)} /></Suspense>}
            <Dialog open={switcherOpen} onClose={() => setSwitcherOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Change Thermostat</DialogTitle><DialogContent><Typography mb={2}>You have multiple thermostats; which one would you like to view?</Typography><List disablePadding sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>{Object.values(data?.thermostat ?? {}).sort((a, b) => a.name.localeCompare(b.name)).map((item) => <ListItemButton key={item.thermostat_id} selected={item.thermostat_id === thermostatId} onClick={() => { if (item.thermostat_id !== thermostatId) setThermostatId(item.thermostat_id); setSwitcherOpen(false); }} sx={{ bgcolor: item.thermostat_id === thermostatId ? 'primary.main' : 'background.default', borderRadius: 1 }}><ListItemText primary={item.name} /></ListItemButton>)}</List></DialogContent></Dialog>
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 2 }, pt: { xs: '9px', sm: 0 } }}>{config.isDemo && <Alert icon={false} severity="info" sx={{ mt: 2, bgcolor: 'primary.main', color: '#fff' }}>This is a demo of beestat; it works exactly like the real thing. Changes you make will not be saved.</Alert>}{children}<Box component="footer" sx={{ textAlign: 'center', color: 'text.secondary', py: 2, '& a': { color: 'inherit', mx: .5 } }}><a href="https://doc.beestat.io" target="_blank">Help</a> · <a href="https://community.beestat.io" target="_blank">Feedback</a> · <a href="https://beestat.io/privacy.html" target="_blank">Privacy</a> · <a href="https://newsletter.beestat.io" target="_blank">Newsletter</a> · <a href="mailto:contact@beestat.io">Contact</a></Box></Container>
    </Box>
  );
}
