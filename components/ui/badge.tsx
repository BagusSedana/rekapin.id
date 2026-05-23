import { cn } from "@/lib/utils";

type BadgeTone = "green" | "yellow" | "blue" | "slate" | "red";

type BadgeProps = {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
};

const toneClassName: Record<BadgeTone, string> = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
  slate: "bg-slate-100 text-slate-700",
  red: "bg-rose-100 text-rose-800",
};

export function Badge({ children, tone = "slate", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
        toneClassName[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

