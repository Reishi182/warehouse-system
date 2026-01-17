import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "group-[.toaster]:bg-card group-[.toaster]:text-foreground",
            "group-[.toaster]:border-border group-[.toaster]:shadow-xl",
            "group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-xl",
            "dark:group-[.toaster]:bg-slate-800/95 dark:group-[.toaster]:border-slate-700/60",
          ].join(" "),
          description: "group-[.toast]:text-muted-foreground",
          actionButton: [
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            "group-[.toast]:rounded-lg group-[.toast]:font-medium",
          ].join(" "),
          cancelButton: [
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            "group-[.toast]:rounded-lg",
          ].join(" "),
          success: [
            "group-[.toaster]:bg-emerald-50/95 group-[.toaster]:text-emerald-900",
            "group-[.toaster]:border-emerald-200",
            "dark:group-[.toaster]:bg-emerald-950/95 dark:group-[.toaster]:text-emerald-100",
            "dark:group-[.toaster]:border-emerald-800/60",
          ].join(" "),
          error: [
            "group-[.toaster]:bg-red-50/95 group-[.toaster]:text-red-900",
            "group-[.toaster]:border-red-200",
            "dark:group-[.toaster]:bg-red-950/95 dark:group-[.toaster]:text-red-100",
            "dark:group-[.toaster]:border-red-800/60",
          ].join(" "),
          warning: [
            "group-[.toaster]:bg-amber-50/95 group-[.toaster]:text-amber-900",
            "group-[.toaster]:border-amber-200",
            "dark:group-[.toaster]:bg-amber-950/95 dark:group-[.toaster]:text-amber-100",
            "dark:group-[.toaster]:border-amber-800/60",
          ].join(" "),
          info: [
            "group-[.toaster]:bg-blue-50/95 group-[.toaster]:text-blue-900",
            "group-[.toaster]:border-blue-200",
            "dark:group-[.toaster]:bg-blue-950/95 dark:group-[.toaster]:text-blue-100",
            "dark:group-[.toaster]:border-blue-800/60",
          ].join(" "),
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
