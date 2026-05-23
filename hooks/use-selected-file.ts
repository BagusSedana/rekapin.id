"use client";

import { useState } from "react";

export function useSelectedFile() {
  const [file, setFile] = useState<File | null>(null);

  return {
    file,
    setFile,
    clearFile: () => setFile(null),
  };
}

