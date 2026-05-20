import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1512,
};

function getBreakpoint(width) {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.laptop) return 'laptop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

export function useResponsive() {
  const [win, setWin] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    bp: getBreakpoint(window.innerWidth),
    isMobile: window.innerWidth < BREAKPOINTS.tablet,
    isTablet: window.innerWidth >= BREAKPOINTS.tablet && window.innerWidth < BREAKPOINTS.laptop,
    isLaptop: window.innerWidth >= BREAKPOINTS.laptop && window.innerWidth < BREAKPOINTS.desktop,
    isDesktop: window.innerWidth >= BREAKPOINTS.desktop,
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    safeBottom: 0,
  }));

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setWin({
        width: w,
        height: window.innerHeight,
        bp: getBreakpoint(w),
        isMobile: w < BREAKPOINTS.tablet,
        isTablet: w >= BREAKPOINTS.tablet && w < BREAKPOINTS.laptop,
        isLaptop: w >= BREAKPOINTS.laptop && w < BREAKPOINTS.desktop,
        isDesktop: w >= BREAKPOINTS.desktop,
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        safeBottom: 0,
      });
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return win;
}
