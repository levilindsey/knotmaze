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
  // (e.g. crossing patches with wrap-around arc windows).
  updateFromWindow(centerline: Float32Array, halfWidth: number): void {
    for (let i = 0; i < this.sampleCount; i++) {
      const cx = centerline[i * 4];
      const cy = centerline[i * 4 + 1];
      const tx = centerline[i * 4 + 2];
      const ty = centerline[i * 4 + 3];
      this.vertexData[i * 4] = cx - ty * halfWidth;
      this.vertexData[i * 4 + 1] = cy + tx * halfWidth;
      this.vertexData[i * 4 + 2] = cx + ty * halfWidth;
      this.vertexData[i * 4 + 3] = cy - tx * halfWidth;
    }
    this.mesh.geometry.getBuffer("aPosition").update();
  }

  destroy(): void {
    this.mesh.destroy({ children: true });
  }
}
