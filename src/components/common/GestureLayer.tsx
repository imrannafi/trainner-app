import React from 'react';
import { RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PULL_THRESHOLD, usePullToRefresh } from '../../lib/gestures';

/** Soft brand-tinted light that sits behind every glass surface. Purely decorative. */
export const AmbientBackdrop: React.FC = () => <div className="app-ambient" aria-hidden="true" />;

/**
 * Pull down from the very top of the page to re-sync data (touch screens only).
 * Lives in its own component so the per-frame pull state never re-renders the app.
 */
export const PullToRefresh: React.FC<{ onRefresh: () => Promise<unknown>; enabled?: boolean }> = ({
  onRefresh,
  enabled = true
}) => {
  const { pull, refreshing } = usePullToRefresh(onRefresh, enabled);
  const progress = Math.min(1, pull / PULL_THRESHOLD);
  const visible = pull > 4 || refreshing;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ptr"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.18 } }}
          className="fixed left-1/2 z-[45] pointer-events-none"
          style={{ top: 56 + pull * 0.6, x: '-50%' }}
          role="status"
          aria-live="polite"
        >
          <div
            className={`glass-strong w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              progress >= 1 || refreshing ? 'text-[#7155E8]' : 'text-neutral-400'
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
            />
            <span className="sr-only">{refreshing ? 'Refreshing' : 'Pull to refresh'}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
