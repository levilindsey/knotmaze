import { soundIsOn, type KnotSynth } from "../audio/knot_synth";
import type { PitchAssignment } from "../audio/pitch_space";
import { noteToFreq } from "../audio/pitch_space";
import type { SongScheduler } from "../audio/song_scheduler";
import { SCARBOROUGH_FAIR } from "../audio/songs";
import type { PhysicsHost } from "../physics/physics_host";
import type { PanelSettings } from "../ui/tweakpane_panel";
import { clockOf, type UrlParams } from "../ui/url_state";
import {
  findValidCtrl,
  nearestValidCtrl,
  pickMusicSegment,
  pickRandomSegment,
} from "./auto_pick";
import type { SceneRef } from "./scene_ref";

// K5 M6 (docs/design/K5_K6_split.md, 2.2): the auto audio, moved out of
// main() as it was: Stage 20's auto plucks (triggerAutoPluck) and the
// per-frame scheduler (autoAudioTick: random plucks on a wall-clock
// timer, music mode's notes handed out on the audio clock). main.ts
// calls createAutoAudio once, where autoAudioTick was, and destructures
// autoAudioTick for the frame loop under its old name. The audio map's
// `let`s stay behind its getters (audioMap, never destructured); the
// ripple and tug helpers are the pointer input's, passed in.

// K101: how far ahead (seconds of audio clock) music mode schedules its
// notes. A frame longer than this makes a note start late, never early.
const MUSIC_LOOKAHEAD = 0.3;

// The audio map as createAutoAudio reads it (src/app/audio_map.ts).
export interface AutoAudioMap {
  readonly audioAssign: PitchAssignment | null;
  readonly audioSegSite: Array<{
    chain: number;
    ctrl: number;
    c0?: number;
    c1?: number;
  }>;
  nextRandomPluck: number;
}

// Where an auto pluck lands: a chain and a ctrl on it (K244: one that would
// draw, so the note and the vibration go together).
interface AutoSite {
  chain: number;
  ctrl: number;
}

// What the auto audio reads from main(): values and functions, each
// assigned once (the pointer input's helpers among them).
export interface AutoAudioDeps {
  params: UrlParams;
  settings: PanelSettings;
  synth: KnotSynth;
  songSched: SongScheduler;
  audioMap: AutoAudioMap;
  host: PhysicsHost;
  pluckUnit: (
    chain: number,
    ctrl: number
  ) => { spanCtrl: [number, number] | null; reach: number };
  startRipple: (
    chain: number,
    at: { ctrl?: number; arc?: number },
    strength: number,
    delay?: number
  ) => void;
  tugAt: (
    chain: number,
    at: { ctrl?: number; arc?: number },
    side: number,
    amount: number
  ) => void;
}

