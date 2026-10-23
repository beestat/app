import { useMemo, useState } from 'react';
import { AppBar, Avatar, Badge, Box, Button, Container, Divider, IconButton, Menu, MenuItem, Select, Toolbar, Tooltip, useMediaQuery } from '@mui/material';
import { Activity, Bell, Building2, ChartNoAxesCombined, Download, EllipsisVertical, Eye, FileChartColumn, Heart, LogOut, PanelsTopLeft, RefreshCw, Settings, Wind } from 'lucide-react';
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
  const unread = useMemo(() => {
    if (location.pathname === '/announcements') return 0;
    const lastRead = Number(data?.user?.settings?.last_read_announcement_id ?? 0);
    return Object.values(data?.announcement ?? {}).filter((item: any) => Number(item.announcement_id) > lastRead).length;
  }, [data?.announcement, data?.user?.settings?.last_read_announcement_id, location.pathname]);

  const logout = async () => {
    try { await apiCall({ resource: 'user', method: 'log_out' }); } finally { window.location.assign('/'); }
  };

  return (
    <Box sx={{ minHeight: '100dvh', pb: phone ? 10 : 3 }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.default', backgroundImage: 'none' }}>
        <Container maxWidth="xl" disableGutters={phone}>
          <Toolbar sx={{ gap: 1, minHeight: { xs: 58, sm: 70 } }}>
            <Box component={NavLink} to="/detail" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', mr: 1 }}>
              <Avatar src="/favicon.png" alt="beestat" sx={{ width: 38, height: 38 }} />
              {!compact && <Box component="span" sx={{ color: '#fff', fontSize: 22, fontWeight: 500, ml: 1 }}>beestat</Box>}
            </Box>
            {!phone && <Box component="nav" sx={{ display: 'flex', gap: .5, flex: 1 }}>
              {navItems.map(({ path, label, icon: Icon }) => (
                <Button key={path} component={NavLink} to={path} color="inherit" startIcon={<Icon size={18} />} sx={{
                  minWidth: compact ? 42 : undefined, px: compact ? 1 : 1.5,
                  bgcolor: location.pathname === path ? 'background.paper' : 'transparent',
                  '&:hover': { bgcolor: 'background.paper' },
                }}>{compact ? null : label}</Button>
              ))}
            </Box>}
            <Box sx={{ flex: phone ? 1 : 0 }} />
            {Object.keys(data?.thermostat ?? {}).length > 1 && (
              <Select size="small" value={thermostatId ?? ''} onChange={(event) => setThermostatId(Number(event.target.value))} sx={{ minWidth: phone ? 115 : 170 }}>
                {Object.values(data?.thermostat ?? {}).map((item) => <MenuItem key={item.thermostat_id} value={item.thermostat_id}>{item.name}</MenuItem>)}
              </Select>
            )}
            <Tooltip title="Refresh"><IconButton color="inherit" onClick={() => void refresh()}><RefreshCw size={20} /></IconButton></Tooltip>
            <IconButton color="inherit" onClick={(event) => setAnchor(event.currentTarget)} aria-label="Open menu">
              <Badge badgeContent={unread} color="error"><EllipsisVertical size={22} /></Badge>
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem onClick={() => { setAnchor(null); navigate('/contribute'); }}><Heart size={18} /> Support beestat</MenuItem>
              <MenuItem onClick={() => { setAnchor(null); navigate('/announcements'); }}><Bell size={18} /> Announcements</MenuItem>
              <MenuItem onClick={() => { setAnchor(null); navigate('/download'); }}><Download size={18} /> Download Data</MenuItem>
              <MenuItem onClick={() => { setAnchor(null); navigate('/settings'); }}><Settings size={18} /> Settings</MenuItem>
              {data?.user?.settings?.glenwood_enrolled !== undefined && <MenuItem onClick={() => window.location.assign('/?layer=glenwood_enroll')}><Building2 size={18} /> Glenwood Enrollment</MenuItem>}
              {[1, 39285, 50885, 51345].includes(Number(data?.user?.user_id)) && <MenuItem onClick={() => window.location.assign('/?layer=glenwood_report')}><FileChartColumn size={18} /> Glenwood Report</MenuItem>}
              <Divider />
              <MenuItem onClick={() => void logout()}><LogOut size={18} /> Log Out</MenuItem>
            </Menu>
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>{children}<Box component="footer" sx={{ textAlign: 'center', color: 'text.secondary', py: 2, '& a': { color: 'inherit', mx: .5 } }}><a href="https://doc.beestat.io" target="_blank">Help</a> · <a href="https://community.beestat.io" target="_blank">Feedback</a> · <a href="https://beestat.io/privacy.html" target="_blank">Privacy</a> · <a href="https://newsletter.beestat.io" target="_blank">Newsletter</a> · <a href="mailto:contact@beestat.io">Contact</a></Box></Container>
      {phone && <Box component="nav" sx={{ position: 'fixed', zIndex: 1200, bottom: 0, left: 0, right: 0, height: 'calc(64px + env(safe-area-inset-bottom))', pb: 'env(safe-area-inset-bottom)', display: 'flex', bgcolor: 'background.paper', boxShadow: '0 -2px 10px rgba(0,0,0,.28)' }}>
        {navItems.map(({ path, label, icon: Icon }) => <Button key={path} component={NavLink} to={path} color="inherit" sx={{ flex: 1, minWidth: 0, flexDirection: 'column', gap: .25, fontSize: 9, color: location.pathname === path ? 'primary.light' : 'text.secondary' }}><Icon size={20} />{label}</Button>)}
      </Box>}
    </Box>
  );
}
