"use client";

import type { ComponentProps } from "react";

/** Chip: etiqueta de calibración. Con `on` se enciende como tramo de haz. */
export function Chip({
  on,
  className = "",
  ...props
}: ComponentProps<"span"> & { on?: boolean }) {
  return <span className={`chip ${className}`} data-on={on || undefined} {...props} />;
}

export function ChipButton({
  on,
  className = "",
  ...props
}: ComponentProps<"button"> & { on?: boolean }) {
  return (
    <button
      type="button"
      className={`chip ${className}`}
      aria-pressed={on}
      data-on={on || undefined}
      {...props}
    />
  );
}

/** Control segmentado: una pista de vidrio con opciones que se encienden. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`segtrack ${className}`}>
      {options.map((o) => (
        <ChipButton key={o.value} on={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </ChipButton>
      ))}
    </div>
  );
}
