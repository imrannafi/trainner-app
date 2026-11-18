import { RefObject, useEffect, useRef, useState } from 'react';

/* ============================================================================
 * Section order used for left / right swipe navigation
 * ============================================================================ */
export const TRAINER_TAB_ORDER = [
  'dashboard',
  'members',
  'fitness',
  'meal-hub',
  'payments',
  'schedule',
  'notices',
  'reports'
];

export const MEMBER_TAB_ORDER = [
  'member-dashboard',
  'member-attendance',
  'member-workout',
  'member-diet',
  'member-meallog',
  'member-progress',
  'member-schedule',
  'member-payments',
  'member-notices'
];

/* ============================================================================
 * Navigation direction (1 = forward / slide from right, -1 = back)
 * Shared so route transitions can slide the way the user swiped or moved.
 * ============================================================================ */
let navDirection = 0;
export const getNavDirection = () => navDirection;
export const setNavDirection = (dir: number) => {
  navDirection = dir;
};

/** Slide variants for direction-aware page transitions (use with AnimatePresence `custom`). */
export const pageVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 28, y: dir === 0 ? 8 : 0 }),
  animate: { opacity: 1, x: 0, y: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, y: dir === 0 ? -4 : 0 })
};

export const pageTransition = { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const };

/* ============================================================================
 * Helpers that keep gestures out of the way of normal interaction
 * ============================================================================ */
const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

const INTERACTIVE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-no-swipe], canvas, video, [role="slider"]';

/** True if the touch started on something that should keep its own horizontal gestures. */
const blocksHorizontalSwipe = (target: EventTarget | null, boundary: HTMLElement) => {
  let el = target as HTMLElement | null;
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.closest(INTERACTIVE_SELECTOR)) return true;
  while (el && el !== boundary) {
    const style = window.getComputedStyle(el);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
};

/** Any modal / drawer locks body scroll, so treat that as "an overlay is open". */
const overlayIsOpen = () => document.body.style.overflow === 'hidden';

/* ============================================================================
 * Horizontal swipe navigation (touch only, passive listeners => never blocks scroll)
 * ============================================================================ */
interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

export function useHorizontalSwipe(ref: RefObject<HTMLElement | null>, { onSwipeLeft, onSwipeRight, enabled = true }: SwipeOptions) {
  const handlers = useRef({ onSwipeLeft, onSwipeRight });
  handlers.current = { onSwipeLeft, onSwipeRight };

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || overlayIsOpen() || blocksHorizontalSwipe(e.target, el)) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      // Leave the outer 16px alone so the OS back / forward edge gestures keep working.
      if (t.clientX < 16 || t.clientX > window.innerWidth - 16) {
        tracking = false;
        return;
      }
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;
      const selection = window.getSelection()?.toString();
      if (selection) return;
      if (dt > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
      if (dx < 0) handlers.current.onSwipeLeft?.();
      else handlers.current.onSwipeRight?.();
    };

    const onCancel = () => {
      tracking = false;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onCancel);
    };
  }, [ref, enabled]);
}

/* ============================================================================
 * Pull down at the top of the page to refresh (touch only)
 * ============================================================================ */
export const PULL_THRESHOLD = 72;

export function usePullToRefresh(onRefresh: () => Promise<unknown>, enabled = true) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const busy = useRef(false);

  useEffect(() => {
    if (!enabled || !isTouchDevice()) return;

    let startY = 0;
    let startX = 0;
    let active = false;
    let current = 0;

    const onStart = (e: TouchEvent) => {
      if (busy.current || e.touches.length !== 1 || window.scrollY > 0 || overlayIsOpen()) {
        active = false;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [data-no-swipe], [role="dialog"]')) {
        active = false;
        return;
      }
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      active = true;
      current = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      if (window.scrollY > 0 || dy <= 0 || Math.abs(dx) > dy) {
        if (current !== 0) {
          current = 0;
          setPull(0);
        }
        return;
      }
      // Rubber-band resistance
      current = Math.min(120, dy * 0.45);
      setPull(current);
    };

    const onEnd = () => {
      if (!active) return;
      active = false;
      if (current >= PULL_THRESHOLD) {
        busy.current = true;
        setRefreshing(true);
        setPull(PULL_THRESHOLD);
        Promise.resolve(refreshRef.current())
          .catch(() => undefined)
          .finally(() => {
            busy.current = false;
            setRefreshing(false);
            setPull(0);
          });
      } else {
        setPull(0);
      }
      current = 0;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled]);

  return { pull, refreshing };
}

/* ============================================================================
 * Shared motion presets
 * ============================================================================ */
export const springPop = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.8 };
export const springSheet = { type: 'spring' as const, stiffness: 380, damping: 36 };

/** Close a drag-to-dismiss sheet when pulled far or flicked fast enough. */
export const shouldDismiss = (offset: number, velocity: number, distance = 110) =>
  offset > distance || velocity > 650;
