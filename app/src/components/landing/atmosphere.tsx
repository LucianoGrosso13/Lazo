"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

const GpuFog = dynamic(() => import("./gpu-fog").then((module) => module.GpuFog), { ssr: false });

/** Static gradients are present before JS; the GPU layer is an optional enhancement. */
export function LandingAtmosphere() {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={host} className={styles.atmosphere} aria-hidden="true">
      <div className={styles.fogFallback} />
      <div className={styles.spectralWake} />
      <div className={styles.lightSweep} />
      {near ? <GpuFog /> : null}
    </div>
  );
}
