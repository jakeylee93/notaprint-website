import * as THREE from "three";
import type { ModelKind } from "@/lib/catalog/types";
import { buildSurfaceGeometry, flatPanel, horizontalCylinderBand, topPanel, verticalCylinderBand, type BandSpec } from "./band";
import { createContactShadow, disposeObject } from "./core";

/**
 * Original procedural preview models at published real-world dimensions (millimetres).
 * They are clearly labelled as previews in the UI; none is supplier geometry.
 */
export interface ProductModel {
  kind: ModelKind;
  group: THREE.Group;
  /** Rotates under the turntable; the shadow stays put. */
  pivot: THREE.Group;
  printMesh: THREE.Mesh;
  printBand: BandSpec;
  setColour(hex: string): void;
  setPrintTexture(texture: THREE.Texture | null): void;
  /** Framing hints for cameras: look-at centre and bounding radius. */
  frame: { center: THREE.Vector3; radius: number; elevationDeg: number; yawDeg: number };
  dispose(): void;
}

function physical(params: THREE.MeshPhysicalMaterialParameters) {
  return new THREE.MeshPhysicalMaterial(params);
}

function inkMaterial(base: THREE.MeshPhysicalMaterialParameters = {}) {
  return physical({
    color: 0xffffff,
    transparent: true,
    roughness: 0.3,
    metalness: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    ...base,
  });
}

function makePrintMesh(spec: BandSpec, material: THREE.MeshPhysicalMaterial): THREE.Mesh {
  const mesh = new THREE.Mesh(buildSurfaceGeometry(spec), material);
  mesh.name = "print-surface";
  mesh.renderOrder = 2;
  mesh.visible = false;
  return mesh;
}

function finish(kind: ModelKind, pivot: THREE.Group, printMesh: THREE.Mesh, printBand: BandSpec, shadow: THREE.Mesh, setColourImpl: (hex: string) => void, frame: ProductModel["frame"]): ProductModel {
  const group = new THREE.Group();
  group.name = `model-${kind}`;
  pivot.add(printMesh);
  group.add(pivot, shadow);
  const mat = printMesh.material as THREE.MeshPhysicalMaterial;
  return {
    kind,
    group,
    pivot,
    printMesh,
    printBand,
    setColour: setColourImpl,
    setPrintTexture(texture) {
      mat.map = texture;
      mat.needsUpdate = true;
      printMesh.visible = !!texture;
    },
    frame,
    dispose() {
      disposeObject(group);
    },
  };
}

/* ----------------------------------------------------------------------------- Mug */

export function buildMug(d: { heightMm: number; diameterMm: number }, print: { widthMm: number; heightMm: number }): ProductModel {
  const H = d.heightMm;
  const R = d.diameterMm / 2;
  const wall = 4.2;
  const base = 6.5;
  // Traversed foot → outer wall → rim → inner wall → floor so faces point out of the material.
  const profile = [
    [0.01, 0],
    [R - 5, 0],
    [R - 1.6, 0.7],
    [R - 0.2, 3.2],
    [R, 5.5],
    [R, H - 1.8],
    [R - 0.45, H - 0.35],
    [R - wall / 2, H],
    [R - wall + 0.45, H - 0.35],
    [R - wall, H - 1.8],
    [R - wall, base + 3.5],
    [R - wall - 3.5, base],
    [0.01, base],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const ceramic = physical({ color: 0xf7f7f5, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 160), ceramic);
  body.name = "mug-body";

  // Handle on +X: a D-shaped tube with an oval-ish feel from a slightly flattened scale.
  const s = H / 96;
  const handleCurve = new THREE.CatmullRomCurve3(
    [
      [R - 3, H * 0.8],
      [R + 13 * s, H * 0.85],
      [R + 26 * s, H * 0.72],
      [R + 29 * s, H * 0.5],
      [R + 23 * s, H * 0.3],
      [R + 10 * s, H * 0.2],
      [R - 3, H * 0.22],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    "catmullrom",
    0.5,
  );
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 120, 5.4 * Math.min(1.1, s), 28, false), ceramic);
  handle.scale.z = 0.82;
  handle.name = "mug-handle";

  const pivot = new THREE.Group();
  pivot.add(body, handle);

  // Wrap print band centred opposite the handle (handle at a = +π/2, so centre at a = -π/2).
  const topY = H / 2 + print.heightMm / 2;
  const band = verticalCylinderBand({ radius: R + 0.12, topY, heightMm: print.heightMm, arcCenter: -Math.PI / 2, arcLengthMm: print.widthMm });
  const printMesh = makePrintMesh(band, inkMaterial({ roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 }));
  const shadow = createContactShadow(R * 3.4, R * 3.0, 0.34);
  shadow.position.x = 6;

  return finish(
    "mug",
    pivot,
    printMesh,
    band,
    shadow,
    (hex) => ceramic.color.set(hex),
    { center: new THREE.Vector3(6, H * 0.5, 0), radius: Math.hypot(R + 24 * s, H / 2) * 1.02, elevationDeg: 14, yawDeg: 0 },
  );
}

