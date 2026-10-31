"use client";

import { useEffect, useId, useState } from "react";

export type NumberFieldProps = {
  value: number | null;
  onChange: (next: number | null) => void;
  min: number;
  max: number;
  step?: number;
  /**
   * Optional fields (e.g. Min Ghostless %): empty is allowed and commits as null.
   * Required fields commit empty → emptyFallback (default min) on blur.
   */
  allowEmpty?: boolean;
  /** Commit target when the field is cleared and allowEmpty is false. */
  emptyFallback?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-label": string;
  className?: string;
};

/** Digits only → integer string without leading zeros (`05` → `5`, `0` → `0`). */
export function normalizeIntegerDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return String(parseInt(digits, 10));
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function valueToDraft(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(Math.trunc(value));
}

/**
 * Settings-style integer field: native spinners hidden, custom up/down chevrons,
 * no leading zeros while typing, empty allowed temporarily then committed on blur.
 * Uses text-base on mobile (≥16px) so iOS Safari does not auto-zoom on focus;
 * globals.css also enforces this for all text-like form controls.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  allowEmpty = false,
  emptyFallback,
  placeholder,
  disabled = false,
  id,
  "aria-label": ariaLabel,
  className = "",
}: NumberFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [draft, setDraft] = useState(() => valueToDraft(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(valueToDraft(value));
    }
  }, [value, focused]);

  const fallback = emptyFallback ?? min;
  const numericValue =
    value != null && Number.isFinite(value) ? Math.trunc(value) : null;
  const atMin = numericValue != null && numericValue <= min;
  const atMax = numericValue != null && numericValue >= max;
  const canStepDown = !disabled && (numericValue == null || !atMin);
  const canStepUp = !disabled && (numericValue == null || !atMax);

  function commitDraft(raw: string) {
    const normalized = normalizeIntegerDigits(raw);
    if (normalized === "") {
      if (allowEmpty) {
        onChange(null);
        setDraft("");
        return;
      }
      const next = clampInt(fallback, min, max);
      onChange(next);
      setDraft(String(next));
      return;
    }
    const next = clampInt(Number(normalized), min, max);
    onChange(next);
    setDraft(String(next));
  }

  function handleChange(raw: string) {
    const normalized = normalizeIntegerDigits(raw);
    setDraft(normalized);
    if (normalized === "") {
      if (allowEmpty) onChange(null);
      return;
    }
    const n = Number(normalized);
    if (!Number.isFinite(n)) return;
    // Cap at max while typing so values never drift past the allowed range;
    // allow below-min drafts until blur (e.g. typing into a higher min).
    if (n > max) {
      onChange(max);
      setDraft(String(max));
      return;
    }
    onChange(n);
  }

  function stepBy(delta: number) {
    if (disabled) return;
    const base =
      numericValue != null
        ? numericValue
        : allowEmpty
          ? fallback
          : clampInt(fallback, min, max);
    const next = clampInt(base + delta, min, max);
    onChange(next);
    setDraft(String(next));
  }

  return (
    <div
      className={`relative mt-1 flex max-w-sm items-stretch overflow-hidden rounded-brand border border-white/15 bg-slate-elevated focus-within:border-coral/55 ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={numericValue ?? undefined}
        role="spinbutton"
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commitDraft(draft);
        }}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            stepBy(step);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            stepBy(-step);
          } else if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="number-field-input min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base text-white outline-none placeholder:text-muted/50 disabled:cursor-not-allowed sm:text-sm"
      />
      <div className="flex w-12 shrink-0 flex-col border-l border-white/12 sm:w-11">
        <button
          type="button"
          tabIndex={-1}
          disabled={!canStepUp}
          aria-label={`Increase ${ariaLabel}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => stepBy(step)}
          className="flex min-h-7 flex-1 items-center justify-center text-muted transition-colors hover:bg-white/5 hover:text-coral disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted sm:min-h-[22px]"
        >
          <Chevron dir="up" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={!canStepDown}
          aria-label={`Decrease ${ariaLabel}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => stepBy(-step)}
          className="flex min-h-7 flex-1 items-center justify-center border-t border-white/12 text-muted transition-colors hover:bg-white/5 hover:text-coral disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted sm:min-h-[22px]"
        >
          <Chevron dir="down" />
        </button>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "up" | "down" }) {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      aria-hidden="true"
      className="block"
    >
      {dir === "up" ? (
        <path
          d="M1.5 6.25 6 1.75l4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M1.5 1.75 6 6.25l4.5-4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
