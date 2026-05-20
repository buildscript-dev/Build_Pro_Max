import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export const PageTransition = ({ children, screenKey }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 18, scale: 0.995 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' }
    );
  }, [screenKey]);

  return (
    <div ref={ref} key={screenKey} style={{ position: 'absolute', inset: 0 }}>
      {children}
    </div>
  );
};