/* ----------------------------------------------------------------------------- Pen */

export function buildPen(d: { lengthMm: number; diameterMm: number }, print: { widthMm: number; heightMm: number }): ProductModel {
  const L = d.lengthMm;
  const R = d.diameterMm / 2;
  const plastic = physical({ color: 0x1b1b1d, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const chrome = physical({ color: 0xdedfe2, roughness: 0.12, metalness: 1 });

  const pivot = new THREE.Group();
  const axisY = R;
  const x0 = -L / 2;
  const barrelLen = L * 0.62;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R, R, barrelLen, 64, 1, true), plastic);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(x0 + 18 + barrelLen / 2, axisY, 0);
  const tipProfile = [
    [R, 0],
    [R * 0.96, 6],
    [R * 0.55, 18],
    [0.55, 23],
    [0.01, 24],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tip = new THREE.Mesh(new THREE.LatheGeometry(tipProfile, 48), chrome);
  tip.rotation.z = -Math.PI / 2;
  tip.position.set(x0 + 18 + barrelLen, axisY, 0);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 3, 48), chrome);
  ring.rotation.z = Math.PI / 2;
  ring.position.set(x0 + 18 + barrelLen, axisY, 0);
  const capLen = 18;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.98, R, capLen, 48), plastic);
  cap.rotation.z = Math.PI / 2;
  cap.position.set(x0 + capLen / 2, axisY, 0);
  const plunger = new THREE.Mesh(new THREE.SphereGeometry(R * 0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), chrome);
  plunger.rotation.z = Math.PI / 2;
  plunger.position.set(x0, axisY, 0);
  const clipShape = new THREE.Shape();
  clipShape.moveTo(0, 0);
  clipShape.lineTo(46, 0);
  clipShape.quadraticCurveTo(50, 0, 50, -1.6);
  clipShape.lineTo(46, -2.2);
  clipShape.lineTo(2, -2.2);
  clipShape.lineTo(0, -1.4);
  const clip = new THREE.Mesh(new THREE.ExtrudeGeometry(clipShape, { depth: 3.2, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.3, bevelSegments: 2 }), chrome);
  clip.position.set(x0 + 3, axisY + R + 1.7, -1.6);
  pivot.add(barrel, tip, ring, cap, plunger, clip);

  // Print band on the barrel, facing slightly up towards a typical camera.
  const startX = x0 + 18 + barrelLen / 2 - print.widthMm / 2 + 6;
  const band = horizontalCylinderBand({ radius: R + 0.08, axisY, startX, lengthMm: print.widthMm, arcCenter: 0.2, arcLengthMm: print.heightMm });
  const printMesh = makePrintMesh(band, inkMaterial({ roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
  const shadow = createContactShadow(L * 1.15, R * 7, 0.3);

  return finish(
    "pen",
    pivot,
    printMesh,
    band,
    shadow,
    (hex) => {
      plastic.color.set(hex);
    },
    { center: new THREE.Vector3(0, axisY, 0), radius: L * 0.52, elevationDeg: 22, yawDeg: 0 },
  );
}

/* ----------------------------------------------------------------------------- Bottle */

export function buildBottle(d: { heightMm: number; diameterMm: number }, print: { widthMm: number; heightMm: number }): ProductModel {
  const H = d.heightMm;
  const R = d.diameterMm / 2;
  const bodyTop = H * 0.7;
  const neckR = R * 0.46;
  const profile = [
    [0.01, 0],
    [R - 4, 0],
    [R - 0.8, 1.6],
    [R, 5],
    [R, bodyTop],
    [R * 0.97, bodyTop + 12],
    [R * 0.78, bodyTop + 26],
    [neckR * 1.1, bodyTop + 36],
    [neckR, bodyTop + 40],
    [neckR, H * 0.86],
    [0.01, H * 0.86],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const shell = physical({ color: 0xf2f2f0, roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), shell);
  const capMat = physical({ color: 0xc9ccd0, roughness: 0.25, metalness: 1 });
  const capH = H * 0.15;
  const capProfile = [
    [0.01, 0],
    [neckR * 1.18, 0],
    [neckR * 1.22, capH * 0.8],
    [neckR * 1.05, capH],
    [0.01, capH],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capProfile, 96), capMat);
  cap.position.y = H * 0.85;
  const pivot = new THREE.Group();
  pivot.add(body, cap);

  const topY = bodyTop * 0.55 + print.heightMm / 2;
  const band = verticalCylinderBand({ radius: R + 0.12, topY, heightMm: print.heightMm, arcCenter: 0, arcLengthMm: print.widthMm });
  const printMesh = makePrintMesh(band, inkMaterial({ roughness: 0.42 }));
  const shadow = createContactShadow(R * 3.4, R * 3.4, 0.34);
  let metallic = false;
  return finish(
    "bottle",
    pivot,
    printMesh,
    band,
    shadow,
    (hex) => {
      shell.color.set(hex);
      metallic = hex.toLowerCase() === "#b9bcc0";
      shell.metalness = metallic ? 1 : 0;
      shell.roughness = metallic ? 0.34 : 0.42;
    },
    { center: new THREE.Vector3(0, H * 0.5, 0), radius: H * 0.52, elevationDeg: 12, yawDeg: 0 },
  );
}

/* ----------------------------------------------------------------------------- Tote */

export function buildTote(d: { widthMm: number; heightMm: number }, print: { widthMm: number; heightMm: number }): ProductModel {
  const W = d.widthMm;
  const H = d.heightMm;
  const T = 8;
  const bulge = (x: number, y: number) => 7 * (1 - (x / (W / 2)) ** 2) * Math.sin((Math.PI * Math.min(Math.max(y, 0), H)) / H);
  const geo = new THREE.BoxGeometry(W, H, T, 32, 32, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) + H / 2;
    const z = pos.getZ(i);
    pos.setZ(i, z + Math.sign(z) * bulge(x, y));
  }
  geo.computeVertexNormals();
  const fabric = physical({ color: 0xece4d4, roughness: 0.92, metalness: 0, sheen: 0.7, sheenRoughness: 0.75, sheenColor: new THREE.Color(0xffffff) });
  const bag = new THREE.Mesh(geo, fabric);
  bag.position.y = H / 2;
  const handleCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-W * 0.2, H - 4, 0), new THREE.Vector3(-W * 0.21, H + 130, 0), new THREE.Vector3(0, H + 210, 0), new THREE.Vector3(W * 0.21, H + 130, 0), new THREE.Vector3(W * 0.2, H - 4, 0)]);
  const handleGeo = new THREE.TubeGeometry(handleCurve, 80, 6, 12, false);
  const front = new THREE.Mesh(handleGeo, fabric);
  front.position.z = T / 2 + 1;
  front.rotation.x = -0.08;
  const back = new THREE.Mesh(handleGeo, fabric);
  back.position.z = -T / 2 - 1;
  back.rotation.x = 0.08;
  const pivot = new THREE.Group();
  pivot.add(bag, front, back);

  const centerY = H - 60 - print.heightMm / 2;
  const band = flatPanel({ centerX: 0, centerY, z: T / 2 + 0.25, widthMm: print.widthMm, heightMm: print.heightMm, bulge: (x, y) => bulge(x, y) });
  const printMesh = makePrintMesh(band, inkMaterial({ roughness: 0.9, sheen: 0.4, sheenRoughness: 0.8 }));
  const shadow = createContactShadow(W * 1.3, 120, 0.3);
  return finish(
    "tote",
    pivot,
    printMesh,
    band,
    shadow,
    (hex) => fabric.color.set(hex),
    { center: new THREE.Vector3(0, H * 0.62, 0), radius: (H + 210) * 0.56, elevationDeg: 8, yawDeg: 0 },
  );
}

