import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // Centered at top
      "fixed top-0 left-1/2 -translate-x-1/2 z-[100] flex max-h-screen w-full flex-col items-center gap-3 p-4 md:max-w-[480px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  cn(
    "group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden",
    "rounded-2xl border p-4 pr-12 shadow-xl",
    "backdrop-blur-xl",
    "transition-all duration-300 ease-out",
    "data-[swipe=cancel]:translate-x-0",
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[swipe=end]:animate-out data-[state=closed]:fade-out-80",
    "data-[state=closed]:slide-out-to-top-full",
    "data-[state=open]:slide-in-from-top-full"
  ),
  {
    variants: {
      variant: {
        default: cn(
          "border-border/60 bg-card/95 text-foreground",
          "dark:bg-slate-800/95 dark:border-slate-700/60"
        ),
        success: cn(
          "border-emerald-200 bg-emerald-50/95 text-emerald-900",
          "dark:border-emerald-800/60 dark:bg-emerald-950/95 dark:text-emerald-100"
        ),
        destructive: cn(
          "border-red-200 bg-red-50/95 text-red-900",
          "dark:border-red-800/60 dark:bg-red-950/95 dark:text-red-100"
        ),
        warning: cn(
          "border-amber-200 bg-amber-50/95 text-amber-900",
          "dark:border-amber-800/60 dark:bg-amber-950/95 dark:text-amber-100"
        ),
        info: cn(
          "border-blue-200 bg-blue-50/95 text-blue-900",
          "dark:border-blue-800/60 dark:bg-blue-950/95 dark:text-blue-100"
        ),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconMap = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconBgMap = {
  default: "bg-primary/10 text-primary dark:bg-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  destructive: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  warning: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  info: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant = "default", children, ...props }, ref) => {
  const Icon = iconMap[variant || "default"];
  const iconBg = iconBgMap[variant || "default"];

  return (
    <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      <div className={cn("flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium",
      "bg-background/50 hover:bg-background transition-colors",
      "dark:bg-slate-700/50 dark:hover:bg-slate-700",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5",
      "text-foreground/40 hover:text-foreground",
      "bg-transparent hover:bg-foreground/10",
      "dark:hover:bg-white/10",
      "transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-ring",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-tight", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-80 mt-0.5 leading-relaxed", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
