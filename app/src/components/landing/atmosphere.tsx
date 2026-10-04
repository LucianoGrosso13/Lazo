"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/locale";
import styles from "./landing.module.css";

const GpuFog = dynamic(() => import("./gpu-fog").then((module) => module.GpuFog), { ssr: false });

/** Static gradients are present before JS; the GPU layer is an optional enhancement. */
export function LandingAtmosphere() {
  const [enabled, setEnabled] = useState(true);
  const { locale } = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.lazoMotion = enabled ? "running" : "paused";
    return () => { delete document.documentElement.dataset.lazoMotion; };
  }, [enabled]);

  return (
    <>
      <div ref={host} className={styles.atmosphere} aria-hidden="true">
        <div className={styles.fogFallback} />
        {enabled && near ? <GpuFog enabled={enabled} /> : null}
      </div>
      <button
        type="button"
        className={styles.motionToggle}
        aria-label={locale === "es" ? (enabled ? "Pausar movimiento del fondo" : "Reanudar movimiento del fondo") : (enabled ? "Pause background motion" : "Resume background motion")}
        onClick={() => setEnabled((value) => !value)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          {enabled ? <path d="M4 3h3v10H4zm5 0h3v10H9z" /> : <path d="M5 3.5v9l7-4.5z" />}
        </svg>
        <span>{locale === "es" ? (enabled ? "Pausar luz" : "Reanudar luz") : (enabled ? "Pause light" : "Resume light")}</span>
      </button>
    </>
  );
}
