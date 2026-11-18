import React, { useEffect, useState } from 'react';
import { BellRing, Share, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { enablePush, getPushState, PushState } from '../../services/push';
import { showToast } from './CommonUI';
import { springPop } from '../../lib/gestures';

const DISMISS_KEY = 'awm-push-prompt-dismissed';

const wasDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * A one-time card inviting the signed-in user to turn on phone notifications.
 * Browsers only show the permission dialog after a tap, so this gives people that tap.
 * On iPhone (not yet installed) it explains "Add to Home Screen" instead.
 */
export const PushPrompt: React.FC = () => {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wasDismissed()) return;
    const t = setTimeout(() => {
      getPushState()
        .then((s) => {
          if (s === 'disabled' || s === 'needs-install') setState(s);
        })
        .catch(() => undefined);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode: just hide for this visit */
    }
    setState(null);
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      const next = await enablePush();
      if (next === 'enabled') {
        showToast('Notifications are on. You can send a test from Settings.');
        dismiss();
      } else if (next === 'denied') {
        showToast('Notifications are blocked. Allow them in your browser settings.', 'error');
        dismiss();
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          role="dialog"
          aria-label="Turn on notifications"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96, transition: { duration: 0.18 } }}
          transition={springPop}
          className="fixed left-3 right-3 sm:left-auto sm:right-5 sm:w-96 bottom-28 sm:bottom-32 z-[60] glass-strong rounded-3xl p-4 text-xs"
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-900/5"
            aria-label="Not now"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="w-10 h-10 rounded-2xl bg-[#F0EEFC] text-[#7155E8] flex items-center justify-center shrink-0">
              {state === 'needs-install' ? <Share className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <span className="block font-bold text-sm text-[#171717]">Get notified on your phone</span>
              {state === 'needs-install' ? (
                <p className="text-neutral-500 mt-1 leading-relaxed">
                  Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Open Fitness With Oliul Azim from your Home
                  Screen and turn notifications on in Settings.
                </p>
              ) : (
                <p className="text-neutral-500 mt-1 leading-relaxed">
                  Plan updates, meal reviews and payment confirmations, even when the app is closed.
                </p>
              )}
            </div>
          </div>
          {state === 'disabled' && (
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={dismiss} className="px-3 py-2 rounded-xl font-semibold text-neutral-500 hover:bg-neutral-900/5">
                Not now
              </button>
              <button
                type="button"
                onClick={turnOn}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-[#7155E8] text-white font-bold disabled:opacity-60"
              >
                {busy ? 'Turning on…' : 'Turn on'}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
