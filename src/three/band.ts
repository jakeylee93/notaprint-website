import * as THREE from "three";

/**
 * Print surfaces are dedicated meshes whose UV square maps 1:1 onto the physical print rectangle.
 * u runs left→right as seen from outside, t runs top→bottom (canvas convention). Because
 * CanvasTexture uses flipY=true, uv.y = 1 - t puts the canvas top at the top of the print.
 */
export type SurfaceFn = (u: number, t: number, out: THREE.Vector3) => void;

export interface BandSpec {
  position: SurfaceFn;
  normal: SurfaceFn;
  segmentsU: number;
  segmentsT: number;
}

export function buildSurfaceGeometry(spec: BandSpec): THREE.BufferGeometry {
  const { segmentsU: nu, segmentsT: nt } = spec;
  const count = (nu + 1) * (nt + 1);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  let k = 0;
  for (let j = 0; j <= nt; j++) {
    const t = j / nt;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      spec.position(u, t, p);
      spec.normal(u, t, n);
      positions.set([p.x, p.y, p.z], k * 3);
      normals.set([n.x, n.y, n.z], k * 3);
      uvs.set([u, 1 - t], k * 2);
      k++;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < nt; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + (nu + 1);
      const d = c + 1;
      // Counter-clockwise as seen from outside: (top-left, bottom-left, top-right), (top-right, bottom-left, bottom-right)
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

/**
 * Vertical cylinder band (mug, bottle). Angle a is measured from +Z towards +X, so increasing a
 * moves to the viewer's right when looking at the surface from outside.
 */
export function verticalCylinderBand(opts: {
  radius: number;
  topY: number;
  heightMm: number;
  arcCenter: number;
  arcLengthMm: number;
  segmentsU?: number;
  segmentsT?: number;
}): BandSpec {
  const { radius, topY, heightMm, arcCenter, arcLengthMm } = opts;
  const span = arcLengthMm / radius;
  const angle = (u: number) => arcCenter + (u - 0.5) * span;
  return {
    segmentsU: opts.segmentsU ?? Math.max(24, Math.ceil(span * 40)),
    segmentsT: opts.segmentsT ?? 4,
    position: (u, t, out) => {
      const a = angle(u);
      out.set(radius * Math.sin(a), topY - t * heightMm, radius * Math.cos(a));
    },
    normal: (u, _t, out) => {
      const a = angle(u);
      out.set(Math.sin(a), 0, Math.cos(a));
    },
  };
}

/** Horizontal cylinder band along +X (pen barrel). u runs along the barrel, t around it. */
export function horizontalCylinderBand(opts: {
  radius: number;
  axisY: number;
  startX: number;
  lengthMm: number;
  arcCenter: number;
  arcLengthMm: number;
}): BandSpec {
  const { radius, axisY, startX, lengthMm, arcCenter, arcLengthMm } = opts;
  const span = arcLengthMm / radius;
  // b measured from +Z towards +Y; canvas top (t=0) sits higher on the barrel.
  const angle = (t: number) => arcCenter + (0.5 - t) * span;
  return {
    segmentsU: 8,
    segmentsT: Math.max(12, Math.ceil(span * 24)),
    position: (u, t, out) => {
      const b = angle(t);
      out.set(startX + u * lengthMm, axisY + radius * Math.sin(b), radius * Math.cos(b));
    },
    normal: (_u, t, out) => {
      const b = angle(t);
      out.set(0, Math.sin(b), Math.cos(b));
    },
  };
}

/** Flat panel facing +Z, optionally bulged by a displacement function (tote fabric). */
export function flatPanel(opts: {
  centerX: number;
  centerY: number;
  z: number;
  widthMm: number;
  heightMm: number;
  bulge?: (x: number, y: number) => number;
}): BandSpec {
  const { centerX, centerY, z, widthMm, heightMm, bulge } = opts;
  const eps = 0.5;
  const pos = (u: number, t: number, out: THREE.Vector3) => {
    const x = centerX + (u - 0.5) * widthMm;
    const y = centerY + (0.5 - t) * heightMm;
    out.set(x, y, z + (bulge ? bulge(x, y) : 0));
  };
  return {
    segmentsU: bulge ? 24 : 1,
    segmentsT: bulge ? 24 : 1,
    position: pos,
    normal: (u, t, out) => {
      if (!bulge) {
        out.set(0, 0, 1);
        return;
      }
      const x = centerX + (u - 0.5) * widthMm;
      const y = centerY + (0.5 - t) * heightMm;
      const dzdx = (bulge(x + eps, y) - bulge(x - eps, y)) / (2 * eps);
      const dzdy = (bulge(x, y + eps) - bulge(x, y - eps)) / (2 * eps);
      out.set(-dzdx, -dzdy, 1).normalize();
    },
  };
}

/** Flat panel facing +Y (lying on a surface), canvas top towards -Z. */
export function topPanel(opts: { centerX: number; centerZ: number; y: number; widthMm: number; depthMm: number }): BandSpec {
  const { centerX, centerZ, y, widthMm, depthMm } = opts;
  return {
    segmentsU: 1,
    segmentsT: 1,
    position: (u, t, out) => out.set(centerX + (u - 0.5) * widthMm, y, centerZ + (t - 0.5) * depthMm),
    normal: (_u, _t, out) => out.set(0, 1, 0),
  };
}
