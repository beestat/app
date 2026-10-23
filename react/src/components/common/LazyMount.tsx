import { Box, Skeleton } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

export function LazyMount({ children, minHeight = 420 }: { children: React.ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '500px 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  return <Box ref={ref} sx={{ minHeight }}>{visible ? children : <Skeleton variant="rounded" height={minHeight} />}</Box>;
}
