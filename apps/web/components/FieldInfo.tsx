"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  label: string;
  children: React.ReactNode;
};

/**
 * Compact ⓘ control that opens a short popover on click/tap (not hover-only).
 * Mobile-friendly: tap outside or Escape closes.
 */
export function FieldInfo({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent | TouchEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("touchstart", onDocPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("touchstart", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex items-center gap-1.5">
      <span>{label}</span>
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25 text-[11px] font-semibold leading-none text-muted transition hover:border-coral/60 hover:text-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span aria-hidden="true">ⓘ</span>
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-[calc(100%+0.4rem)] z-30 w-[min(18.5rem,calc(100vw-2rem))] rounded-brand border border-white/15 bg-slate-elevated px-3 py-2.5 text-xs leading-relaxed text-white/90 shadow-lg shadow-black/40"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
