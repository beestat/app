import { useEffect, useMemo, useState } from 'react';
import { Alert, AppBar, Avatar, Badge, Box, Button, Container, Dialog, DialogContent, DialogTitle, IconButton, List, ListItemButton, ListItemText, Menu, MenuItem, Select, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { Activity, ArrowLeftRight, Bell, Building2, ChartNoAxesCombined, Download, EllipsisVertical, ExternalLink, Eye, FileChartColumn, Heart, LogOut, PanelsTopLeft, RefreshCw, Settings, Wind } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDashboard } from '../../state/DashboardContext';
import { apiCall, config } from '../../api/client';

const navItems = [
  { path: '/detail', label: 'Detail', icon: Eye },
  { path: '/analyze', label: 'Analyze', icon: ChartNoAxesCombined },
  { path: '/visualize', label: 'Visualize', icon: PanelsTopLeft },
  { path: '/compare', label: 'Compare', icon: Activity },
  { path: '/air-quality', label: 'Air Quality', icon: Wind },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, thermostatId, setThermostatId, refresh } = useDashboard();
  const navigate = useNavigate();
  const location = useLocation();
  const compact = useMediaQuery('(max-width:900px)');
  const phone = useMediaQuery('(max-width:600px)');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [lastReadOverride, setLastReadOverride] = useState(0);
  const hasThermostats = Object.keys(data?.thermostat ?? {}).length > 0;
  const platform = new URLSearchParams(window.location.search).get('platform');
  const unread = useMemo(() => {
    if (location.pathname === '/announcements') return 0;
    const lastRead = Math.max(Number(data?.user?.settings?.last_read_announcement_id ?? 0), lastReadOverride);
    return Object.values(data?.announcement ?? {}).filter((item: any) => Number(item.announcement_id) > lastRead).length;
  }, [data?.announcement, data?.user?.settings?.last_read_announcement_id, lastReadOverride, location.pathname]);
  useEffect(() => {
    const read = (event: Event) => setLastReadOverride(Number((event as CustomEvent<number>).detail));
    window.addEventListener('beestat-announcements-read', read);
    return () => window.removeEventListener('beestat-announcements-read', read);
  }, []);

  const logout = async () => {
    try { await apiCall({ resource: 'user', method: 'log_out' }); } finally { window.location.assign('/'); }
  };

  return (
    <Box sx={{ minHeight: '100dvh', pb: phone ? 10 : 3 }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.default', backgroundImage: 'none' }}>
        <Container maxWidth="xl" disableGutters={phone}>
          <Toolbar sx={{ gap: 1, minHeight: 58 }}>
            <Box component={NavLink} to="/detail" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', mr: 1 }}>
              <Avatar src="/favicon.png" alt="beestat" sx={{ width: 38, height: 38 }} />
              {!compact && <Box component="span" sx={{ color: '#fff', fontSize: 22, fontWeight: 500, ml: 1 }}>beestat</Box>}
            </Box>
            {!phone && hasThermostats && <Box component="nav" sx={{ display: 'flex', gap: .5, flex: 1 }}>
              {navItems.map(({ path, label, icon: Icon }) => (
                <Button key={path} component={NavLink} to={path} color="inherit" startIcon={<Icon size={18} />} sx={{
                  minWidth: compact ? 42 : undefined, px: compact ? 1 : 1.5,
                  bgcolor: location.pathname === path ? 'background.paper' : 'transparent',
                  '&:hover': { bgcolor: 'background.paper' },
                }}>{compact ? null : label}</Button>
              ))}
            </Box>}
            <Box sx={{ flex: phone ? 1 : 0 }} />
            {hasThermostats && (
              <Select aria-label="Active thermostat" size="small" value={thermostatId ?? ''} onChange={(event) => setThermostatId(Number(event.target.value))} sx={{ minWidth: phone ? 115 : 170 }}>
                {Object.values(data?.thermostat ?? {}).map((item) => <MenuItem key={item.thermostat_id} value={item.thermostat_id}>{item.name}</MenuItem>)}
              </Select>
            )}
            <Tooltip title="Refresh"><IconButton color="inherit" onClick={() => void refresh()}><RefreshCw size={20} /></IconButton></Tooltip>
            <IconButton color="inherit" onClick={(event) => setAnchor(event.currentTarget)} aria-label="Open menu">
              <Badge badgeContent={unread} color="error"><EllipsisVertical size={22} /></Badge>
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              {Object.keys(data?.ecobee_thermostat ?? {}).length > 1 && <MenuItem onClick={() => { setAnchor(null); setSwitcherOpen(true); }}><ArrowLeftRight size={18} /> Switch Thermostat</MenuItem>}
              {!config.isDemo && <MenuItem onClick={() => { setAnchor(null); navigate('/contribute'); }}><Heart size={18} /> Support beestat</MenuItem>}
              <MenuItem onClick={() => { setAnchor(null); navigate('/announcements'); }}><Badge badgeContent={unread} color="error" sx={{ '& .MuiBadge-badge': { right: -8, top: 1 } }}><Bell size={18} /></Badge> Announcements</MenuItem>
              {hasThermostats && <MenuItem onClick={() => { setAnchor(null); navigate('/download'); }}><Download size={18} /> Download Data</MenuItem>}
              <MenuItem onClick={() => { setAnchor(null); navigate('/settings'); }}><Settings size={18} /> Settings</MenuItem>
              {(platform === 'ios' || platform === 'android') && <MenuItem component="a" href="ecobee://beestat"><ExternalLink size={18} /> Open Ecobee App</MenuItem>}
              {data?.user?.settings?.glenwood_enrolled !== undefined && <MenuItem onClick={() => window.location.assign('/?layer=glenwood_enroll')}><Building2 size={18} /> Glenwood Enrollment</MenuItem>}
              {[1, 39285, 50885, 51345].includes(Number(data?.user?.user_id)) && <MenuItem onClick={() => window.location.assign('/?layer=glenwood_report')}><FileChartColumn size={18} /> Glenwood Report</MenuItem>}
              <MenuItem onClick={() => void logout()}><LogOut size={18} /> Log Out</MenuItem>
            </Menu>
            <Dialog open={switcherOpen} onClose={() => setSwitcherOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Change Thermostat</DialogTitle><DialogContent><Typography mb={2}>You have multiple thermostats; which one would you like to view?</Typography><List disablePadding sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>{Object.values(data?.thermostat ?? {}).sort((a, b) => a.name.localeCompare(b.name)).map((item) => <ListItemButton key={item.thermostat_id} selected={item.thermostat_id === thermostatId} onClick={() => { if (item.thermostat_id !== thermostatId) setThermostatId(item.thermostat_id); setSwitcherOpen(false); }} sx={{ bgcolor: item.thermostat_id === thermostatId ? 'primary.main' : 'background.default', borderRadius: 1 }}><ListItemText primary={item.name} /></ListItemButton>)}</List></DialogContent></Dialog>
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>{config.isDemo && <Alert icon={false} severity="info" sx={{ mt: 2, bgcolor: 'primary.main', color: '#fff' }}>This is a demo of beestat; it works exactly like the real thing. Changes you make will not be saved.</Alert>}{children}<Box component="footer" sx={{ textAlign: 'center', color: 'text.secondary', py: 2, '& a': { color: 'inherit', mx: .5 } }}><a href="https://doc.beestat.io" target="_blank">Help</a> · <a href="https://community.beestat.io" target="_blank">Feedback</a> · <a href="https://beestat.io/privacy.html" target="_blank">Privacy</a> · <a href="https://newsletter.beestat.io" target="_blank">Newsletter</a> · <a href="mailto:contact@beestat.io">Contact</a></Box></Container>
      {phone && hasThermostats && <Box component="nav" sx={{ position: 'fixed', zIndex: 1200, bottom: 0, left: 0, right: 0, height: 'calc(64px + env(safe-area-inset-bottom))', pb: 'env(safe-area-inset-bottom)', display: 'flex', bgcolor: 'background.paper', boxShadow: '0 -2px 10px rgba(0,0,0,.28)' }}>
        {navItems.map(({ path, label, icon: Icon }) => <Button key={path} component={NavLink} to={path} color="inherit" sx={{ flex: 1, minWidth: 0, flexDirection: 'column', gap: .25, fontSize: 9, color: location.pathname === path ? 'primary.light' : 'text.secondary' }}><Icon size={20} />{label}</Button>)}
      </Box>}
    </Box>
  );
}
