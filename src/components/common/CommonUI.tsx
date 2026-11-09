import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

/* ============================================================================
 * GLOBAL NON-OVERLAPPING TOAST SYSTEM (Replaces native window.alert)
 * ============================================================================ */
export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type ToastListener = (toast: ToastItem) => void;
const toastListeners = new Set<ToastListener>();

export const showToast = (message: string, type: ToastType = 'success') => {
  const item: ToastItem = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    message,
    type
  };
  toastListeners.forEach((listener) => listener(item));
};

export const ToastViewport: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast: ToastListener = (item) => {
      setToasts((prev) => [...prev.slice(-2), item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 3400);
    };
    toastListeners.add(handleToast);
    return () => {
      toastListeners.delete(handleToast);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-[120] flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] border backdrop-blur-md text-xs font-medium ${
              t.type === 'error'
                ? 'bg-white/95 border-rose-200 text-rose-800'
                : t.type === 'info'
                ? 'bg-white/95 border-neutral-200 text-neutral-800'
                : 'bg-white/95 border-emerald-200 text-neutral-900'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : t.type === 'info' ? (
              <Info className="w-4 h-4 text-[#7155E8] shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded-lg transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================================
 * SAFE BODY SCROLL LOCK COUNTER FOR MODALS / DRAWERS
 * ============================================================================ */
let activeModalLocks = 0;

export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;
    activeModalLocks += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      activeModalLocks = Math.max(0, activeModalLocks - 1);
      if (activeModalLocks === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [isLocked]);
};

/* ============================================================================
 * STAT CARD
 * ============================================================================ */
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trendText?: string;
  trendPositive?: boolean;
  icon?: React.ReactNode;
  badgeText?: string;
  onClick?: () => void;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trendText,
  trendPositive,
  icon,
  badgeText,
  onClick,
  accentColor
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-neutral-200/70 rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-transform duration-200 min-w-0 ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] active:scale-[0.99]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-neutral-500 mb-3 min-w-0">
        <span className="text-xs font-semibold tracking-wide text-neutral-500 truncate">
          {title}
        </span>
        {icon && (
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors"
            style={{
              backgroundColor: accentColor ? `${accentColor}15` : '#F5F5F5',
              color: accentColor || '#7155E8'
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#171717] tracking-tight truncate">
          {value}
        </span>
        {badgeText && (
          <span className="text-[11px] font-medium text-neutral-400 font-mono truncate">
            {badgeText}
          </span>
        )}
      </div>

      {(subtitle || trendText) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-neutral-500 min-w-0">
          {trendText && (
            <span
              className={`font-semibold font-mono shrink-0 ${
                trendPositive === true
                  ? 'text-[#10B981]'
                  : trendPositive === false
                  ? 'text-[#EF4444]'
                  : 'text-[#7155E8]'
              }`}
            >
              {trendText}
            </span>
          )}
          {trendText && subtitle && (
            <span aria-hidden="true" className="text-neutral-300 shrink-0">
              ·
            </span>
          )}
          {subtitle && <span className="truncate text-neutral-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * MODAL (Animated, High Z-Index z-[100], Safe Scroll Lock)
 * ============================================================================ */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg'
}) => {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  }[maxWidth];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${widthClasses} bg-white rounded-3xl border border-neutral-100 shadow-[0_24px_64px_rgba(0,0,0,0.16)] overflow-hidden my-auto z-10 flex flex-col max-h-[88vh]`}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 sm:py-5 border-b border-neutral-100 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#171717] truncate">{title}</h3>
                {description && (
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * AVATAR WITH AUTOMATIC INITIALS FALLBACK
 * ============================================================================ */
interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = ''
}) => {
  const sizeMap = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 text-base sm:text-lg font-bold',
    xl: 'w-20 h-20 sm:w-24 sm:h-24 text-xl sm:text-2xl font-bold'
  };

  const getInitials = (str: string) => {
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return str.substring(0, 2).toUpperCase();
  };

  const [hasError, setHasError] = React.useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl overflow-hidden shrink-0 bg-[#F5F5F5] border border-neutral-200/60 text-[#7155E8] font-bold ${sizeMap[size]} ${className}`}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={name}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{getInitials(name || 'User')}</span>
      )}
    </div>
  );
};

/* ============================================================================
 * EMPTY STATE
 * ============================================================================ */
export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, description, actionText, onAction, icon }) => {
  return (
    <div className="p-10 border border-dashed border-neutral-200 rounded-3xl text-center bg-white shadow-xs">
      {icon && <div className="mx-auto mb-3 text-neutral-400 flex justify-center">{icon}</div>}
      <h4 className="text-sm font-bold text-[#171717]">{title}</h4>
      <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#7155E8] hover:bg-[#6245DE] rounded-xl transition-all shadow-xs active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
