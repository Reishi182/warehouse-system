import toast, { Toaster } from 'react-hot-toast';

/**
 * Wrapper hook for react-hot-toast that maintains the same API
 * as the original shadcn/ui toast for backwards compatibility.
 */

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

function showToast(props: ToastProps) {
  const { title, description, variant } = props;
  const message = title + (description ? `: ${description}` : '');

  if (variant === 'destructive') {
    return toast.error(message, {
      duration: 5000,
      style: {
        background: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #fecaca',
      },
    });
  }

  if (variant === 'success') {
    return toast.success(message, {
      duration: 4000,
      style: {
        background: '#dcfce7',
        color: '#166534',
        border: '1px solid #bbf7d0',
      },
    });
  }

  // Default toast
  return toast(message, {
    duration: 4000,
    style: {
      background: '#fff',
      color: '#1f2937',
      border: '1px solid #e5e7eb',
    },
  });
}

function useToast() {
  return {
    toast: showToast,
    dismiss: toast.dismiss,
    toasts: [], // For backwards compatibility - not used with react-hot-toast
  };
}

export { useToast, showToast as toast, Toaster };
