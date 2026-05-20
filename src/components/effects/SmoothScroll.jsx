// Lenis removed: it intercepted wheel/touch events on window while the app
// uses overflow:hidden on body and per-screen .scroll containers — causing
// all scroll events to be swallowed before reaching the actual scroll areas.
// Native browser scroll on .scroll containers is correct for this architecture.
export function SmoothScroll({ children }) {
  return <>{children}</>;
}
