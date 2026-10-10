/**
 * Turntable controls for a product on a plinth.
 * - Horizontal drag spins the product with inertia (frame-rate independent damping).
 * - touch-action: pan-y, so a vertical swipe still scrolls the page on phones.
 * - Pinch (two pointers) or ctrl+wheel (trackpad pinch) zooms; plain wheel never hijacks scrolling.
 * - Keyboard: ←/→ rotate 15°, ↑/↓ tilt, +/− zoom, 0 or Home resets.
 */
export interface TurntableLimits {
  minPitch: number;
  maxPitch: number;
  minZoom: number;
  maxZoom: number;
}

const TAU = Math.PI * 2;

export class Turntable {
  yaw = 0;
  pitch = 0;
  zoom = 1;
  onChange: (() => void) | null = null;

  private targetYaw: number | null = null;
  private targetPitch: number | null = null;
  private targetZoom: number | null = null;
  private velocity = 0;
  private pointers = new Map<number, { x: number; y: number; type: string }>();
  private lastMoveT = 0;
  private pinchDist = 0;
  private pinchZoom = 1;
  private baseYaw: number;

  constructor(
    private el: HTMLElement,
    private limits: TurntableLimits,
    private reducedMotion: boolean,
    initialYaw = 0,
  ) {
    this.baseYaw = initialYaw;
    this.yaw = initialYaw;
    el.style.touchAction = "pan-y";
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointercancel", this.onUp);
    el.addEventListener("lostpointercapture", this.onUp);
    el.addEventListener("keydown", this.onKey);
    el.addEventListener("wheel", this.onWheel, { passive: false });
  }

  dispose() {
    const el = this.el;
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointercancel", this.onUp);
    el.removeEventListener("lostpointercapture", this.onUp);
    el.removeEventListener("keydown", this.onKey);
    el.removeEventListener("wheel", this.onWheel);
  }

  get dragging() {
    return this.pointers.size > 0;
  }

  /** Advance animation; returns true while anything is still moving. */
  update(dt: number): boolean {
    let moving = false;
    const k = 1 - Math.exp(-dt * 11);
    if (!this.dragging && Math.abs(this.velocity) > 0.015) {
      this.yaw += this.velocity * dt;
      this.velocity *= Math.exp(-3.4 * dt);
      moving = true;
    } else if (!this.dragging) {
      this.velocity = 0;
    }
    if (this.targetYaw !== null) {
      const d = this.targetYaw - this.yaw;
      if (Math.abs(d) < 0.0008) {
        this.yaw = this.targetYaw;
        this.targetYaw = null;
      } else {
        this.yaw += d * k;
        moving = true;
      }
    }
    if (this.targetPitch !== null) {
      const d = this.targetPitch - this.pitch;
      if (Math.abs(d) < 0.0008) {
        this.pitch = this.targetPitch;
        this.targetPitch = null;
      } else {
        this.pitch += d * k;
        moving = true;
      }
    }
    if (this.targetZoom !== null) {
      const d = this.targetZoom - this.zoom;
      if (Math.abs(d) < 0.0008) {
        this.zoom = this.targetZoom;
        this.targetZoom = null;
      } else {
        this.zoom += d * k;
        moving = true;
      }
    }
    return moving;
  }

  rotateBy(rad: number) {
    this.velocity = 0;
    const from = this.targetYaw ?? this.yaw;
    this.setTarget("yaw", from + rad);
  }

  tiltBy(rad: number) {
    const from = this.targetPitch ?? this.pitch;
    this.setTarget("pitch", clamp(from + rad, this.limits.minPitch, this.limits.maxPitch));
  }

  zoomBy(factor: number) {
    const from = this.targetZoom ?? this.zoom;
    this.setTarget("zoom", clamp(from * factor, this.limits.minZoom, this.limits.maxZoom));
  }

  /** Turn so that a surface at angle `a` (from +Z towards +X) faces the camera. */
  face(angle: number) {
    this.velocity = 0;
    const desired = -angle + this.baseYaw;
    // Take the shortest way round from the current yaw.
    const current = this.targetYaw ?? this.yaw;
    const delta = ((((desired - current) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
    this.setTarget("yaw", current + delta);
  }

  reset() {
    this.velocity = 0;
    const current = this.targetYaw ?? this.yaw;
    const delta = ((((this.baseYaw - current) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
    this.setTarget("yaw", current + delta);
    this.setTarget("pitch", 0);
    this.setTarget("zoom", 1);
  }

  private setTarget(which: "yaw" | "pitch" | "zoom", value: number) {
    if (this.reducedMotion) {
      this[which] = value;
      if (which === "yaw") this.targetYaw = null;
      if (which === "pitch") this.targetPitch = null;
      if (which === "zoom") this.targetZoom = null;
    } else if (which === "yaw") this.targetYaw = value;
    else if (which === "pitch") this.targetPitch = value;
    else this.targetZoom = value;
    this.onChange?.();
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    this.velocity = 0;
    this.targetYaw = null;
    this.lastMoveT = performance.now();
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchZoom = this.zoom;
    }
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    this.onChange?.();
  };

  private onMove = (e: PointerEvent) => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const now = performance.now();
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) {
        this.targetZoom = null;
        this.zoom = clamp(this.pinchZoom * (dist / this.pinchDist), this.limits.minZoom, this.limits.maxZoom);
      }
      this.onChange?.();
      return;
    }
    const width = Math.max(240, this.el.clientWidth);
    const dYaw = (dx / width) * TAU * 0.85;
    this.yaw += dYaw;
    if (prev.type === "mouse") {
      this.targetPitch = null;
      this.pitch = clamp(this.pitch + (dy / Math.max(240, this.el.clientHeight)) * 1.2, this.limits.minPitch, this.limits.maxPitch);
    }
    const dt = Math.max(1, now - this.lastMoveT) / 1000;
    const instant = dYaw / dt;
    this.velocity = this.velocity * 0.6 + clamp(instant, -9, 9) * 0.4;
    this.lastMoveT = now;
    this.onChange?.();
  };

  private onUp = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    const idle = performance.now() - this.lastMoveT > 90;
    if (this.reducedMotion || idle || e.type === "pointercancel") this.velocity = 0;
    this.onChange?.();
  };

  private onKey = (e: KeyboardEvent) => {
    const step = Math.PI / 12;
    let handled = true;
    switch (e.key) {
      case "ArrowLeft":
        this.rotateBy(-step);
        break;
      case "ArrowRight":
        this.rotateBy(step);
        break;
      case "ArrowUp":
        this.tiltBy(-0.12);
        break;
      case "ArrowDown":
        this.tiltBy(0.12);
        break;
      case "+":
      case "=":
        this.zoomBy(1.15);
        break;
      case "-":
      case "_":
        this.zoomBy(1 / 1.15);
        break;
      case "0":
      case "Home":
        this.reset();
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  };

  private onWheel = (e: WheelEvent) => {
    // Only trackpad pinch (ctrlKey) zooms; ordinary wheel scrolling stays with the page.
    if (!e.ctrlKey) return;
    e.preventDefault();
    this.targetZoom = null;
    this.zoom = clamp(this.zoom * Math.exp(-e.deltaY * 0.01), this.limits.minZoom, this.limits.maxZoom);
    this.onChange?.();
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
