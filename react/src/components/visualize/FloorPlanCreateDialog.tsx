import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export interface FloorPlanDraft { name: string; floorCount: number; basement: boolean; ceilingHeight: number; addressId?: number }

export function FloorPlanCreateDialog({ open, defaultFloors, distanceUnit, addresses, busy, error, onClose, onCreate }: {
  open: boolean; defaultFloors: number; distanceUnit: string; addresses: Record<string, any>; busy: boolean; error?: string; onClose: () => void; onCreate: (draft: FloorPlanDraft) => void;
}) {
  const [name, setName] = useState('Home'); const [floorCount, setFloorCount] = useState(defaultFloors); const [basement, setBasement] = useState(false); const [ceilingHeight, setCeilingHeight] = useState(distanceUnit === 'm' ? 2.44 : 8); const [addressId, setAddressId] = useState('');
  useEffect(() => { if (open) { setName('Home'); setFloorCount(defaultFloors); setBasement(false); setCeilingHeight(distanceUnit === 'm' ? 2.44 : 8); setAddressId(''); } }, [defaultFloors, distanceUnit, open]);
  const valid = name.trim().length > 0 && floorCount >= 1 && floorCount <= 8 && ceilingHeight >= (distanceUnit === 'm' ? 1.524 : 5);
  return <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="create-floor-plan-title">
    <DialogTitle id="create-floor-plan-title">Create Floor Plan</DialogTitle>
    <DialogContent><Typography mb={2}>Describe your home to help create this floor plan.</Typography><Stack gap={2}>
      <TextField autoFocus label="Floor plan name" value={name} inputProps={{ maxLength: 255 }} onChange={(event) => setName(event.target.value)} required />
      <TextField label="Number of floors" type="number" value={floorCount} inputProps={{ min: 1, max: 8 }} onChange={(event) => setFloorCount(Number(event.target.value))} required />
      <FormControlLabel control={<Checkbox checked={basement} onChange={(event) => setBasement(event.target.checked)} />} label="One of these floors is a basement" />
      <TextField label={`Ceiling height (${distanceUnit})`} type="number" value={ceilingHeight} inputProps={{ min: distanceUnit === 'm' ? 1.524 : 5, step: distanceUnit === 'm' ? .01 : .25 }} onChange={(event) => setCeilingHeight(Number(event.target.value))} required />
      <TextField select label="Address" value={addressId} onChange={(event) => setAddressId(event.target.value)} helperText="Addresses are pulled directly from your ecobee data."><MenuItem value="">Not Listed</MenuItem>{Object.values(addresses).map((address: any) => { const components = address.normalized?.components ?? {}; const label = address.normalized?.address ?? ([components.street_address, components.city].filter(Boolean).join(', ') || `Address ${address.address_id}`); return <MenuItem key={address.address_id} value={String(address.address_id)}>{label}</MenuItem>; })}</TextField>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack></DialogContent>
    <DialogActions><Button color="inherit" onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" color="success" disabled={!valid || busy} onClick={() => onCreate({ name: name.trim(), floorCount, basement, ceilingHeight, ...(addressId ? { addressId: Number(addressId) } : {}) })}>{busy ? 'Creating…' : 'Create Floor Plan'}</Button></DialogActions>
  </Dialog>;
}
