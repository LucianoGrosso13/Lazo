import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";

/** Clases del botón para usar también en <Link> y <a>. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  // En táctil chico el área mínima es 40×40: solo se agranda bajo `sm`,
  // el look de escritorio no cambia.
  return `btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} max-sm:min-h-10 max-sm:min-w-10`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={`${buttonClasses(variant, size)} ${className}`} {...props} />;
}
