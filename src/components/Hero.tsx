"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroScene } from "@/three/hero";
import { useShell } from "./AppShell";
import { LogoChip } from "./LogoChip";
import { useReducedMotion } from "./useReducedMotion";
import { useArtwork, useDisplayArtwork } from "@/state/artwork";
import { LIMITS } from "@/lib/artwork/intake";

const BEATS = [
  { title: "Wrapped, not pasted on.", body: "Your artwork bends round the mug the way the print does. Real 3D, not a flat picture." },
  { title: "Down to a pen barrel.", body: "The same file, scaled to a 45 mm print area. Resolution is checked as you go." },
  { title: "And onto a bottle.", body: "Upload once and it follows you through every product." },
  { title: "One upload. Every product.", body: "Pick a product below to rotate it, choose a position and proof it." },
];

export function Hero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const beatsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HeroScene | null>(null);
  const [mode, setMode] = useState<"loading" | "3d" | "fallback">("loading");
  const [activeBeat, setActiveBeat] = useState(-1);
  const reduced = useReducedMotion();
  const { openFilePicker } = useShell();
  const { artwork, status } = useArtwork();
  const display = useDisplayArtwork();

  // Load three.js only after first paint, and only on devices with WebGL.
  useEffect(() => {
    let disposed = false;
    const start = async () => {
      const { webglAvailable } = await import("@/three/core");
      if (disposed) return;
      if (!webglAvailable()) {
        setMode("fallback");
        return;
      }
      const { HeroScene } = await import("@/three/hero");
      if (disposed || !stageRef.current) return;
      try {
        sceneRef.current = new HeroScene(stageRef.current, { onFallback: () => setMode("fallback") });
        setMode("3d");
      } catch {
        setMode("fallback");
      }
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(() => void start());
    else setTimeout(() => void start(), 60);
    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mode === "3d" && display) sceneRef.current?.setArtwork(display.bitmap, display.aspect);
  }, [mode, display]);

  // Scroll progress drives the scene; native scroll, no hijacking.
  useEffect(() => {
    if (mode !== "3d") return;
    if (reduced) {
      sceneRef.current?.setProgress(1);
      setActiveBeat(-1);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = beatsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = Math.max(1, rect.height - vh * 0.45);
      const p = Math.min(1, Math.max(0, (vh * 0.86 - rect.top) / total));
      sceneRef.current?.setProgress(p);
      const children = Array.from(el.children) as HTMLElement[];
      let best = -1;
      let bestDist = Infinity;
      children.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - vh * 0.62);
        if (d < bestDist && r.top < vh && r.bottom > 0) {
          bestDist = d;
          best = i;
        }
      });
      setActiveBeat(best);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode, reduced]);

  const hasLogo = !!artwork;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
          <div className="hero-intro">
            <h1 id="hero-title" className="display-xl">
              Upload your logo.
            </h1>
            <p className="lead">See it on real products in true 3D, proof it to the millimetre, then order one, or a thousand.</p>
            <div className="cta-row">
              {hasLogo ? (
                <>
                  <a className="btn btn-primary btn-large" href="#products">
                    See it on every product
                  </a>
                  <LogoChip />
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-primary btn-large" onClick={openFilePicker} disabled={status === "processing"} data-testid="hero-upload">
                    {status === "processing" ? "Preparing your logo…" : "Upload your logo"}
                  </button>
                  <a className="text-button" href="#products">
                    or browse products
                  </a>
                </>
              )}
            </div>
            <p className="upload-note micro">
              PNG, JPEG or SVG, up to {LIMITS.bytes.png / (1024 * 1024)} MB. You can also drop a file anywhere on the page. Your logo is processed and kept
              on this device.
            </p>
          </div>
        <div className="hero-stage">
          <div className="stage-canvas" ref={stageRef} data-testid="hero-stage" data-mode={mode} />
          {mode === "fallback" && (
            <div className="stage-fallback">
              <div className="stack-m">
                {display && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={display.previewUrl} alt="" style={{ width: "min(320px, 70%)", margin: "0 auto" }} />
                )}
                <p className="muted small">The 3D preview needs WebGL, which isn&apos;t available here. Products and proofs still work.</p>
              </div>
            </div>
          )}
        </div>
        <div className="beats" ref={beatsRef}>
          {BEATS.map((b, i) => (
            <div className="beat" key={b.title} style={{ opacity: reduced || activeBeat === -1 || activeBeat === i ? 1 : 0.28 }}>
              <h2 className="display-m">{b.title}</h2>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
