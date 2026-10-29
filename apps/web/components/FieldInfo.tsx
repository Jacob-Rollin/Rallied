"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

type Props = {
  label: string;
  children: React.ReactNode;
};

type Placement = "top" | "bottom";

/**
 * Compact circle-i control that opens a short popover on click/tap (not hover-only).
 * Prefers opening above the label so the field input stays visible; flips down only
 * when there is not enough room near the viewport top. Mobile-friendly: tap outside
 * or Escape closes.
 */
export function FieldInfo({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>("top");
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const tip = tipRef.current;
    if (!root || !tip) return;

    const gap = 8;
    const rootRect = root.getBoundingClientRect();
    const tipHeight = tip.offsetHeight;
    const spaceAbove = rootRect.top - gap;
    // Prefer above so the input under the label is never covered. Flip only when
    // the tip would clip past the top of the viewport.
    setPlacement(spaceAbove >= tipHeight ? "top" : "bottom");
  }, [open, children]);

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
        className="relative top-px inline-flex size-[15px] shrink-0 items-center justify-center rounded-sm text-muted/70 transition-colors hover:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={tipId}
        aria-haspopup="true"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="15"
          height="15"
          fill="none"
          className="block"
        >
          <circle
            cx="8"
            cy="8"
            r="6.5"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M8 7.1v3.7"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinecap="round"
          />
          <circle cx="8" cy="5.05" r="0.7" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <span
          ref={tipRef}
          id={tipId}
          role="tooltip"
          className={`absolute left-0 z-40 w-[min(16.5rem,calc(100vw-2.5rem))] max-w-[calc(100vw-2.5rem)] rounded-brand border border-white/15 bg-slate-elevated px-3 py-2.5 text-xs leading-relaxed text-white/90 shadow-lg shadow-black/40 ${
            placement === "top"
              ? "bottom-[calc(100%+0.45rem)]"
              : "top-[calc(100%+0.45rem)]"
          }`}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
