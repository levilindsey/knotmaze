import type { FabricMazeController } from "../game/fabric_controller";
import type { MinotaurChase } from "../game/minotaur";
import type { TurnMinotaur } from "../game/minotaur_turns";
import { firstSmolderIndex, routeWarning } from "../game/route_plan";
import { GamepadInput } from "../ui/gamepad";
import type { GamepadSnapshot } from "../ui/gamepad";
import {
  HeldKeys,
  KEY_REACH,
  MoveWait,
  absorbsChord,
  chordEdges,
  chordMatters,
  departureVectors,
  holdDue,
  keyBelongsElsewhere,
  keyDirOf,
  pickHold,
  pickMove,
  queuedPressHeld,
  tapWhileMoving,
  waitKeyOf,
} from "../ui/key_moves";
import type {
  Departure,
  KeyDir,
  LastPress,
  WaitingMove,
} from "../ui/key_moves";
import { cutKeyOf } from "../ui/cut_buttons";
import type { CutKey } from "../ui/cut_buttons";
import { walkerKeyOf } from "../ui/walker_buttons";
import type { WalkerKey } from "../ui/walker_buttons";
import { aidKeyOf } from "../ui/aid_buttons";
import type { AidKey } from "../ui/aid_buttons";
import { sprintKeyOf } from "../game/sprint";
import { MovePad } from "../ui/move_pad";
import type { UrlParams } from "../ui/url_state";
import type { SceneRef } from "./scene_ref";

// K5 M6 (docs/design/K5_K6_split.md, 2.2): key input, moved out of main()
// as it was: K120's moves by direction (the held keys, chords, the
// waiting move, the hold), the window key listeners, the move pad and
// the gamepad poll. main.ts calls createKeyInput once, where the key
// moves were, and destructures what the frame loop and the probe hooks
// call under their old names. The session functions it moves through
// (moveAlong, chaseAlong, waitTurn, the route machinery) stay in main.ts
// for M7 and come in as `deps`; the session `let`s it only reads
// (turnWait, pendingWin, pendingLoss, the last move's hunt) are getters
// or calls on `deps`, so moved lines say `deps.<name>` for those.
// heldKeys, moveWait, keyHold and tapsWait are the returned object's:
// never destructure the `let`s, or the copy goes stale.

// What key input reads from main(): values and functions, each assigned
// once, then accessors for the session `let`s main.ts keeps.
export interface KeyInputDeps {
  params: UrlParams;
  sceneReady: () => boolean;
  moveAlong: (eid: number) => boolean;
  chaseAlong: (eid: number) => boolean;
  waitTurn: () => boolean;
  clearRoute: () => void;
  routeStep: () => boolean;
  dotMoving: () => boolean;
  smolderToast: () => void;
  teleOf: () => { edges: number[]; verts: string[] };
  moveHuntWas: () => boolean;
  readonly turnWait: number;
  readonly pendingWin: boolean;
  readonly pendingLoss: boolean;
  // K456: true while the WebGL context is lost (src/app/context_loss.ts):
  // nothing on screen to steer, so keys, the pad and the gamepad wait.
  contextLost?: () => boolean;
  // K114 CUT (main.ts): a move through a contracted junction carries on,
  // one run per arrival, ahead of anything else keyStep does (true while
  // it is in charge), then a cut tapped mid-move lands; and the scissors'
  // keys (cutKeyOf; true when the key acted).
  carryStep?: () => boolean;
  cutKey?: (k: CutKey) => boolean;
  // K114 WALKER (main.ts): G sends the walker off (Lead) or lets it take a
  // run (Delay); U comes through cutKey. True when the key acted.
  walkerKey?: (k: WalkerKey) => boolean;
  // K137 stage 2 AIDS (main.ts): H lights a hint, C ticks or rubs out the
  // head's junction, while their buttons show. True when the key acted.
  aidKey?: (k: AidKey) => boolean;
  // K137 stage 3c SPRINT (main.ts): F spends the sprint (or disarms it on
  // the turn clock), while its button shows. True when the key acted.
  sprintKey?: () => boolean;
}

