import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={id} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 transition placeholder:text-slate-400 focus:ring-2",
            error ? "border-rose-400 ring-rose-500" : "",
            className
          )}
          {...props}
        />
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";

