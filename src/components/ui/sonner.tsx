import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Clean toast component using Sonner
 * White/yellow color scheme, simple and clean
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={false}
      visibleToasts={5}
      gap={8}
      richColors={false}
      dir="ltr"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "bg-white text-slate-900 border border-slate-200",
            "shadow-lg rounded-xl p-4",
            "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700",
          ].join(" "),
          title: "font-semibold text-sm",
          description: "text-sm text-slate-600 dark:text-slate-400",
          actionButton: [
            "bg-primary text-primary-foreground",
            "px-3 py-1.5 rounded-lg font-medium text-sm",
            "hover:bg-primary/90 transition-colors",
          ].join(" "),
          cancelButton: [
            "bg-slate-100 text-slate-600",
            "px-3 py-1.5 rounded-lg text-sm",
            "dark:bg-slate-800 dark:text-slate-400",
          ].join(" "),
          success: [
            "bg-white border-green-200",
            "dark:bg-slate-900 dark:border-green-800",
          ].join(" "),
          error: [
            "bg-white border-red-200",
            "dark:bg-slate-900 dark:border-red-800",
          ].join(" "),
          warning: [
            "bg-white border-amber-200",
            "dark:bg-slate-900 dark:border-amber-800",
          ].join(" "),
          info: [
            "bg-white border-blue-200",
            "dark:bg-slate-900 dark:border-blue-800",
          ].join(" "),
          icon: "w-5 h-5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