export function createKeyInput(deps: KeyInputDeps, scene: SceneRef) {
  const {
    params,
    sceneReady,
    moveAlong,
    chaseAlong,
    waitTurn,
    clearRoute,
    routeStep,
    dotMoving,
    smolderToast,
    teleOf,
  } = deps;
  // K120: moves by direction - the arrow keys, WASD and the move pad (the
  // rules are in ui/key_moves.ts). A press moves at once along the run its
  // key picks, through moveAlong / chaseAlong, so it is a tap on that run
  // to everything that records one (the move log, the saved attempt, the
  // stats, the chase's inputs). A key still down when the dot arrives
  // takes the next matching run (keyStep, every frame after the move
  // animation), and the choice hover shows that run while the dot travels.
  // K333: two keys beside each other pressed together are a chord (a
  // diagonal); a lone key that is ambiguous at its junction waits
  // CHORD_WINDOW_MS for one. K334: a press while the dot travels waits for
  // the arrival (the latest press wins) instead of snapping the dot.
  const heldKeys = new HeldKeys();
  let keyHold = false; // A press moved and its key may still be down.
  let keyHoldSince = 0; // performance.now() of that press.
  // What the hold moved in: a tap, a reset, a catch or a rebuild ends it.
  let keyHoldFc: FabricMazeController | null = null;
  let keyHoldTaps = 0;
  // What a hold or a waiting press counts as "the solve moved": the taps,
  // or with K114's cut on the actions (a move's carried runs are taps, and
  // must not end the hold that made it).
  const solveLen = (fc: FabricMazeController | null): number =>
    !fc ? 0 : fc.cutOn ? fc.actions.length : fc.taps.length;
  let keyHoldChase: MinotaurChase | null = null;
  let keyHoldTurnMino: TurnMinotaur | null = null;
  let keyHoldInputs = 0;
  let keyHoldCatches = 0;
  let keyHoldTick = 0;
  // Real time: a press while running queues its run for the arrival; the
  // hover shows it until the player leaves the run it was queued on.
  let keyQueued = -1;
  let keyQueuedOn = -1;
  let keyQueuedDir = 0;
  let keyHover = false; // The choice hover is the hold's.
  // What a waiting press was pressed in: a tap, a reset, a catch or a
  // rebuild since drops it.
  const keyStamp = () => ({
    fc: scene.fabricController,
    chase: scene.chase,
    turnMino: scene.turnMino,
    taps: solveLen(scene.fabricController),
    inputs: scene.chase?.inputs.length ?? 0,
    catches: scene.chase?.catches ?? scene.turnMino?.catches ?? 0,
  });
  type KeyStamp = ReturnType<typeof keyStamp>;
  const sameStamp = (a: KeyStamp, b: KeyStamp): boolean =>
    a.fc === b.fc &&
    a.chase === b.chase &&
    a.turnMino === b.turnMino &&
    a.taps === b.taps &&
    a.inputs === b.inputs &&
    a.catches === b.catches;
  // K333/K334: the move not taken yet (ui/key_moves.ts MoveWait), and the
  // solve it was made in (keyStep drops it when that changes).
  const moveWait = new MoveWait();
  let moveWaitStamp: KeyStamp | null = null;
  // K333: the last lone press that moved at once (absorbsChord).
  let keyLast: LastPress | null = null;
  // Levi's correction (2026-10-15): taps mid-move are ignored and keys
  // gate on held-at-arrival, so nothing reads a tap-wait switch any
  // more; the hook's tapsWait stays as a readable legacy flag (no-op).
  let tapsWait = true;
  const keyPt = new Float32Array(2);
  const keyFlow = new Float32Array(2);
  // A chain's world position as the ribbons draw it (with the flow field).
  const keyPointAt = (chain: number, ctrl: number, out: Float32Array): void => {
    scene.ps!.pointOnChain(chain, ctrl, out, 0);
    scene.renderer!.flowOffset(out[0], out[1], keyFlow);
    out[0] += keyFlow[0];
    out[1] += keyFlow[1];
  };
  // The junction a key move leaves from: the head (the destination while a
  // move animates), or in real time the chase's decision vertex.
  const keyVertex = (): string | null => {
    if (!scene.fabricController || scene.fabricController.solved) return null;
    if (scene.chase) return scene.chase.finished ? null : scene.chase.decisionVertex;
    return scene.fabricController.head;
  };
  const keyDepartures = (v: string, reach = KEY_REACH): Departure[] => {
    const wv = scene.walkGraph?.vertices.get(v);
    if (!wv || !scene.walkGraph || !scene.fabric) return [];
    scene.fabric.vertexWorld(v, keyPt, 0);
    // K114: a burnt run is no choice (choices() drops it); a smoldering arm
    // stays, its refusal toasts as a tap's does.
    const fc = scene.fabricController;
    const edges = fc?.fire && v === fc.head ? fc.choices() : wv.edges;
    return departureVectors(
      scene.walkGraph.edges,
      edges,
      v,
      keyPt[0],
      keyPt[1],
      keyPointAt,
      reach
    );
  };
  // Keys play only a maze on screen and still open: not in knot mode,
  // during the intro, once solved or while the finish lands.
  const keysLive = (): boolean =>
    params.mazeFabric &&
    scene.fabric !== null &&
    scene.fabricController !== null &&
    scene.walkGraph !== null &&
    scene.ps !== null &&
    scene.renderer !== null &&
    sceneReady() &&
    !scene.fabricController.solved &&
    !deps.pendingWin &&
    // K114: a lost burn race (or one whose loss is landing) takes no moves.
    !scene.fabricController.fireLost &&
    !deps.pendingLoss &&
    !(scene.chase?.finished ?? false) &&
    !(deps.contextLost?.() ?? false);
  const setKeyHover = (eid: number): void => {
    // K481 stage 3: a held key's pick lights its telegraph tick too.
    if (!scene.fabric || !scene.fabricController) return;
    keyHover = eid >= 0;
    scene.fabric.setTelegraphHover(eid >= 0 ? eid : null);
    if (scene.fabric.setHover(eid)) scene.fabric.update(scene.fabricController);
  };
  // A waiting press outlives the hold (a quick press mid-move is still
  // taken on arrival); keyStep drops it when its stamp changes.
  const endKeyHold = (): void => {
    keyHold = false;
    keyQueued = -1;
    if (keyHover && moveWait.waiting === null) setKeyHover(-1);
  };
  const noteKeyMove = (): void => {
    keyHold = true;
    keyHoldFc = scene.fabricController;
    keyHoldTaps = solveLen(scene.fabricController);
    keyHoldChase = scene.chase;
    keyHoldTurnMino = scene.turnMino;
    if (scene.chase) {
      keyHoldInputs = scene.chase.inputs.length;
      keyHoldCatches = scene.chase.catches;
      keyHoldTick = scene.chase.tick;
    } else if (scene.turnMino) {
      keyHoldCatches = scene.turnMino.catches; // K80 turns.
    }
  };
  // One move by direction; true when it moved (queued, in real time).
  const keyMoveAlong = (eid: number): boolean => {
    if (!scene.fabricController) return false;
    if (scene.chase) {
      const p = scene.chase.player;
      if (!chaseAlong(eid)) return false;
      keyQueued = p.edge >= 0 ? eid : -1;
      keyQueuedOn = p.edge;
      keyQueuedDir = p.dir;
      return true;
    }
    const before = scene.fabricController.taps.length;
    const caught = scene.turnMino?.catches ?? 0;
    clearRoute(); // A key (press or hold) replaces a tap's route (K480).
    moveAlong(eid);
    // K80 turns: a move that was caught ends the hold at once (the keys
    // must come up first, as in real time).
    if (scene.turnMino && scene.turnMino.catches !== caught) {
      heldKeys.clear();
      endKeyHold();
      return false;
    }
    return scene.fabricController.taps.length > before;
  };
  // A press taken: one key, or a chord (two keys beside each other, oldest
  // first), from the junction the keys leave from, as a tap. No match does
  // nothing; a hold already running keeps going. `at`: when its first key
  // went down.
  const pressMove = (dirs: readonly KeyDir[], at: number): void => {
    const v = keyVertex();
    if (v === null) return;
    const deps = keyDepartures(v);
    const p = pickMove(deps, dirs, { hold: false });
    if (p.edge < 0) return;
    const lone = dirs.length === 1 ? dirs[0] : null;
    const chords = lone ? chordEdges(deps, lone) : {};
    if (keyHover) setKeyHover(-1);
    if (keyMoveAlong(p.edge)) {
      keyHoldSince = at;
      noteKeyMove();
      keyLast = lone ? { dir: lone, at, edge: p.edge, chords } : null;
    }
  };
  // Take a waiting move: keys along what they pick now, a tap's run, or a
  // wait (K80 turns 3a).
  const takeWaiting = (w: WaitingMove | null): void => {
    if (w === null) return;
    if (w.wait) {
      if (keyHover) setKeyHover(-1);
      waitTurn();
      return;
    }
    if (w.edge >= 0) {
      if (keyHover) setKeyHover(-1);
      moveAlong(w.edge); // K334: the tap, on the arrival.
      return;
    }
    pressMove(w.dirs, w.at);
  };
  // K334: the turn is under way: the dot travels, or (K80 turns 3a) a
  // wait's turn plays (turnWait), so the minotaur's marker is never cut
  // short either. Turn by turn only: real time queues in the chase, so
  // nothing waits for it here.
  // K80 turns 3a: the WAIT from any input - the wait key, the pad's center,
  // a tap on the head (and the probe hook). A press waiting out its chord
  // window goes first (it was pressed first); a wait ends a hold, as a tap
  // does; while the turn is under way it waits for the arrival (MoveWait,
  // the latest input winning), else it is taken at once. True when it was
  // taken or queued.
  const inputWait = (): boolean => {
    if (!scene.turnMino || !scene.fabric || !scene.fabricController) return false;
    if (moveWait.waiting !== null && !moveWait.waiting.queued) {
      takeWaiting(moveWait.takeNow());
    }
    endKeyHold();
    clearRoute();
    if (!scene.turnMino) return false; // The press before it was caught.
    if (moveWait.wait(performance.now(), dotMoving())) {
      moveWaitStamp = keyStamp();
      if (keyHover) setKeyHover(-1);
      return true;
    }
    return waitTurn();
  };
  // A fresh press (or a pad press) at `at` (performance.now()).
  const keyPress = (dir: KeyDir, at: number): void => {
    if (keyVertex() === null) return;
    // A press waiting out its window that this key does not join goes
    // first.
    takeWaiting(moveWait.before(dir, at));
    const v = keyVertex();
    if (v === null) return;
    const action = moveWait.press(dir, at, {
      moving: dotMoving(),
      absorbed:
        keyLast !== null && absorbsChord(keyLast, dir, at, heldKeys.holds(keyLast.dir)),
      ambiguous: () => chordMatters(keyDepartures(v), dir),
    });
    if (action === "chord") {
      if (!moveWait.waiting?.queued) takeWaiting(moveWait.takeNow());
    } else if (action === "queue" || action === "window") {
      moveWaitStamp = keyStamp();
    } else if (action === "now") {
      pressMove([dir], at);
    }
  };
  // K333/K334: the waiting move, every frame. True while it waits (a hold
  // waits with it) or when it was taken this frame.
  const stepWaiting = (now: number): boolean => {
    const w = moveWait.waiting;
    if (w === null) return false;
    const v = keyVertex();
    if (
      v === null ||
      !keysLive() ||
      moveWaitStamp === null ||
      !sameStamp(moveWaitStamp, keyStamp())
    ) {
      moveWait.clear();
      if (keyHover) setKeyHover(-1);
      return false;
    }
    const moving = dotMoving();
    const wasQueued = w.queued; // step() clears it on the object it hands back.
    const due = moveWait.step(now, moving, (d) => chordMatters(keyDepartures(v), d));
    if (due === "wait") {
      // While the dot travels the hover shows what the move takes (a wait
      // takes no run).
      if (moving) {
        setKeyHover(
          w.wait
            ? -1
            : w.edge >= 0
              ? w.edge
              : pickMove(keyDepartures(v), w.dirs, { hold: false }).edge
        );
        // K481 stage 3: a queued wait lights the wait's tick, not none.
        if (w.wait) scene.fabric?.setTelegraphHover(-1);

      }
      return true;
    }
    // Levi's correction: a press queued mid-move counts only when its
    // key (both, for a chord) is still held on this arrival frame;
    // press-and-release before it is discarded.
    if (
      due !== null &&
      !queuedPressHeld(
        { dirs: due.dirs, at: due.at, queued: wasQueued, edge: due.edge, wait: due.wait },
        (d) => heldKeys.holds(d)
      )
    ) {
      if (keyHover) setKeyHover(-1);
      return true;
    }
    takeWaiting(due);
    return true;
  };
  // Every frame, after the move animation (or the chase) stepped.
  const keyStep = (): void => {
    if (deps.carryStep?.()) return; // K114: a move carrying on.
    if (stepWaiting(performance.now())) return;
    if (routeStep()) return; // K480: a multi-run tap's next run, on arrival.
    if (!keyHold) return;
    const fc = scene.fabricController;
    if (
      heldKeys.size === 0 ||
      !keysLive() ||
      !fc ||
      fc !== keyHoldFc ||
      scene.chase !== keyHoldChase ||
      scene.turnMino !== keyHoldTurnMino
    ) {
      endKeyHold();
      return;
    }
    // K80 turns: caught, as in real time - the keys must come up first.
    if (scene.turnMino && scene.turnMino.catches !== keyHoldCatches) {
      heldKeys.clear();
      endKeyHold();
      return;
    }
    if (scene.chase) {
      if (scene.chase.catches !== keyHoldCatches) {
        // Caught and back at the entrance: the keys must come up first.
        heldKeys.clear();
        endKeyHold();
        return;
      }
      if (scene.chase.inputs.length !== keyHoldInputs) {
        endKeyHold(); // A tap took over.
        return;
      }
    } else if (solveLen(fc) !== keyHoldTaps) {
      endKeyHold(); // A tap, Reset path or a restore moved the solve.
      return;
    }
    const v = keyVertex();
    if (v === null) {
      endKeyHold();
      return;
    }
    const taps = fc.taps;
    const arrival = taps.length > 0 ? taps[taps.length - 1] : -1;
    if (scene.chase && keyQueued >= 0) {
      const p = scene.chase.player;
      if (p.edge === keyQueuedOn && p.dir === keyQueuedDir) {
        setKeyHover(keyQueued); // Still on the run it was queued from.
        return;
      }
      keyQueued = -1;
    }
    const pick = pickHold(keyDepartures(v), heldKeys.dirs, arrival);
    const moving = scene.chase
      ? scene.chase.playerMoving || scene.chase.tick === keyHoldTick
      : dotMoving();
    if (!holdDue({ moving, now: performance.now(), since: keyHoldSince })) {
      setKeyHover(pick.edge); // What the hold takes next.
      return;
    }
    // Arrived: the next run on this same frame (a held key chains with no
    // pause and no snap), or the hold stops here (no match, a tie, a
    // dead-end tip - its only run is the arrival).
    // K480 (decision 5): a hold stops for the route's warnings too,
    // judged on the run it would take next (real time has none).
    if (pick.edge >= 0 && !scene.chase) {
      const tele = teleOf();
      const warn = routeWarning({
        huntWas: deps.moveHuntWas(),
        huntIs: scene.turnMino?.hunting ?? false,
        walk: fc.walk,
        head: fc.head,
        remaining: [pick.edge],
        teleEdges: tele.edges,
        teleVertices: tele.verts,
        smolderAt:
          fc.fire?.clock === "turn"
            ? firstSmolderIndex(fc.walk, fc.fire, fc.walkedDist, fc.head, [pick.edge])
            : -1,
      });
      if (warn) {
        if (warn === "smolder") smolderToast();
        endKeyHold();
        return;
      }
    }
    if (pick.edge < 0 || !keyMoveAlong(pick.edge)) {
      endKeyHold();
      return;
    }
    noteKeyMove();
  };
  window.addEventListener("keydown", (e) => {
    const dir = keyDirOf(e);
    if (dir === null) {
      // K114: the scissors' keys (X, Esc, U), while the cut is on.
      const ck = cutKeyOf(e);
      if (ck !== null && deps.cutKey) {
        if (e.repeat || keyBelongsElsewhere(e) || !keysLive()) return;
        if (deps.cutKey(ck)) e.preventDefault();
        return;
      }
      // K114 walker: G (Go / Let it walk), while the walker's buttons show.
      if (walkerKeyOf(e) === "go" && deps.walkerKey) {
        if (e.repeat || keyBelongsElsewhere(e) || !keysLive()) return;
        if (deps.walkerKey("go")) e.preventDefault();
        return;
      }
      // K137 stage 2: the aids' keys (H, C), while their buttons show.
      const ak = aidKeyOf(e);
      if (ak !== null && deps.aidKey) {
        if (e.repeat || keyBelongsElsewhere(e) || !keysLive()) return;
        if (deps.aidKey(ak)) e.preventDefault();
        return;
      }
      // K137 stage 3c: sprint's key (F), while its button shows.
      if (sprintKeyOf(e) && deps.sprintKey) {
        if (e.repeat || keyBelongsElsewhere(e) || !keysLive()) return;
        if (deps.sprintKey()) e.preventDefault();
        return;
      }
      // K80 turns 3a: the WAIT key (`.`, or Space off a button or link),
      // with the turn minotaur on; one wait a press (no hold). Shift is let
      // through for `.` (some layouts need it).
      if (!scene.turnMino || !waitKeyOf(e)) return;
      const guard = {
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey && e.key !== ".",
        defaultPrevented: e.defaultPrevented,
        target: e.target,
      };
      if (keyBelongsElsewhere(guard) || !keysLive()) return;
      e.preventDefault();
      if (!e.repeat) inputWait();
      return;
    }
    const id = e.code || e.key;
    if (e.repeat) {
      // The browser's own repeat: the hold does the repeating.
      if (heldKeys.has(id)) e.preventDefault();
      return;
    }
    if (keyBelongsElsewhere(e) || !keysLive()) return;
    e.preventDefault();
    const at = performance.now();
    if (!heldKeys.press(id, dir, at)) return;
    keyPress(dir, at);
  });
  // K333: a key that comes up ends its press's chord window: no second key
  // is coming.
  const releaseKey = (id: string): void => {
    heldKeys.release(id);
    takeWaiting(moveWait.release((d) => heldKeys.holds(d)));
    if (heldKeys.size === 0) endKeyHold();
  };
  // Capture: a keyup always lands, whoever handles it.
  window.addEventListener("keyup", (e) => releaseKey(e.code || e.key), true);
  const dropKeys = (): void => {
    heldKeys.clear();
    moveWait.clear();
    endKeyHold();
  };
  window.addEventListener("blur", dropKeys);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) dropKeys();
  });
  // K120 Part B: the move pad (ui/move_pad.ts) - each finger on it is a
  // held key; fabricTick shows it while the keys are live.
  // K333: two fingers on arms beside each other within the window are a
  // chord, as two keys are.
  const movePad = new MovePad({
    press: (id, dir) => {
      const at = performance.now();
      if (!keysLive() || !heldKeys.press(id, dir, at)) return;
      keyPress(dir, at);
    },
    release: (id) => releaseKey(id),
    // K80 turns 3a: the center is the wait button while the turn minotaur
    // is on (fabricTick: setWait).
    wait: () => {
      if (keysLive()) inputWait();
    },
  });

  // K499: the gamepad (ui/gamepad.ts), polled once a frame by the frame
  // loop (fabricTick, beside keyStep). Its directions are held keys
  // ("game:<dir>", one per direction) through the same press path as the
  // keyboard and the pad, so the picker, chords, holds and the
  // held-at-arrival rule are the keys' own; a direction released drops
  // its key, as a keyup does. A/confirm is a tap-class step: at rest it
  // steps once along the held direction (pressMove, no hold of its own);
  // while the dot travels it is discarded, never queued (tapWhileMoving,
  // Levi's correction). The poll only reads the pad and fires on edges,
  // so an idle pad never wakes a sleeping scene; presses count only
  // while the keys are live (a modal or the panel owns the moment, as
  // keyBelongsElsewhere keeps the arrows), releases always land.
  const gamepad = new GamepadInput();
  const pollGamepad = (): void => {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    let snap: GamepadSnapshot | null = null;
    for (const gp of navigator.getGamepads()) {
      if (gp !== null && gp.connected) {
        snap = gp;
        break;
      }
    }
    const ev = gamepad.poll(snap);
    for (const dir of ev.released) releaseKey(`game:${dir}`);
    if (!keysLive()) return;
    const at = performance.now();
    for (const dir of ev.pressed) {
      if (heldKeys.press(`game:${dir}`, dir, at)) keyPress(dir, at);
    }
    if (ev.confirm && gamepad.dirs.length > 0 && tapWhileMoving(dotMoving()) === "move") {
      pressMove(gamepad.dirs, at);
    }
  };


  return {
    keyStep,
    keysLive,
    keyDepartures,
    keyVertex,
    heldKeys,
    moveWait,
    movePad,
    pollGamepad,
    inputWait,
    // K456: a lost WebGL context drops every held key, as blur does.
    dropKeys,
    get keyHold() {
      return keyHold;
    },
    get tapsWait() {
      return tapsWait;
    },
    set tapsWait(v: boolean) {
      tapsWait = v;
    },
  };
}
