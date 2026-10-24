import { Card, CardContent, CardHeader, Skeleton } from '@mui/material';
import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: ReactNode;
  subheader?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  sx?: object;
}

export function DashboardCard({ title, subheader, action, children, loading, sx }: DashboardCardProps) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={action}
        titleTypographyProps={{ variant: 'h6' }}
        subheaderTypographyProps={{ variant: 'caption' }}
        sx={{ pb: 2 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {loading ? <><Skeleton height={34} /><Skeleton height={120} /><Skeleton height={34} /></> : children}
      </CardContent>
    </Card>
  );
}
