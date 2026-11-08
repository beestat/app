import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, InputAdornment, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { Building2, HousePlus, Layers3, MapPin, Plus, Ruler } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface FloorPlanDraft { name: string; floorCount: number; basement: boolean; ceilingHeight: number; addressId?: number }

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <Stack direction="row" alignItems="center" gap={1} mb={1.25} color="text.secondary">{icon}<Typography variant="overline" color="inherit">{children}</Typography></Stack>;
}

export function FloorPlanCreateDialog({ open, defaultFloors, distanceUnit, addresses, busy, error, onClose, onCreate }: {
  open: boolean; defaultFloors: number; distanceUnit: string; addresses: Record<string, any>; busy: boolean; error?: string; onClose: () => void; onCreate: (draft: FloorPlanDraft) => void;
}) {
  const validAddresses = Object.values(addresses).filter((address: any) => address.normalized !== null);
  const defaultAddressId = validAddresses.length === 1 ? String((validAddresses[0] as any).address_id) : '';
  const [name, setName] = useState('Home');
  const [floorCount, setFloorCount] = useState(defaultFloors);
  const [basement, setBasement] = useState(false);
  const [ceilingHeight, setCeilingHeight] = useState(distanceUnit === 'm' ? 2.44 : 8);
  const [addressId, setAddressId] = useState('');
  useEffect(() => {
    if (!open) return;
    setName('Home');
    setFloorCount(defaultFloors);
    setBasement(false);
    setCeilingHeight(distanceUnit === 'm' ? 2.44 : 8);
    setAddressId(defaultAddressId);
  }, [defaultAddressId, defaultFloors, distanceUnit, open]);
  const floorsValid = floorCount >= 1 && floorCount <= 8;
  const heightValid = ceilingHeight >= (distanceUnit === 'm' ? 1.524 : 5);
  const valid = name.trim().length > 0 && floorsValid && heightValid;
  const floorSummary = `${floorCount || 0} ${floorCount === 1 ? 'floor' : 'floors'}${basement ? ', including a basement' : ''}`;

  return <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="create-floor-plan-title">
    <DialogTitle id="create-floor-plan-title">
      <Stack direction="row" alignItems="center" gap={1.5}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 1.25, bgcolor: 'primary.main', color: 'primary.contrastText' }}><HousePlus size={21} /></Box>
        <Box><Typography component="span" variant="h6" display="block">Create Floor Plan</Typography><Typography component="span" variant="body2" color="text.secondary">Set up the basic structure of your home.</Typography></Box>
      </Stack>
    </DialogTitle>
    <DialogContent dividers>
      <Stack gap={2.5}>
        <Box>
          <SectionTitle icon={<Building2 size={17} />}>Plan details</SectionTitle>
          <Stack gap={1.5}>
            <TextField autoFocus size="small" label="Floor plan name" value={name} disabled={busy} slotProps={{ htmlInput: { maxLength: 255 } }} onChange={(event) => setName(event.target.value)} required />
            <TextField select size="small" label="Home address" value={addressId} disabled={busy} onChange={(event) => setAddressId(event.target.value)} helperText="Optional; addresses come from your ecobee account." slotProps={{ htmlInput: { 'aria-label': 'What is the address for this home?' } }}>
              <MenuItem value="">Not listed</MenuItem>
              {validAddresses.map((address: any) => {
                const normalized = address.normalized ?? {};
                const label = normalized.components?.country_iso_3 === 'USA' ? normalized.delivery_line_1 : normalized.address1;
                return <MenuItem key={address.address_id} value={String(address.address_id)}>{label || `Address ${address.address_id}`}</MenuItem>;
              })}
            </TextField>
          </Stack>
        </Box>
        <Box>
          <SectionTitle icon={<Layers3 size={17} />}>Home structure</SectionTitle>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <TextField size="small" label="Number of floors" type="number" value={floorCount} disabled={busy} error={!floorsValid} helperText={floorsValid ? 'Up to eight floors.' : 'Enter 1–8 floors.'} slotProps={{ htmlInput: { min: 1, max: 8 } }} onChange={(event) => setFloorCount(Number(event.target.value))} required />
            <TextField size="small" label="Typical ceiling height" type="number" value={ceilingHeight} disabled={busy} error={!heightValid} helperText={heightValid ? 'Used as the default for each floor.' : `Minimum ${distanceUnit === 'm' ? 1.524 : 5} ${distanceUnit}.`} slotProps={{ htmlInput: { min: distanceUnit === 'm' ? 1.524 : 5, step: distanceUnit === 'm' ? .01 : .25 }, input: { endAdornment: <InputAdornment position="end">{distanceUnit}</InputAdornment> } }} onChange={(event) => setCeilingHeight(Number(event.target.value))} required />
          </Box>
          <FormControlLabel sx={{ mt: .5, ml: 0, mr: 0, px: 1.25, py: .5, width: '100%', borderRadius: 1, bgcolor: 'surface.subtle', '& .MuiFormControlLabel-label': { flex: 1 } }} control={<Checkbox checked={basement} disabled={busy} onChange={(event) => setBasement(event.target.checked)} />} label={<Box><Typography variant="body2" fontWeight={600}>Include a basement</Typography><Typography variant="caption" color="text.secondary">The lowest floor will be placed below grade.</Typography></Box>} />
        </Box>
        <Stack direction="row" alignItems="center" gap={1.25} sx={{ p: 1.25, borderRadius: 1, bgcolor: 'surface.subtle', color: 'text.secondary' }}>
          <Ruler size={18} /><Typography variant="body2"><Box component="span" color="text.primary" fontWeight={600}>{floorSummary}</Box> with {ceilingHeight || 0} {distanceUnit} ceilings.</Typography>
          {addressId && <MapPin size={17} />}
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DialogContent>
    <DialogActions><Button color="inherit" onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" color="success" startIcon={<Plus />} disabled={!valid || busy} onClick={() => onCreate({ name: name.trim(), floorCount, basement, ceilingHeight, ...(addressId ? { addressId: Number(addressId) } : {}) })}>{busy ? 'Creating…' : 'Create Floor Plan'}</Button></DialogActions>
  </Dialog>;
}