export function createAutoAudio(deps: AutoAudioDeps, scene: SceneRef) {
  const {
    params,
    settings,
    synth,
    songSched,
    audioMap,
    host,
    pluckUnit,
    startRipple,
    tugAt,
  } = deps;
  // K720: the synth reads the sound setting itself, so with sound off
  // (muted, or sound mode none) its gate creates no AudioContext and nothing
  // plays; the first play with sound on creates it. Installed here, the
  // audio module's one hook in main(), which builds this before any input
  // can arrive (main() runs on synchronously from the synth's construction).
  synth.setSoundOn(() => soundIsOn(settings.muted, params.soundMode));
  // ---- Stage 20: auto plucks (random + music modes), RENDER-ONLY: the
  // sound plays and the segment's unit vibrates (render/pluck_overlay.ts) -
  // no grab, no pull, no wake, so they never disturb the knot and may play
  // during a user drag (only a unit holding the grabbed particle stays
  // sound-only). The visual waits out the audio output latency so sight
  // lands on the sound. `when` (audio clock) and `lead` (seconds from now)
  // place a note scheduled ahead (K101): its visual waits for it too.
  // K244: where a segment's auto pluck lands, as a finder for ONE decision
  // (one random tick, one music note): its answers are memoized, so the pick
  // and the pluck that follows share one site, and the overlay's tester keeps
  // the chains' samples for the decision. A site is a place whose pluck would
  // draw (not a junction core: render/pluck_model.ts wouldPluck), else the
  // segment has none (null) and plays nothing. A fabric segment tries its
  // run's midpoint, where its auto plucks have always landed, then outward
  // along the run; a knot strand tries random ctrls (the old random place
  // along it: the fixed mid-strand site rang one spot forever), then sweeps.
  const siteResolver = (): ((seg: number) => AutoSite | null) | null => {
    const ps = scene.ps;
    const renderer = scene.renderer;
    if (!ps || !renderer) return null;
    const test = renderer.plucks.siteTester();
    const memo = new Map<number, AutoSite | null>();
    return (seg: number): AutoSite | null => {
      const known = memo.get(seg);
      if (known !== undefined) return known;
      let out: AutoSite | null = null;
      const site = audioMap.audioSegSite[seg];
      const chainArr = site ? ps.chains[site.chain] : undefined;
      if (site && chainArr && chainArr.length > 0) {
        const ok = (ctrl: number): boolean => test(site.chain, ctrl);
        const ctrl = scene.walkGraph
          ? nearestValidCtrl(site.c0 ?? site.ctrl, site.c1 ?? site.ctrl, site.ctrl, ok)
          : findValidCtrl(chainArr.length, ok, Math.random);
        if (ctrl !== null && ctrl >= 0) out = { chain: site.chain, ctrl };
      }
      memo.set(seg, out);
      return out;
    };
  };

  // `at`: the site the caller's pick already resolved (the tick), or
  // undefined to resolve it here; null plays nothing.
  const triggerAutoPluck = (
    seg: number,
    freq: number,
    amp: number,
    when?: number,
    lead = 0,
    at?: AutoSite | null
  ): void => {
    if (!scene.ps || !scene.renderer || !Number.isFinite(freq)) return;
    // K244: the site comes BEFORE the note. A segment with no place that
    // would draw plays nothing, so a note never sounds with nothing on screen
    // (it did in a junction core, K235's "OTHER SOUND PATHS").
    const site = at === undefined ? siteResolver()?.(seg) ?? null : at;
    if (!site) return;
    const chainArr = scene.ps.chains[site.chain];
    if (!chainArr || chainArr.length === 0) return;
    if (!settings.muted && params.soundMode !== "none") {
      // K279: on the synth's auto bus (autoPluckGain).
      synth.pluck(freq, amp, when, true);
    }
    const ctrl = site.ctrl;
    const unit = pluckUnit(site.chain, ctrl);
    // A unit the user is holding stays sound-only.
    const g = scene.ps.grabbedParticle;
    const avoidCtrl =
      g >= 0 && scene.ps.chainOfParticle(g) === site.chain
        ? chainArr.indexOf(g)
        : undefined;
    const side = Math.random() < 0.5 ? -1 : 1;
    const drawn = scene.renderer.pluck({
      avoidCtrl,
      chain: site.chain,
      ctrl,
      side,
      // Auto strengths 0.4-0.75 -> amplitude gains 0.75-1.25.
      gain: Math.max(0.75, Math.min(1.25, 0.75 + ((amp - 0.4) / 0.35) * 0.5)),
      freq,
      reach: unit.reach,
      spanCtrl: unit.spanCtrl,
      beta: 0.3 + Math.random() * 0.2,
      delay: lead + synth.outputLatency(),
    });
    // K279: an auto pluck ripples at rippleAuto (subtler than a tap's), on
    // the vibration's delay, and tugs only with tugAuto.
    if (drawn) {
      const delay = lead + synth.outputLatency();
      startRipple(site.chain, { ctrl }, params.rippleAuto, delay);
      if (params.tugAuto && params.pluckTug > 0) {
        const gen = host.gen;
        window.setTimeout(() => {
          if (host.gen === gen) tugAt(site.chain, { ctrl }, side, params.pluckTug);
        }, delay * 1000);
      }
    }
  };

  // K101: the last music notes handed out, for probes (__knotSong).
  const songLog: Array<{
    at: number;
    lead: number;
    note: string | null;
    clock: string;
  }> = [];
  const autoAudioTick = (): void => {
    if (!scene.ps) return;
    if (!audioMap.audioAssign || settings.muted) {
      synth.cancelScheduled();
      return;
    }
    // K114: under the beat rider the player's moves are the music: each
    // departure plucks its run's note on the beat's audio time
    // (app/beat_frame.ts). No song or random plucks play underneath, and
    // nothing here may cancel those notes (cancelScheduled drops every
    // voice not yet sounding).
    if (clockOf(params) === "beat" && scene.fabricController !== null) {
      audioMap.nextRandomPluck = 0;
      songSched.reset();
      return;
    }
    const nowS = performance.now() / 1000;
    if (params.soundMode === "random") {
      if (audioMap.nextRandomPluck === 0) audioMap.nextRandomPluck = nowS + 0.8;
      if (nowS >= audioMap.nextRandomPluck) {
        audioMap.nextRandomPluck =
          nowS + (0.45 + Math.random() * 1.75) / Math.max(0.1, params.soundSpeed);
        const n = audioMap.audioSegSite.length;
        const resolve = n > 0 ? siteResolver() : null;
        if (resolve) {
          // K244: a random segment among those whose pluck would draw; with
          // none, this tick plays nothing.
          const seg = pickRandomSegment(n, (s) => resolve(s) !== null, Math.random);
          if (seg >= 0) {
            triggerAutoPluck(
              seg,
              audioMap.audioAssign.segFreq[seg] ?? 220,
              0.4 + Math.random() * 0.35,
              undefined,
              0,
              resolve(seg)
            );
          }
        }
      }
    } else if (params.soundMode === "music") {
      // K101: notes start on the audio clock's grid, handed out
      // MUSIC_LOOKAHEAD ahead so a slow frame cannot delay or stretch them.
      // While no context runs (before the autoplay gate: silent plucks,
      // visuals only) the grid runs on wall time with no lookahead. K720: the
      // song is a play, so it makes the context (the gate open, sound on);
      // with sound off since the page loaded, the gate made none.
      synth.open();
      const audioNow = synth.audioTime();
      const clock = audioNow === null ? "wall" : "audio";
      const now = audioNow ?? nowS;
      const notes = songSched.due(
        SCARBOROUGH_FAIR,
        now,
        clock,
        audioNow === null ? 0 : MUSIC_LOOKAHEAD,
        params.soundSpeed
      );
      for (const { row, at } of notes) {
        songLog.push({ at, lead: at - now, note: row.note, clock });
        if (songLog.length > 64) songLog.shift();
        if (!row.note) continue;
        const f = noteToFreq(row.note);
        if (!Number.isFinite(f)) continue;
        const resolve = siteResolver();
        if (!resolve) continue;
        // K244: a random one of the segments nearest the note's pitch whose
        // pluck would draw (a note whose own pitch has none falls back to the
        // nearest pitch that does); with none anywhere the note is skipped.
        const seg = pickMusicSegment(
          audioMap.audioAssign,
          f,
          (s) => resolve(s) !== null,
          Math.random
        );
        if (seg >= 0) {
          // The song's true pitch plays; the matching segment moves.
          triggerAutoPluck(
            seg,
            f,
            0.62,
            audioNow === null ? undefined : at,
            at - now,
            resolve(seg)
          );
        }
      }
    } else {
      audioMap.nextRandomPluck = 0;
      songSched.reset();
      synth.cancelScheduled();
    }
  };


  return { autoAudioTick, triggerAutoPluck, songLog };
}
