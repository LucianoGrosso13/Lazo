import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";

/** Clases del botón para usar también en <Link> y <a>. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `btn btn-${variant} ${size === "sm" ? "btn-sm" : ""}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={`${buttonClasses(variant, size)} ${className}`} {...props} />;
}
