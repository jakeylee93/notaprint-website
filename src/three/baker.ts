import * as THREE from "three";
import type { Product, Variant } from "@/lib/catalog/types";
import { addKeyLights, createRenderer, createStudioEnvironment, frameDistance } from "./core";
import { buildModel } from "./models";

// Smaller bakes on narrow screens: cards are ~180 CSS px there.
const SIZE = typeof window !== "undefined" && window.innerWidth < 640 ? 480 : 720;
const FOV = 26;

interface Job {
  key: string;
  product: Product;
  variant: Variant;
  colourHex: string;
  printCanvas: HTMLCanvasElement | null;
  resolve: (url: string) => void;
  reject: (e: unknown) => void;
}

/**
 * Bakes catalogue thumbnails with one offscreen WebGL renderer (never one context per card).
 * Same studio, camera language and tone mapping as the live viewer, on pure white.
 * The renderer is released after a short idle period to free GPU memory.
 */
class ThumbnailBaker {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera = new THREE.PerspectiveCamera(FOV, 1, 1, 8000);
  private queue: Job[] = [];
  private running = false;
  private cache = new Map<string, string>();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  bake(key: string, product: Product, variant: Variant, colourHex: string, printCanvas: HTMLCanvasElement | null): Promise<string> {
    const hit = this.cache.get(key);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve, reject) => {
      this.queue = this.queue.filter((j) => j.key !== key);
      this.queue.push({ key, product, variant, colourHex, printCanvas, resolve, reject });
      void this.drain();
    });
  }

  private ensure() {
    if (this.renderer && this.scene) return;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    this.renderer = createRenderer(canvas, { preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(SIZE, SIZE, false);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.environment = createStudioEnvironment(this.renderer);
    addKeyLights(this.scene);
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    try {
      while (this.queue.length) {
        const job = this.queue.shift()!;
        try {
          const url = await this.renderJob(job);
          this.cache.set(job.key, url);
          job.resolve(url);
        } catch (e) {
          job.reject(e);
        }
        // Yield between bakes so scrolling and input stay smooth.
        await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      this.running = false;
      this.idleTimer = setTimeout(() => this.release(), 4000);
    }
  }

  private async renderJob(job: Job): Promise<string> {
    this.ensure();
    const renderer = this.renderer!;
    const scene = this.scene!;
    const area = job.variant.printArea;
    const model = buildModel(job.product.model, job.variant.dimensions, { widthMm: area.widthMm, heightMm: area.heightMm });
    model.setColour(job.colourHex);
    let texture: THREE.CanvasTexture | null = null;
    if (job.printCanvas) {
      texture = new THREE.CanvasTexture(job.printCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      model.setPrintTexture(texture);
    }
    model.pivot.rotation.y = -0.28;
    scene.add(model.group);
    const f = model.frame;
    const elevation = THREE.MathUtils.degToRad(f.elevationDeg);
    const dist = frameDistance(f.radius, FOV, 0.8);
    const yawOffset = THREE.MathUtils.degToRad(f.yawDeg);
    this.camera.position.set(
      f.center.x + dist * Math.cos(elevation) * Math.sin(yawOffset),
      f.center.y + dist * Math.sin(elevation),
      f.center.z + dist * Math.cos(elevation) * Math.cos(yawOffset),
    );
    this.camera.lookAt(f.center);
    renderer.render(scene, this.camera);
    const blob = await new Promise<Blob | null>((resolve) => (renderer.domElement as HTMLCanvasElement).toBlob(resolve, "image/webp", 0.9));
    scene.remove(model.group);
    model.dispose();
    texture?.dispose();
    if (!blob) throw new Error("Thumbnail encode failed");
    return URL.createObjectURL(blob);
  }

  /** Keep only thumbnails whose key starts with `prefix` (the current artwork); free the rest. */
  keepOnly(prefix: string) {
    for (const [key, url] of this.cache) {
      if (!key.startsWith(prefix)) {
        URL.revokeObjectURL(url);
        this.cache.delete(key);
      }
    }
  }

  private release() {
    if (this.running || this.queue.length) return;
    this.scene?.environment?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
    this.scene = null;
  }
}

let instance: ThumbnailBaker | null = null;

export function getBaker(): ThumbnailBaker {
  if (!instance) instance = new ThumbnailBaker();
  return instance;
}