/* ----------------------------------------------------------------------------- Notebook */

export function buildNotebook(d: { widthMm: number; heightMm: number; depthMm: number }, print: { widthMm: number; heightMm: number }): ProductModel {
  const W = d.widthMm;
  const H = d.heightMm;
  const D = d.depthMm;
  const cover = physical({ color: 0x202022, roughness: 0.72, metalness: 0, clearcoat: 0.08 });
  const paper = physical({ color: 0xf6f3ec, roughness: 0.95 });
  const coverT = 2.2;
  const frontCover = new THREE.Mesh(new THREE.BoxGeometry(W, H, coverT), cover);
  frontCover.position.set(0, H / 2, D / 2 - coverT / 2);
  const backCover = frontCover.clone();
  backCover.position.z = -D / 2 + coverT / 2;
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, H, 24, 1, true, Math.PI, Math.PI), cover);
  spine.position.set(-W / 2, H / 2, 0);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(W - 4, H - 4, D - coverT * 2), paper);
  pages.position.set(1.5, H / 2, 0);
  const elastic = new THREE.Mesh(new THREE.BoxGeometry(6, H + 0.6, D + 1.2), physical({ color: 0x111112, roughness: 0.6 }));
  elastic.position.set(W / 2 - 16, H / 2, 0);
  const pivot = new THREE.Group();
  pivot.add(frontCover, backCover, spine, pages, elastic);

  const band = flatPanel({ centerX: -3, centerY: H / 2, z: D / 2 + 0.12, widthMm: print.widthMm, heightMm: print.heightMm });
  const printMesh = makePrintMesh(band, inkMaterial({ roughness: 0.6 }));
  const shadow = createContactShadow(W * 1.5, D * 6, 0.32);
  return finish(
    "notebook",
    pivot,
    printMesh,
    band,
    shadow,
    (hex) => cover.color.set(hex),
    { center: new THREE.Vector3(0, H / 2, 0), radius: Math.hypot(W, H) * 0.5, elevationDeg: 10, yawDeg: -24 },
  );
}

