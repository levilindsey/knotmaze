import { ChannelScheduler, PhysicsWorkerCore, epochMs } from "./physics_worker_core";
import type { MainToWorker, WorkerToMain } from "./physics_worker_core";

// THE PHYSICS WORKER (K7 stage 3, docs/design/K7_worker.md): the module
// worker WorkerHost (worker_host.ts) starts behind `phw`. Everything it does
// is PhysicsWorkerCore's (stage 2, tested in Node); this file only connects
// the core to the worker's message port and yields between substeps through
// a MessageChannel.

// The worker scope, typed by hand: the project compiles against the DOM
// lib, and adding the webworker lib beside it collides.
interface WorkerScope {
  postMessage(msg: WorkerToMain, options: { transfer: Transferable[] }): void;
  onmessage: ((e: MessageEvent<MainToWorker>) => void) | null;
}
const scope = self as unknown as WorkerScope;

const core = new PhysicsWorkerCore(
  new ChannelScheduler(),
  (msg: WorkerToMain, transfer?: Transferable[]) => {
    scope.postMessage(msg, { transfer: transfer ?? [] });
  }
);

scope.onmessage = (e: MessageEvent<MainToWorker>): void => {
  core.onMessage(e.data);
};

// K7 stage 5: the module has run (the start gate's probe; main records it).
scope.postMessage({ type: "hello", at: epochMs(performance.now()) }, { transfer: [] });
