"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useT } from "@/i18n/locale";
import { mostrador } from "@/i18n/dictionaries/mostrador";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  showNotice?: boolean;
}

export function QRCodeDisplay({
  value,
  size = 240,
  className = "",
  showNotice = true,
}: QRCodeDisplayProps) {
  const t = useT(mostrador);
  const [result, setResult] = useState<{ value: string; svg?: string; error?: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    if (!value) return;

    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      width: size,
      color: {
        dark: "#080c14",
        light: "#ffffff",
      },
    })
      .then((svg) => {
        if (active) {
          setResult({ value, svg });
        }
      })
      .catch(() => {
        if (active) setResult({ value, error: true });
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  const svgHtml = result?.value === value ? result.svg : undefined;
  const error = result?.value === value && result.error;

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-2xl bg-white p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] ring-1 ring-white/20 transition-transform duration-300 hover:scale-[1.01]"
        style={{ width: `${size + 28}px`, height: `${size + 28}px` }}
      >
        {svgHtml ? (
          <div
            className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
            aria-label={`Código QR para la orden: ${value}`}
            role="img"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : error ? (
          <div role="alert" className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-neutral-700">
            {t.errorQr}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="size-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
          </div>
        )}
      </div>

      {showNotice && (
        <p className="mt-3.5 max-w-[280px] text-xs leading-relaxed text-ink-3">
          {t.qrAviso}
        </p>
      )}
    </div>
  );
}
