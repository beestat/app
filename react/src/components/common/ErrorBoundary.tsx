import { Alert, Box, Button } from '@mui/material';
import { Component, type ReactNode } from 'react';

/**
 * Keeps a render error in one page from blanking the whole app: the header and
 * navigation stay usable and the page offers a reload. Key it by route so moving
 * to another page clears the error.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <Box sx={{ maxWidth: 720, mx: 'auto', mt: 4 }}>
      <Alert severity="error" action={<Button color="inherit" onClick={() => window.location.reload()}>Reload</Button>}>
        Something went wrong showing this page.
      </Alert>
    </Box>;
  }
}
