"use client";

import { useState, useTransition } from "react";

export function useAsyncAction() {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return {
    isPending,
    message,
    setMessage,
    run(action: () => Promise<string | void>) {
      startTransition(async () => {
        try {
          const result = await action();
          if (result) setMessage(result);
        } catch {
          setMessage("Terjadi kendala. Coba lagi sebentar.");
        }
      });
    },
  };
}

