import toast, { Toaster } from 'react-hot-toast';

/**
 * Wrapper hook for react-hot-toast that maintains the same API
 * as the original shadcn/ui toast for backwards compatibility.
 */

// Global map to store links for each toast
export const toastLinks = new Map<string, string>();

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  link?: string;
}

function showToast(props: ToastProps) {
  const { title, description, variant, link } = props;
  const message = title + (description ? `: ${description}` : '');

  // Create toast and store link if provided
  let toastId: string;

  if (variant === 'destructive') {
    toastId = toast.error(message, {
      duration: 5000,
    });
  } else if (variant === 'success') {
    toastId = toast.success(message, {
      duration: 4000,
    });
  } else {
    // Default toast - use blank type for info style
    toastId = toast(message, {
      duration: 4000,
    });
  }

  // Store link in global map if provided
  if (link && toastId) {
    toastLinks.set(toastId, link);
    // Clean up after toast disappears
    setTimeout(() => {
      toastLinks.delete(toastId);
    }, 6000);
  }

  return toastId;
}

function useToast() {
  return {
    toast: showToast,
    dismiss: toast.dismiss,
    toasts: [], // For backwards compatibility - not used with react-hot-toast
  };
}

export { useToast, showToast as toast, Toaster };