/* ----------------------------------------------------------------------------- Business cards */

export function buildCards(d: { widthMm: number; heightMm: number; stack: number }, print: { widthMm: number; heightMm: number }): ProductModel {
  const W = d.widthMm;
  const H = d.heightMm;
  const t = 0.45;
  const card = physical({ color: 0xfbfbf9, roughness: 0.9 });
  const edge = physical({ color: 0xefede8, roughness: 0.95 });
  const pivot = new THREE.Group();
  const stackH = d.stack * t;
  const stack = new THREE.Mesh(new THREE.BoxGeometry(W, stackH, H), [edge, edge, card, edge, edge, edge]);
  stack.position.y = stackH / 2;
  pivot.add(stack);
  const band = topPanel({ centerX: 0, centerZ: 0, y: stackH + 0.06, widthMm: print.widthMm, depthMm: print.heightMm });
  const printMesh = makePrintMesh(band, inkMaterial({ roughness: 0.85 }));
  const shadow = createContactShadow(W * 1.6, H * 1.7, 0.28);
  return finish(
    "cards",
    pivot,
    printMesh,
    band,
    shadow,
    (hex) => card.color.set(hex),
    { center: new THREE.Vector3(0, stackH, 0), radius: Math.hypot(W, H) * 0.56, elevationDeg: 48, yawDeg: -18 },
  );
}

export function buildModel(kind: ModelKind, dimensions: Record<string, number>, print: { widthMm: number; heightMm: number }): ProductModel {
  switch (kind) {
    case "mug":
      return buildMug(dimensions as { heightMm: number; diameterMm: number }, print);
    case "pen":
      return buildPen(dimensions as { lengthMm: number; diameterMm: number }, print);
    case "bottle":
      return buildBottle(dimensions as { heightMm: number; diameterMm: number }, print);
    case "tote":
      return buildTote(dimensions as { widthMm: number; heightMm: number }, print);
    case "notebook":
      return buildNotebook(dimensions as { widthMm: number; heightMm: number; depthMm: number }, print);
    case "cards":
      return buildCards(dimensions as { widthMm: number; heightMm: number; stack: number }, print);
  }
}
