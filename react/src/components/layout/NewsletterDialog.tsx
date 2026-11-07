import { Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, TextField, Typography } from '@mui/material';
import { Check, Mail } from 'lucide-react';
import { useState } from 'react';
import { apiCall } from '../../api/client';

export function NewsletterDialog({ emailAddress, onClose }: { emailAddress: string; onClose: () => void }) {
  const [email, setEmail] = useState(emailAddress);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const subscribe = async () => {
    if (!/.+@.+\..+/.test(email)) { setStatus('error'); setError('Invalid email address.'); return; }
    setStatus('submitting'); setError('');
    try {
      const response = await apiCall<{ subscribed?: boolean }>({ resource: 'mailgun', method: 'subscribe', arguments: { email_address: email } });
      if (response?.subscribed === true) setStatus('success');
      else { setStatus('error'); setError('Subscribe failed; please try again later.'); }
    } catch {
      setStatus('error'); setError('Subscribe failed; please try again later.');
    }
  };
  const complete = status === 'success';
  return <Dialog open onClose={status === 'submitting' ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle>Newsletter</DialogTitle>
    <DialogContent dividers>
      <Typography mb={2}>Interested in following beestat development? Subscribe to the newsletter for updates. Emails are sparse; only a few every year.</Typography>
      <TextField size="small" value={email} disabled={complete || status === 'submitting'} error={status === 'error'} slotProps={{ htmlInput: { 'aria-label': 'Email address' }, input: { startAdornment: <InputAdornment position="start">{complete ? <Check size={18} /> : <Mail size={18} />}</InputAdornment> } }} sx={{ width: { xs: '100%', sm: '50%' } }} onChange={(event) => { setEmail(event.target.value); if (status === 'error') { setStatus('idle'); setError(''); } }} />
      {complete && <Typography mt={2}>You are now subscribed to the beestat newsletter!</Typography>}
      {status === 'error' && <Typography mt={2} color="error">{error}</Typography>}
    </DialogContent>
    <DialogActions>{complete ? <Button variant="contained" color="success" onClick={onClose}>Close</Button> : <><Button color="inherit" disabled={status === 'submitting'} onClick={onClose}>No Thanks</Button><Button variant="contained" color="success" disabled={status === 'submitting'} onClick={() => void subscribe()}>{status === 'submitting' ? 'Subscribing…' : 'Subscribe'}</Button></>}</DialogActions>
  </Dialog>;
}
