// A constant-size triangle-strip ribbon extruded from a centerline. The
// sample count is fixed at construction so per-frame updates only rewrite
// the position buffer (no geometry reallocation).

import { Mesh, MeshGeometry, Texture } from "pixi.js";

export class RibbonMesh {
  mesh: Mesh;
  readonly sampleCount: number;

  private vertexData: Float32Array;

  constructor(sampleCount: number, closed: boolean, color: number) {
    this.sampleCount = sampleCount;
    this.vertexData = new Float32Array(sampleCount * 4); // 2 verts per sample.

    const uvs = new Float32Array(sampleCount * 4);
    for (let i = 0; i < sampleCount; i++) {
      const u = i / (closed ? sampleCount : Math.max(sampleCount - 1, 1));
      uvs[i * 4] = u;
      uvs[i * 4 + 1] = 0;
      uvs[i * 4 + 2] = u;
      uvs[i * 4 + 3] = 1;
    }

    const quadCount = closed ? sampleCount : sampleCount - 1;
    const indices = new Uint32Array(quadCount * 6);
    for (let i = 0; i < quadCount; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = ((i + 1) % sampleCount) * 2;
      const d = ((i + 1) % sampleCount) * 2 + 1;
      indices.set([a, b, c, b, d, c], i * 6);
    }

    const geometry = new MeshGeometry({
      positions: this.vertexData,
      uvs,
      indices,
    });
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.mesh.tint = color;
  }

  // Rewrite vertex positions from a centerline. `positions`/`tangents` are
  // flat [x0,y0,...] arrays; `offset` selects the first sample to read.
  update(
    positions: Float32Array,
    tangents: Float32Array,
    halfWidth: number,
    offset = 0
  ): void {
    for (let i = 0; i < this.sampleCount; i++) {
      const s = (offset + i) * 2;
      const cx = positions[s];
      const cy = positions[s + 1];
      // Normal is the tangent rotated 90 degrees.
      const nx = -tangents[s + 1] * halfWidth;
      const ny = tangents[s] * halfWidth;
      this.vertexData[i * 4] = cx + nx;
      this.vertexData[i * 4 + 1] = cy + ny;
      this.vertexData[i * 4 + 2] = cx - nx;
      this.vertexData[i * 4 + 3] = cy - ny;
    }
    this.mesh.geometry.getBuffer("aPosition").update();
  }

  // Variant for callers that assemble the centerline window themselves
  // (e.g. crossing patches with wrap-around arc windows). halfWidth may be
  // per-sample, which lets casings taper at their ends.
  updateFromWindow(
    centerline: Float32Array,
    halfWidth: number | Float32Array
  ): void {
    for (let i = 0; i < this.sampleCount; i++) {
      const w = typeof halfWidth === "number" ? halfWidth : halfWidth[i];
      const cx = centerline[i * 4];
      const cy = centerline[i * 4 + 1];
      const tx = centerline[i * 4 + 2];
      const ty = centerline[i * 4 + 3];
      this.vertexData[i * 4] = cx - ty * w;
      this.vertexData[i * 4 + 1] = cy + tx * w;
      this.vertexData[i * 4 + 2] = cx + ty * w;
      this.vertexData[i * 4 + 3] = cy - tx * w;
    }
    this.mesh.geometry.getBuffer("aPosition").update();
  }

  destroy(): void {
    this.mesh.destroy({ children: true });
  }
}

// A stations x lanes grid mesh for crossing erase patches: stations run
// along the under thread, lanes run across its width. Both boundary rows
// (the cut caps) and boundary columns (the ribbon sides) are polylines, so
// caps can curve to follow the over thread's offset curve.
export class PatchGridMesh {
  mesh: Mesh;
  readonly stations: number;
  readonly lanes: number;

  private vertexData: Float32Array;

  constructor(stations: number, lanes: number, color: number) {
    this.stations = stations;
    this.lanes = lanes;
    this.vertexData = new Float32Array(stations * lanes * 2);

    const uvs = new Float32Array(stations * lanes * 2);
    for (let k = 0; k < stations; k++) {
      for (let l = 0; l < lanes; l++) {
        uvs[(k * lanes + l) * 2] = k / (stations - 1);
        uvs[(k * lanes + l) * 2 + 1] = l / (lanes - 1);
      }
    }

    const indices = new Uint32Array((stations - 1) * (lanes - 1) * 6);
    let i = 0;
    for (let k = 0; k < stations - 1; k++) {
      for (let l = 0; l < lanes - 1; l++) {
        const a = k * lanes + l;
        const b = a + 1;
        const c = a + lanes;
        const d = c + 1;
        indices.set([a, b, c, b, d, c], i);
        i += 6;
      }
    }

    const geometry = new MeshGeometry({
      positions: this.vertexData,
      uvs,
      indices,
    });
    this.mesh = new Mesh({ geometry, texture: Texture.WHITE });
    this.mesh.tint = color;
  }

  setVertex(station: number, lane: number, x: number, y: number): void {
    const i = (station * this.lanes + lane) * 2;
    this.vertexData[i] = x;
    this.vertexData[i + 1] = y;
  }

  commit(): void {
    this.mesh.geometry.getBuffer("aPosition").update();
  }

  destroy(): void {
    this.mesh.destroy({ children: true });
  }
}
