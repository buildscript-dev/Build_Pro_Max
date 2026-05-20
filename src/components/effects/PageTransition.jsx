import React, { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';

export const PageTransition = ({ children, screenKey }) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 18, scale: 0.995 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out', clearProps: 'opacity,transform' }
    );
  }, [screenKey]);

  return (
    <div ref={ref} key={screenKey} style={{ position: 'absolute', inset: 0 }}>
      {children}
    </div>
  );
};
