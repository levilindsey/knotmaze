import type { KnotSynth } from "../audio/knot_synth";
import { assignPitches, assignPitchesFromList, noteToFreq } from "../audio/pitch_space";
import type { PitchAssignment } from "../audio/pitch_space";
import type { SongScheduler } from "../audio/song_scheduler";
import { SCARBOROUGH_FAIR } from "../audio/songs";
import { ROOT_NOTES } from "../ui/url_state";
import type { UrlParams } from "../ui/url_state";
import type { SceneRef } from "./scene_ref";

// K5 M4 (docs/design/K5_K6_split.md, 2.2): the audio map, moved out of
// main() as it was: Stage 20's per-segment pitch assignment
// (rebuildAudioMap, which rebuild() and the panel call), the walk run under
// a chain ctrl (runForCtrl), and what a pluck there sounds and sets ringing
// (freqForCtrl, pluckUnit). main.ts calls createAudioMap once, where the
// `let`s were. autoAudioTick (main.ts) reads audioAssign and audioSegSite
// and writes nextRandomPluck through the returned object's getters and
// setter: never destructure those, or the copy goes stale. songSched stays
// main's (autoAudioTick runs it); rebuildAudioMap resets it.

// Lobes kept each side of the plucked one: the fabric walk run (capped)
// and the local window used in knot mode / off the walk graph.
const RUN_REACH = 6;
const LOBE_REACH = 2;

// What the audio map reads from main(): values, each assigned once.
export interface AudioMapDeps {
  params: UrlParams;
  synth: KnotSynth;
  songSched: SongScheduler;
}

export function createAudioMap(deps: AudioMapDeps, scene: SceneRef) {
  const { params, synth, songSched } = deps;

  // Stage 20 audio: every segment (walk-graph run in fabric mode, whole
  // strand otherwise) owns one pitch from the chosen space, assigned by
  // length bucket. audioRuns maps a chain ctrl to its run for manual
  // plucks; audioSegSite is where auto plucks physically tug.
  let audioAssign: PitchAssignment | null = null;
  let audioRuns: Map<
    number,
    Array<{ c0: number; c1: number; seg: number }>
  > | null = null;
  let audioSegSite: Array<{ chain: number; ctrl: number }> = [];
  let nextRandomPluck = 0;

  // Re-derive the per-segment pitch assignment (cheap; no scene rebuild).
  function rebuildAudioMap(): void {
    if (!scene.ps) return;
    let assignFor: (lengths: number[]) => PitchAssignment;
    if (params.soundMode === "music") {
      // Music mode: the buckets are EXACTLY the song's distinct pitches,
      // so every thread belongs to some note the piece actually plays
      // and every note has segments to animate. pitchSpace/octaves do
      // not apply here (the panel hides them).
      const set = new Set<number>();
      for (const r of SCARBOROUGH_FAIR.notes) {
        if (!r.note) continue;
        const f = noteToFreq(r.note);
        if (Number.isFinite(f)) set.add(Math.round(f * 1000) / 1000);
      }
      const pitches = [...set].sort((a, b) => a - b);
      assignFor = (lengths) => assignPitchesFromList(pitches, lengths);
    } else {
      // Root: seed-derived unless the rootNote param picks a fixed class.
      const rootIdx = ROOT_NOTES.indexOf(params.rootNote) - 1;
      const root = rootIdx >= 0 ? rootIdx : params.seed % 12;
      assignFor = (lengths) =>
        assignPitches(
          params.pitchSpace,
          params.octaves,
          root,
          lengths,
          params.tonicEmphasis
        );
    }
    if (scene.walkGraph) {
      audioAssign = assignFor(scene.walkGraph.edges.map((e) => e.length));
      audioRuns = new Map();
      audioSegSite = scene.walkGraph.edges.map((e) => ({
        chain: e.chain,
        ctrl: (e.ctrlA + e.ctrlB) / 2,
      }));
      for (const e of scene.walkGraph.edges) {
        let list = audioRuns.get(e.chain);
        if (!list) {
          list = [];
          audioRuns.set(e.chain, list);
        }
        list.push({ c0: e.ctrlA, c1: e.ctrlB, seg: e.id });
      }
    } else {
      audioAssign = assignFor(scene.ps.chains.map((c) => c.length));
      audioRuns = null;
      audioSegSite = scene.ps.chains.map((c, i) => ({
        chain: i,
        ctrl: Math.floor(c.length / 2),
      }));
    }
    nextRandomPluck = 0;
    songSched.reset();
    synth.cancelScheduled();
  }

  // The walk run (fabric) holding a chain ctrl, or null (knot mode, or a
  // decorative chain outside the walk graph).
  function runForCtrl(
    chain: number,
    ctrl: number
  ): { c0: number; c1: number; seg: number } | null {
    if (!audioRuns || !scene.ps) return null;
    const list = audioRuns.get(chain);
    if (!list) return null;
    const len = scene.ps.chains[chain].length;
    for (const r of list) {
      if (
        (ctrl >= r.c0 && ctrl <= r.c1) ||
        (ctrl + len >= r.c0 && ctrl + len <= r.c1)
      ) {
        return r;
      }
    }
    return null;
  }

  // Pitch of the segment at a chain ctrl. Chains outside the walk graph
  // (decorative culled loops) hash onto the assignment.
  function freqForCtrl(chain: number, ctrl: number): number {
    if (!audioAssign || !scene.ps) return 220;
    const n = audioAssign.segFreq.length;
    if (n === 0) return 220;
    if (!audioRuns) return audioAssign.segFreq[chain % n];
    const list = audioRuns.get(chain);
    if (!list || list.length === 0) return audioAssign.segFreq[chain % n];
    const r = runForCtrl(chain, ctrl);
    return audioAssign.segFreq[(r ?? list[0]).seg];
  }

  // What a pluck at a chain ctrl sets ringing (the pluckReach param):
  // the whole walk run (capped at RUN_REACH lobes each side) - exactly the
  // segment the audio sounds - or, in knot mode and off the walk graph,
  // the plucked lobe +-LOBE_REACH; "lobe" = only the plucked lobe.
  function pluckUnit(
    chain: number,
    ctrl: number
  ): { spanCtrl: [number, number] | null; reach: number } {
    if (params.pluckReach === "lobe") return { spanCtrl: null, reach: 0 };
    const r = runForCtrl(chain, ctrl);
    if (r) return { spanCtrl: [r.c0, r.c1], reach: RUN_REACH };
    return { spanCtrl: null, reach: LOBE_REACH };
  }

  return {
    rebuildAudioMap,
    freqForCtrl,
    pluckUnit,
    get audioAssign() {
      return audioAssign;
    },
    get audioSegSite() {
      return audioSegSite;
    },
    get nextRandomPluck() {
      return nextRandomPluck;
    },
    set nextRandomPluck(v: number) {
      nextRandomPluck = v;
    },
  };
}
