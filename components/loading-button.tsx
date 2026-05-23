"use client";

import clsx from "clsx";
import { useFormStatus } from "react-dom";

type LoadingButtonProps = {
  idleText: string;
  loadingText: string;
  className?: string;
};

export function LoadingButton({
  idleText,
  loadingText,
  className,
}: LoadingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {pending ? loadingText : idleText}
    </button>
  );
}

