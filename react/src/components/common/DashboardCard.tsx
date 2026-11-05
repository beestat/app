import { Card, CardContent, CardHeader, Skeleton } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: ReactNode;
  subheader?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
}

export function DashboardCard({ title, subheader, action, children, loading, sx, contentSx }: DashboardCardProps) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={action}
        titleTypographyProps={{ variant: 'h6', sx: subheader ? { mb: .5 } : undefined }}
        subheaderTypographyProps={{ variant: 'body1' }}
        sx={{ pb: subheader ? .5 : 2 }}
      />
      <CardContent sx={[{ pt: 0 }, ...(Array.isArray(contentSx) ? contentSx : [contentSx])]}>
        {loading ? <><Skeleton height={34} /><Skeleton height={120} /><Skeleton height={34} /></> : children}
      </CardContent>
    </Card>
  );
}
