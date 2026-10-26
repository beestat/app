import { Box, Skeleton } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function LazyMount({ children, minHeight = 420, deferUntilIdle = false, rootMargin = '500px 0px', threshold = 0 }: {
  children: React.ReactNode;
  minHeight?: number;
  deferUntilIdle?: boolean;
  rootMargin?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible || !ref.current) return;
    let frame = 0;
    let secondFrame = 0;
    let idleCallback = 0;
    let fallbackTimer = 0;
    let cancelled = false;
    const idleWindow = window as IdleWindow;
    const reveal = () => {
      if (!deferUntilIdle) {
        setVisible(true);
        return;
      }
      // Let navigation, the floor plan editor, and browser paint settle before
      // starting the legacy WebGL engine. Its output stays identical; only its
      // expensive construction is moved out of the route-change frame.
      frame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (idleWindow.requestIdleCallback) {
            idleCallback = idleWindow.requestIdleCallback(() => { if (!cancelled) setVisible(true); }, { timeout: 1_200 });
          } else {
            fallbackTimer = window.setTimeout(() => { if (!cancelled) setVisible(true); }, 32);
          }
        });
      });
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); reveal(); }
    }, { rootMargin, threshold });
    observer.observe(ref.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
      if (idleCallback) idleWindow.cancelIdleCallback?.(idleCallback);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [deferUntilIdle, rootMargin, threshold, visible]);
  return <Box ref={ref} sx={{ minHeight }} aria-busy={!visible} data-lazy-mount data-lazy-visible={visible}>{visible ? children : <Skeleton variant="rounded" height={minHeight} animation="wave" />}</Box>;
}
