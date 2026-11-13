// K1362 t2: a gf pool slice worker. The coordinator (gf_worker.ts) gives it
// two kinds of work, both pure slices of buildTables (tables.ts) whose
// results the coordinator merges in order, bit for bit:
// - "raw": one chain range's raw vertex tables (gfRawChain);
// - "solve": one junction range's corners (solveGfCorners) and one chunk
//   range's bin lists (gfChunkBinPart) over the broadcast prefix.
// It holds no state between messages.
import {
  buildGfArms,
  gfChunkBinPart,
  gfRawChain,
  solveGfCorners,
  type GfChunkMeta,
  type GfPrefix,
} from "./tables";

interface RawReq {
  kind: "raw";
  id: number;
  chains: { ci: number; pts: Float64Array; closed: boolean }[];
}
interface SolveReq {
  kind: "solve";
  id: number;
  P: GfPrefix;
  meta: GfChunkMeta;
  jLo: number;
  jHi: number;
  qLo: number;
  qHi: number;
}
type Req = RawReq | SolveReq;

interface WorkerScope {
  postMessage(msg: unknown, options?: { transfer: Transferable[] }): void;
  onmessage: ((e: MessageEvent<Req>) => void) | null;
}
const scope = self as unknown as WorkerScope;
scope.onmessage = (e: MessageEvent<Req>): void => {
  const d = e.data;
  try {
    if (d.kind === "raw") {
      const blocks = d.chains.map((c) => ({ ci: c.ci, ...gfRawChain(c.pts, c.closed) }));
      const transfer: Transferable[] = [];
      for (const b of blocks) transfer.push(b.vx.buffer, b.vy.buffer, b.vs.buffer);
      scope.postMessage({ kind: "raw", id: d.id, blocks }, { transfer });
    } else {
      const arms = buildGfArms(d.P, 0, d.P.junctions.length);
      const P = { ...d.P, arms };
      const K = solveGfCorners(P, d.jLo, d.jHi);
      const part = gfChunkBinPart(P, d.meta, d.qLo, d.qHi);
      scope.postMessage(
        { kind: "solve", id: d.id, K, arms, cellChN: part.cellChN, cellChList: part.cellChList },
        { transfer: [part.cellChN.buffer as ArrayBuffer, part.cellChList.buffer as ArrayBuffer] }
      );
    }
  } catch (err) {
    scope.postMessage({ kind: d.kind, id: d.id, error: err instanceof Error ? err.message : String(err) });
  }
};
scope.postMessage({ hello: true });
