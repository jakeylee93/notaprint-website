import * as THREE from "three";
import type { Product, Variant } from "@/lib/catalog/types";
import { addKeyLights, createRenderer, createStudioEnvironment, frameDistance, prefersReducedMotion } from "./core";
import { Turntable } from "./controls";
import { buildModel, type ProductModel } from "./models";

export type ViewName = "front" | "back" | "left" | "right";

export interface ViewerCallbacks {
  onFallback?: (reason: "context-lost" | "init-failed") => void;
  onViewChange?: (description: string) => void;
}

const FOV = 26;

/**
 * The one interactive 3D viewer. Renders on demand only: while the user interacts or an
 * animation settles, and never while it is off-screen or the tab is hidden.
 */
export class Viewer3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 1, 8000);
  private model: ProductModel | null = null;
  private texture: THREE.CanvasTexture | null = null;
  private controls: Turntable;
  private raf = 0;
  private lastT = 0;
  private dirty = true;
  private visible = true;
  private disposed = false;
  private io: IntersectionObserver;
  private ro: ResizeObserver;
  private reduced = prefersReducedMotion();
  private canvas: HTMLCanvasElement;
  private lastDescribed = "";

  constructor(
    private container: HTMLElement,
    private callbacks: ViewerCallbacks = {},
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "viewer-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    container.appendChild(this.canvas);
    try {
      this.renderer = createRenderer(this.canvas);
    } catch (e) {
      this.canvas.remove();
      callbacks.onFallback?.("init-failed");
      throw e;
    }
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.environment = createStudioEnvironment(this.renderer);
    addKeyLights(this.scene);
    this.controls = new Turntable(container, { minPitch: -0.12, maxPitch: 0.55, minZoom: 0.8, maxZoom: 1.8 }, this.reduced, -0.28);
    this.controls.onChange = () => this.requestRender();

    this.canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    this.io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.requestRender();
    });
    this.io.observe(container);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize();
  }

  setProduct(product: Product, variant: Variant, colourHex: string) {
    if (this.model) {
      this.scene.remove(this.model.group);
      this.model.dispose();
    }
    const area = variant.printArea;
    this.model = buildModel(product.model, variant.dimensions, { widthMm: area.widthMm, heightMm: area.heightMm });
    this.model.setColour(colourHex);
    if (this.texture) this.model.setPrintTexture(this.texture);
    this.scene.add(this.model.group);
    this.requestRender();
  }

  setColour(hex: string) {
    this.model?.setColour(hex);
    this.requestRender();
  }

  /** Point the print texture at a composed print-area canvas (same pixels as the proof). */
  setPrintCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas) {
      this.texture?.dispose();
      this.texture = null;
      this.model?.setPrintTexture(null);
      this.requestRender();
      return;
    }
    if (this.texture && this.texture.image === canvas && this.texture.image.width === canvas.width && this.texture.image.height === canvas.height) {
      this.texture.needsUpdate = true;
    } else {
      this.texture?.dispose();
      this.texture = new THREE.CanvasTexture(canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.model?.setPrintTexture(this.texture);
    }
    this.requestRender();
  }

  /** Face a surface angle (cylinders) so the chosen placement turns towards the viewer. */
  faceAngle(angle: number) {
    this.controls.face(angle);
  }

  rotateBy(deg: number) {
    this.controls.rotateBy(THREE.MathUtils.degToRad(deg));
  }

  zoomBy(factor: number) {
    this.controls.zoomBy(factor);
  }

  reset() {
    this.controls.reset();
  }

  requestRender() {
    this.dirty = true;
    if (!this.raf && !this.disposed) {
      this.lastT = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.controls.dispose();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.model?.dispose();
    this.texture?.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    const animating = this.controls.update(dt);
    if (!this.visible || document.hidden) return;
    if (animating || this.dirty || this.controls.dragging) {
      this.dirty = false;
      this.renderFrame();
    }
    if (animating || this.controls.dragging) this.raf = requestAnimationFrame(this.tick);
  };

  private renderFrame() {
    const m = this.model;
    if (!m) return;
    m.pivot.rotation.y = this.controls.yaw;
    const f = m.frame;
    const elevation = THREE.MathUtils.degToRad(f.elevationDeg) + this.controls.pitch;
    const aspect = this.camera.aspect;
    // Narrow viewports: back off so the product fits horizontally as well.
    const fit = aspect < 1 ? 1 / Math.max(0.62, aspect) : 1;
    const dist = (frameDistance(f.radius, FOV, 0.84) * fit) / this.controls.zoom;
    const yawOffset = THREE.MathUtils.degToRad(f.yawDeg);
    this.camera.position.set(
      f.center.x + dist * Math.cos(elevation) * Math.sin(yawOffset),
      f.center.y + dist * Math.sin(elevation),
      f.center.z + dist * Math.cos(elevation) * Math.cos(yawOffset),
    );
    this.camera.lookAt(f.center);
    this.renderer.render(this.scene, this.camera);
    this.describe();
  }

  private describe() {
    if (!this.callbacks.onViewChange) return;
    const deg = Math.round(((((THREE.MathUtils.radToDeg(this.controls.yaw) % 360) + 360) % 360) / 15)) * 15;
    const text = `Rotated ${deg % 360} degrees, zoom ${Math.round(this.controls.zoom * 100)} percent`;
    if (text !== this.lastDescribed && !this.controls.dragging) {
      this.lastDescribed = text;
      this.callbacks.onViewChange(text);
    }
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const mobile = Math.min(w, h) < 520;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private onVisibility = () => {
    if (!document.hidden) this.requestRender();
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.callbacks.onFallback?.("context-lost");
  };
}
