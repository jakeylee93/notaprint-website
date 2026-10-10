import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Scene units are millimetres. */

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function createRenderer(canvas: HTMLCanvasElement, opts: { preserveDrawingBuffer?: boolean } = {}): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Khronos 3D Commerce neutral tone mapping: keeps product colours honest.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0xffffff, 1);
  return renderer;
}

/** Procedural studio lighting (no external HDRI, so nothing to license). */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  pmrem.dispose();
  return env;
}

export function addKeyLights(scene: THREE.Scene): void {
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(-260, 420, 320);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.45);
  rim.position.set(320, 160, -280);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e7e2, 0.35));
}

let shadowTexture: THREE.CanvasTexture | null = null;

/** Soft contact shadow: a radial gradient on a plane, cheap and deterministic. */
export function createContactShadow(widthMm: number, depthMm: number, strength = 0.32): THREE.Mesh {
  if (!shadowTexture) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(20,20,22,1)");
    grad.addColorStop(0.35, "rgba(20,20,22,0.55)");
    grad.addColorStop(0.7, "rgba(20,20,22,0.12)");
    grad.addColorStop(1, "rgba(20,20,22,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    shadowTexture = new THREE.CanvasTexture(c);
    shadowTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const mat = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: strength, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthMm, depthMm), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.05;
  mesh.renderOrder = -1;
  mesh.name = "contact-shadow";
  return mesh;
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

/** Distance at which a sphere of `radius` fills `fill` of the vertical field of view. */
export function frameDistance(radius: number, fovDeg: number, fill = 0.66): number {
  const half = THREE.MathUtils.degToRad(fovDeg / 2);
  return radius / Math.sin(half) / fill;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
