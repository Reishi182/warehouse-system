import { toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import React from 'react';

/**
 * Clean toast wrapper using Sonner
 * Simple white/yellow design with icons
 */

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  link?: string;
}

function showToast(props: ToastProps) {
  const { title, description, variant = 'default', link } = props;

  // Build action button if link provided
  const action = link ? {
    label: 'Lihat Detail',
    onClick: () => {
      window.location.hash = link;
    },
  } : undefined;

  // Use Sonner's built-in toast types
  switch (variant) {
    case 'destructive':
      return sonnerToast.error(title, {
        description,
        duration: 5000,
        action,
        icon: React.createElement(XCircle, { className: 'w-5 h-5 text-red-500' }),
      });

    case 'success':
      return sonnerToast.success(title, {
        description,
        duration: 4000,
        action,
        icon: React.createElement(CheckCircle, { className: 'w-5 h-5 text-green-500' }),
      });

    case 'warning':
      return sonnerToast.warning(title, {
        description,
        duration: 4000,
        action,
        icon: React.createElement(AlertTriangle, { className: 'w-5 h-5 text-amber-500' }),
      });

    case 'info':
      return sonnerToast.info(title, {
        description,
        duration: 4000,
        action,
        icon: React.createElement(Info, { className: 'w-5 h-5 text-blue-500' }),
      });

    default:
      return sonnerToast(title, {
        description,
        duration: 4000,
        action,
        icon: React.createElement(Info, { className: 'w-5 h-5 text-primary' }),
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
