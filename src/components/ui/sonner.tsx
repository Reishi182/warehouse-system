import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Redesigned toast component using Sonner
 * Clean, modern design with accent borders and smooth animations
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={false}
      closeButton
      visibleToasts={4}
      gap={8}
      richColors={false}
      dir="ltr"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "!bg-white !text-slate-900 !border !border-slate-200/80",
            "!shadow-xl !shadow-black/5 !rounded-2xl !p-4",
            "dark:!bg-slate-900 dark:!text-slate-100 dark:!border-slate-700/80",
            "!backdrop-blur-sm",
          ].join(" "),
          title: "!font-semibold !text-[13px] !leading-tight",
          description: "!text-[12px] !text-slate-500 dark:!text-slate-400 !mt-1 !leading-relaxed",
          actionButton: [
            "!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900",
            "!px-3.5 !py-1.5 !rounded-xl !font-medium !text-xs",
            "!shadow-sm hover:!opacity-90 !transition-opacity",
            "!border-0 !no-underline",
          ].join(" "),
          cancelButton: [
            "!bg-slate-100 !text-slate-600",
            "!px-3 !py-1.5 !rounded-xl !text-xs",
            "dark:!bg-slate-800 dark:!text-slate-400",
          ].join(" "),
          closeButton: [
            "!bg-slate-100/80 !border-slate-200 !text-slate-400",
            "hover:!bg-slate-200 hover:!text-slate-600",
            "dark:!bg-slate-800 dark:!border-slate-700 dark:!text-slate-500",
            "!transition-colors",
          ].join(" "),
          success: [
            "!border-l-4 !border-l-emerald-500 !border-t-slate-200/80 !border-r-slate-200/80 !border-b-slate-200/80",
            "dark:!border-l-emerald-400 dark:!border-t-slate-700/80 dark:!border-r-slate-700/80 dark:!border-b-slate-700/80",
          ].join(" "),
          error: [
            "!border-l-4 !border-l-red-500 !border-t-slate-200/80 !border-r-slate-200/80 !border-b-slate-200/80",
            "dark:!border-l-red-400 dark:!border-t-slate-700/80 dark:!border-r-slate-700/80 dark:!border-b-slate-700/80",
          ].join(" "),
          warning: [
            "!border-l-4 !border-l-amber-500 !border-t-slate-200/80 !border-r-slate-200/80 !border-b-slate-200/80",
            "dark:!border-l-amber-400 dark:!border-t-slate-700/80 dark:!border-r-slate-700/80 dark:!border-b-slate-700/80",
          ].join(" "),
          info: [
            "!border-l-4 !border-l-blue-500 !border-t-slate-200/80 !border-r-slate-200/80 !border-b-slate-200/80",
            "dark:!border-l-blue-400 dark:!border-t-slate-700/80 dark:!border-r-slate-700/80 dark:!border-b-slate-700/80",
          ].join(" "),
          icon: "!w-5 !h-5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
