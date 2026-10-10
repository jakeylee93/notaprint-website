import * as THREE from "three";
import { getProduct } from "@/lib/catalog/products";
import type { Placement, PrintArea, Product, Variant } from "@/lib/catalog/types";
import { composePrintArea } from "@/lib/artwork/compose";
import { defaultWidthFor } from "@/lib/artwork/fit";
import { addKeyLights, createRenderer, createStudioEnvironment } from "./core";
import { buildSurfaceGeometry, type BandSpec } from "./band";
import { buildModel, type ProductModel } from "./models";

/**
 * Scroll-driven hero: a logo lifts off a flat sheet and wraps onto a mug, a pen and a bottle.
 * Every frame is a pure function of scroll progress p ∈ [0, 1], so it is fully reversible,
 * deterministic, and only renders when p changes (no idle animation loop).
 */

const FOV = 24;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

class TransferSheet {
  mesh: THREE.Mesh;
  private flat: Float32Array;
  private target: Float32Array;
  private targetNormals: Float32Array;
  private uv: Float32Array;

  constructor(
    private band: BandSpec,
    material: THREE.Material,
  ) {
    const geometry = buildSurfaceGeometry(band);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.renderOrder = 3;
    this.mesh.frustumCulled = false;
    const n = geometry.attributes.position.count;
    this.flat = new Float32Array(n * 3);
    this.target = new Float32Array(n * 3);
    this.targetNormals = new Float32Array(n * 3);
    this.uv = Float32Array.from(geometry.attributes.uv.array as Float32Array);
  }

  /** Targets are the print band transformed into world space by the product's current matrix. */
  setTarget(matrix: THREE.Matrix4) {
    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const nu = this.band.segmentsU;
    const nt = this.band.segmentsT;
    let k = 0;
    for (let j = 0; j <= nt; j++) {
      for (let i = 0; i <= nu; i++) {
        this.band.position(i / nu, j / nt, p);
        this.band.normal(i / nu, j / nt, nrm);
        p.applyMatrix4(matrix);
        nrm.applyMatrix3(normalMatrix).normalize();
        this.target.set([p.x, p.y, p.z], k * 3);
        this.targetNormals.set([nrm.x, nrm.y, nrm.z], k * 3);
        k++;
      }
    }
  }

  /** A flat rectangle (the "sheet") in world space; `anchorU` is placed at `origin`. */
  setFlat(origin: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, widthMm: number, heightMm: number, anchorU: number) {
    const count = this.flat.length / 3;
    for (let k = 0; k < count; k++) {
      const u = this.uv[k * 2];
      const t = 1 - this.uv[k * 2 + 1];
      const x = (u - anchorU) * widthMm;
      const y = (0.5 - t) * heightMm;
      this.flat[k * 3] = origin.x + right.x * x + up.x * y;
      this.flat[k * 3 + 1] = origin.y + right.y * x + up.y * y;
      this.flat[k * 3 + 2] = origin.z + right.z * x + up.z * y;
    }
  }

  update(e: number, lift: number, flatNormal: THREE.Vector3) {
    const pos = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const nor = this.mesh.geometry.attributes.normal as THREE.BufferAttribute;
    const arc = Math.sin(Math.PI * e) * lift;
    const tmp = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      // Points nearer the anchor arrive first, so the sheet visibly curls onto the surface.
      const u = this.uv[k * 2];
      const local = Math.min(1, Math.max(0, e * 1.35 - Math.abs(u - 0.5) * 0.35));
      const s = local * local * (3 - 2 * local);
      pos.setXYZ(
        k,
        lerp(this.flat[k * 3], this.target[k * 3], s),
        lerp(this.flat[k * 3 + 1], this.target[k * 3 + 1], s) + arc * (1 - s),
        lerp(this.flat[k * 3 + 2], this.target[k * 3 + 2], s),
      );
      tmp.set(lerp(flatNormal.x, this.targetNormals[k * 3], s), lerp(flatNormal.y, this.targetNormals[k * 3 + 1], s), lerp(flatNormal.z, this.targetNormals[k * 3 + 2], s)).normalize();
      nor.setXYZ(k, tmp.x, tmp.y, tmp.z);
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
  }
}

