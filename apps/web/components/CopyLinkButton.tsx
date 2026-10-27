"use client";

import { useState } from "react";

type Props = {
  url: string;
  label?: string;
};

export function CopyLinkButton({ url, label = "Copy link" }: Props) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-brand border border-lime/40 px-3 py-1.5 text-sm font-semibold text-lime transition hover:bg-lime/10"
    >
      {done ? "Copied" : label}
    </button>
  );
}
