"use client";

import { useEffect, useRef } from "react";

export function GpuFog({ enabled }: { enabled: boolean }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = host.current;
    if (!container || !enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let renderer: import("three/webgpu").WebGPURenderer | undefined;
    let geometry: import("three/webgpu").PlaneGeometry | undefined;
    let material: import("three/webgpu").MeshBasicNodeMaterial | undefined;
    let frame = 0;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let visibilityHandler: (() => void) | undefined;
    let visible = !document.hidden;
    let inView = true;

    const start = async () => {
      try {
        const [WebGPU, TSL] = await Promise.all([
          import("three/webgpu"), import("three/tsl"),
        ]);
        if (disposed) return;

        const scene = new WebGPU.Scene();
        const camera = new WebGPU.OrthographicCamera(-1, 1, 1, -1, 0, 2);
        camera.position.z = 1;
        material = new WebGPU.MeshBasicNodeMaterial();
        material.transparent = true;
        material.depthWrite = false;
        const p = TSL.uv().mul(TSL.vec2(3.2, 2.1));
        const drift = TSL.time.mul(0.025);
        const cloud = TSL.mx_fractal_noise_float(p.add(TSL.vec2(drift, drift.mul(0.63))));
        const veil = TSL.smoothstep(0.18, 0.86, cloud).mul(0.29);
        const hue = TSL.smoothstep(0.25, 0.8, TSL.uv().x.add(cloud.mul(0.22)));
        material.colorNode = TSL.mix(
          TSL.vec3(0.6, 0.27, 1),
          TSL.mix(TSL.vec3(0, 0.76, 1), TSL.vec3(0.1, 0.98, 0.61), hue),
          hue,
        );
        material.opacityNode = veil;
        geometry = new WebGPU.PlaneGeometry(2, 2);
        const plane = new WebGPU.Mesh(geometry, material);
        scene.add(plane);
        renderer = new WebGPU.WebGPURenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
        renderer.setClearColor(0x07060b, 0);
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
        await renderer.init();
        if (disposed) { renderer.dispose(); return; }
        container.appendChild(renderer.domElement);
        const device = (renderer.backend as typeof renderer.backend & { device?: { lost: Promise<unknown> } }).device;
        if (device) {
          void device.lost.then(() => {
            if (disposed || !renderer) return;
            renderer.domElement.remove();
            geometry?.dispose();
            material?.dispose();
            renderer.dispose();
            renderer = undefined;
          });
        }

        const resize = () => {
          const bounds = container.getBoundingClientRect();
          const cap = window.matchMedia("(max-width: 700px)").matches ? 1 : 1.25;
          renderer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
          renderer?.setSize(Math.max(1, bounds.width * 0.5), Math.max(1, bounds.height * 0.5), false);
        };
        const draw = () => {
          frame = 0;
          if (!visible || !inView || disposed || !renderer) return;
          try { renderer.render(scene, camera); }
          catch {
            cancelAnimationFrame(frame);
            renderer.domElement.remove();
            geometry?.dispose();
            material?.dispose();
            renderer.dispose();
            renderer = undefined;
            return;
          }
          frame = requestAnimationFrame(draw);
        };
        const wake = () => { if (!frame && visible && inView && !disposed) frame = requestAnimationFrame(draw); };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        intersectionObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) wake(); else { cancelAnimationFrame(frame); frame = 0; } });
        intersectionObserver.observe(container);
        visibilityHandler = () => {
          visible = !document.hidden;
          if (visible) wake(); else { cancelAnimationFrame(frame); frame = 0; }
        };
        document.addEventListener("visibilitychange", visibilityHandler);
        resize();
        wake();
      } catch {
        // Unsupported adapters, shader compilation and device loss retain the CSS fog.
        if (renderer) renderer.dispose();
        geometry?.dispose();
        material?.dispose();
        renderer = undefined;
      }
    };
    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
      if (renderer) {
        renderer.domElement.remove();
        renderer.dispose();
      }
      geometry?.dispose();
      material?.dispose();
    };
  }, [enabled]);

  return <div ref={host} style={{ position: "absolute", inset: 0, overflow: "hidden" }} />;
}
