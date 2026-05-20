import { useRef, useEffect, useCallback } from 'react';

/**
 * useSwipeGesture — detect horizontal/vertical swipe gestures
 * @param {Object} options
 * @param {number} options.threshold — minimum swipe distance in px (default 80)
 * @param {function} options.onSwipeLeft — callback for left swipe
 * @param {function} options.onSwipeRight — callback for right swipe
 * @param {function} options.onSwipeUp — callback for up swipe
 * @param {function} options.onSwipeDown — callback for down swipe
 * @returns {Object} touch event handlers
 */
export function useSwipeGesture({
  threshold = 80,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
} = {}) {
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const isSwiping = useRef(false);

  const onTouchStart = useCallback((e) => {
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    touchEnd.current = { x: 0, y: 0 };
    isSwiping.current = true;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!isSwiping.current) return;
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    const dx = touchEnd.current.x - touchStart.current.x;
    const dy = touchEnd.current.y - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Only trigger if swipe exceeds threshold
    if (absDx < threshold && absDy < threshold) return;

    // Determine primary direction
    if (absDx > absDy) {
      // Horizontal swipe
      if (dx > 0 && onSwipeRight) onSwipeRight();
      else if (dx < 0 && onSwipeLeft) onSwipeLeft();
    } else {
      // Vertical swipe
      if (dy > 0 && onSwipeDown) onSwipeDown();
      else if (dy < 0 && onSwipeUp) onSwipeUp();
    }
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/**
 * usePullToRefresh — detect pull-to-refresh gesture
 * @param {function} onRefresh — callback when pull threshold is reached
 * @param {number} threshold — pull distance in px to trigger refresh (default 100)
 * @returns {Object} touch event handlers and pull progress (0-1)
 */
export function usePullToRefresh(onRefresh, threshold = 100) {
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);
  const hasTriggered = useRef(false);
  const scrollContainer = useRef(null);

  const onTouchStart = useCallback((e) => {
    const container = e.currentTarget;
    scrollContainer.current = container;
    // Only allow pull-to-refresh when scrolled to top
    if (container.scrollTop > 0) return;
    startY.current = e.targetTouches[0].clientY;
    isPulling.current = true;
    hasTriggered.current = false;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!isPulling.current) return;
    currentY.current = e.targetTouches[0].clientY - startY.current;
    // Only allow downward pull
    if (currentY.current < 0) {
      isPulling.current = false;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (currentY.current >= threshold && !hasTriggered.current) {
      hasTriggered.current = true;
      onRefresh?.();
    }

    currentY.current = 0;
  }, [threshold, onRefresh]);

  const pullProgress = Math.min(1, Math.max(0, currentY.current / threshold));

  return { onTouchStart, onTouchMove, onTouchEnd, pullProgress };
}