interface Actor {
  product: Product;
  variant: Variant;
  placement: Placement;
  model: ProductModel;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  sheet: TransferSheet;
  sheetMaterial: THREE.MeshStandardMaterial;
}

function makeActor(productId: string, placementId: string, colourId: string): Actor {
  const product = getProduct(productId)!;
  const variant = product.variants[0];
  const placement = variant.placements.find((p) => p.id === placementId)!;
  const area: PrintArea = variant.printArea;
  const model = buildModel(product.model, variant.dimensions, { widthMm: area.widthMm, heightMm: area.heightMm });
  model.setColour(product.colours.find((c) => c.id === colourId)?.hex ?? product.colours[0].hex);
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 4;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  model.setPrintTexture(texture);
  // Matte so the flying artwork reads crisply instead of picking up a bright sheen.
  const sheetMaterial = new THREE.MeshStandardMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, roughness: 0.95, metalness: 0, envMapIntensity: 0.35, depthWrite: false });
  const sheet = new TransferSheet(model.printBand, sheetMaterial);
  return { product, variant, placement, model, canvas, texture, sheet, sheetMaterial };
}

export class HeroScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000);
  private actors: { mug: Actor; pen: Actor; bottle: Actor };
  private canvas: HTMLCanvasElement;
  private p = 0;
  private raf = 0;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private visible = true;
  private disposed = false;

  constructor(
    private container: HTMLElement,
    private opts: { onFallback?: () => void } = {},
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "hero-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    container.appendChild(this.canvas);
    this.renderer = createRenderer(this.canvas);
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.environment = createStudioEnvironment(this.renderer);
    addKeyLights(this.scene);
    this.actors = {
      mug: makeActor("mug", "front", "white"),
      pen: makeActor("pen", "barrel", "white"),
      bottle: makeActor("bottle", "front", "steel"),
    };
    for (const a of Object.values(this.actors)) {
      this.scene.add(a.model.group);
      this.scene.add(a.sheet.mesh);
      a.texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    }
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.request();
    });
    this.io.observe(container);
    this.resize();
  }

  /** Re-compose the three print areas with the current artwork (customer logo or placeholder). */
  setArtwork(image: CanvasImageSource, aspect: number) {
    for (const a of Object.values(this.actors)) {
      const slot = a.placement.slots[0];
      composePrintArea({ area: a.variant.printArea, placement: a.placement, image, aspect, widthMm: defaultWidthFor(slot, aspect), offsetYmm: 0, pxPerMm: 9 }, a.canvas);
      // Size can change with the artwork, so rebuild the texture source dimensions.
      a.texture.dispose();
      a.texture.image = a.canvas;
      a.texture.needsUpdate = true;
    }
    this.request();
  }

  setProgress(p: number) {
    const clamped = Math.min(1, Math.max(0, p));
    if (Math.abs(clamped - this.p) < 0.0005) return;
    this.p = clamped;
    this.request();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    for (const a of Object.values(this.actors)) {
      a.model.dispose();
      a.sheet.mesh.geometry.dispose();
      a.sheetMaterial.dispose();
      a.texture.dispose();
    }
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private request() {
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.visible && !document.hidden) this.frame();
    });
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const mobile = Math.min(w, h) < 560;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.request();
  }

  /** Distance needed to fit a box of half-width hw and half-height hh. */
  private fitDistance(hw: number, hh: number) {
    const vf = THREE.MathUtils.degToRad(FOV / 2);
    const hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    return Math.max(hh / Math.tan(vf), hw / Math.tan(hf));
  }

  private frame() {
    const p = this.p;
    const { mug, pen, bottle } = this.actors;
    const portrait = this.camera.aspect < 0.9;

    // --- Beat timings
    const mugWrap = smooth(0.05, 0.27, p);
    const mugTurn = smooth(0.24, 0.42, p);
    const toLineup = smooth(0.38, 0.6, p);
    const penIn = smooth(0.42, 0.56, p);
    const penWrap = smooth(0.48, 0.64, p);
    const bottleIn = smooth(0.6, 0.72, p);
    const bottleWrap = smooth(0.66, 0.82, p);
    const settle = smooth(0.8, 1, p);

    // --- Mug: wrap centre faces camera during the transfer, then turns to show the front logo.
    const mugX = lerp(0, portrait ? -62 : -132, toLineup);
    const mugZ = lerp(0, portrait ? -40 : -10, toLineup);
    mug.model.group.position.set(mugX, 0, mugZ);
    // Front logo faces the camera for the transfer, then one full turn shows it travelling round the mug.
    mug.model.pivot.rotation.y = -0.38 + mugTurn * Math.PI * 2;
    mug.model.group.scale.setScalar(1);

    // --- Pen: slides in from the right and lies diagonally in front.
    const penX = lerp(320, portrait ? 8 : -4, penIn);
    const penZ = lerp(80, portrait ? 92 : 96, penIn);
    pen.model.group.position.set(penX, 0, penZ);
    pen.model.group.rotation.y = lerp(-0.1, portrait ? 0.32 : 0.22, penIn);
    pen.model.pivot.rotation.x = 0;
    pen.model.group.visible = penIn > 0.001;

    // --- Bottle: rises in at the right/back.
    const bottleX = lerp(420, portrait ? 70 : 128, bottleIn);
    bottle.model.group.position.set(bottleX, 0, portrait ? -70 : -40);
    bottle.model.pivot.rotation.y = lerp(0.9, -0.22, bottleIn);
    bottle.model.group.visible = bottleIn > 0.001;

    // --- Camera: close on the mug, then pull back to frame the line-up.
    const startTarget = new THREE.Vector3(0, 52, 0);
    const endTarget = new THREE.Vector3(portrait ? 4 : -2, 92, 10);
    const target = startTarget.clone().lerp(endTarget, Math.max(toLineup, settle * 0.2));
    const dStart = this.fitDistance(portrait ? 100 : 112, 70);
    const dEnd = this.fitDistance(portrait ? 150 : 250, portrait ? 210 : 150);
    const dist = lerp(dStart, dEnd, smooth(0.36, 0.78, p)) * lerp(1, 0.97, settle);
    const elev = THREE.MathUtils.degToRad(lerp(12, 16, toLineup));
    const azim = THREE.MathUtils.degToRad(lerp(-6, 4, p));
    this.camera.position.set(target.x + dist * Math.cos(elev) * Math.sin(azim), target.y + dist * Math.sin(elev), target.z + dist * Math.cos(elev) * Math.cos(azim));
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();

    // --- Transfer sheets: flat in front of the camera-facing side, then curling onto the band.
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();
    const toCamera = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 2).normalize();
    this.updateSheet(mug, mugWrap, new THREE.Vector3(mugX - 64, 60, mugZ + 70), right, up, toCamera, this.anchorU(mug), 40);
    this.updateSheet(pen, penWrap, new THREE.Vector3(penX - 10, 58, penZ + 54), right, up, toCamera, this.anchorU(pen), 34);
    this.updateSheet(bottle, bottleWrap, new THREE.Vector3(bottleX - 70, 150, 50), right, up, toCamera, this.anchorU(bottle), 48);

    this.renderer.render(this.scene, this.camera);
  }

  private updateSheet(a: Actor, e: number, origin: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, toCamera: THREE.Vector3, anchorU: number, lift: number) {
    const groupVisible = a.model.group.visible;
    const done = e >= 0.999;
    a.model.group.updateMatrixWorld(true);
    a.sheet.mesh.visible = groupVisible && !done;
    a.model.printMesh.visible = groupVisible && done;
    if (!a.sheet.mesh.visible) return;
    const area = a.variant.printArea;
    a.sheet.setTarget(a.model.pivot.matrixWorld);
    a.sheet.setFlat(origin, right, up, area.widthMm, area.heightMm, anchorU);
    a.sheet.update(e, lift, toCamera);
  }

  /** u coordinate of the logo's centre within the print area, so the flat sheet holds the logo at its origin. */
  private anchorU(a: Actor) {
    return a.placement.slots[0].cx / a.variant.printArea.widthMm;
  }

  private onContextLost = (ev: Event) => {
    ev.preventDefault();
    this.opts.onFallback?.();
  };
}
