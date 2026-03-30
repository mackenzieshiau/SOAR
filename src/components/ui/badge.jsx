import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "border-transparent bg-slate-950 text-white",
  secondary: "border-transparent bg-slate-100 text-slate-800",
  lilac: "border-violet-200 bg-violet-50 text-violet-900",
  outline: "border-slate-200 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide",
      badgeVariants[variant],
      className,
    )}
    {...props}
  />
));
Badge.displayName = "Badge";

export { Badge };
