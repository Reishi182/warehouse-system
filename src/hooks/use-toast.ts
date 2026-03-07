import { toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import React from 'react';

/**
 * Clean toast wrapper using Sonner
 * Styled via sonner.tsx Toaster classNames
 */

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  /** Navigation link for "Lihat Detail" button. Supports ?highlight=<id> for product highlighting */
  link?: string;
  /** Custom duration in ms */
  duration?: number;
}

function showToast(props: ToastProps) {
  const { title, description, variant = 'default', link, duration } = props;

  // Build action button if link provided
  // Uses window.location.hash because this runs outside React Router context
  // and the app uses HashRouter, so hash-based navigation is correct
  const action = link ? {
    label: 'Lihat Detail →',
    onClick: () => {
      window.location.hash = link;
    },
  } : undefined;

  const defaultDurations = {
    default: 4000,
    success: 3500,
    destructive: 5000,
    warning: 4500,
    info: 4000,
  };

  const finalDuration = duration || defaultDurations[variant] || 4000;

  // Use Sonner's built-in toast types
  switch (variant) {
    case 'destructive':
      return sonnerToast.error(title, {
        description,
        duration: finalDuration,
        action,
        icon: React.createElement(XCircle, { className: 'w-5 h-5 text-red-500' }),
      });

    case 'success':
      return sonnerToast.success(title, {
        description,
        duration: finalDuration,
        action,
        icon: React.createElement(CheckCircle, { className: 'w-5 h-5 text-emerald-500' }),
      });

    case 'warning':
      return sonnerToast.warning(title, {
        description,
        duration: finalDuration,
        action,
        icon: React.createElement(AlertTriangle, { className: 'w-5 h-5 text-amber-500' }),
      });

    case 'info':
      return sonnerToast.info(title, {
        description,
        duration: finalDuration,
        action,
        icon: React.createElement(Info, { className: 'w-5 h-5 text-blue-500' }),
      });

    default:
      return sonnerToast(title, {
        description,
        duration: finalDuration,
        action,
        icon: React.createElement(CheckCircle, { className: 'w-5 h-5 text-primary' }),
      });
  }
}

function useToast() {
  return {
    toast: showToast,
    dismiss: sonnerToast.dismiss,
    toasts: [],
  };
}

export { useToast, showToast as toast };
