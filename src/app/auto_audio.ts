import type { KnotSynth } from "../audio/knot_synth";
import type { PitchAssignment } from "../audio/pitch_space";
import { noteToFreq, segmentsNear } from "../audio/pitch_space";
import type { SongScheduler } from "../audio/song_scheduler";
import { SCARBOROUGH_FAIR } from "../audio/songs";
import type { PhysicsHost } from "../physics/physics_host";
import type { PanelSettings } from "../ui/tweakpane_panel";
import type { UrlParams } from "../ui/url_state";
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
  readonly audioSegSite: Array<{ chain: number; ctrl: number }>;
  nextRandomPluck: number;
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
  // ---- Stage 20: auto plucks (random + music modes), RENDER-ONLY: the
  // sound plays and the segment's unit vibrates (render/pluck_overlay.ts) -
  // no grab, no pull, no wake, so they never disturb the knot and may play
  // during a user drag (only a unit holding the grabbed particle stays
  // sound-only). The visual waits out the audio output latency so sight
  // lands on the sound. `when` (audio clock) and `lead` (seconds from now)
  // place a note scheduled ahead (K101): its visual waits for it too.
  const triggerAutoPluck = (
    seg: number,
    freq: number,
    amp: number,
    when?: number,
    lead = 0
  ): void => {
    if (!scene.ps || !scene.renderer || !Number.isFinite(freq)) return;
    if (!settings.muted && params.soundMode !== "none") {
      // K279: on the synth's auto bus (autoPluckGain).
      synth.pluck(freq, amp, when, true);
    }
    const site = audioMap.audioSegSite[seg];
    if (!site) return;
    const chainArr = scene.ps.chains[site.chain];
    if (!chainArr || chainArr.length === 0) return;
    const len = chainArr.length;
    // Knot mode: the audio segment is the whole strand - excite a random
    // place along it (the fixed mid-strand site rang one spot forever).
    const ctrl = scene.walkGraph ? site.ctrl : Math.random() * len;
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
    const nowS = performance.now() / 1000;
    if (params.soundMode === "random") {
      if (audioMap.nextRandomPluck === 0) audioMap.nextRandomPluck = nowS + 0.8;
      if (nowS >= audioMap.nextRandomPluck) {
        audioMap.nextRandomPluck =
          nowS + (0.45 + Math.random() * 1.75) / Math.max(0.1, params.soundSpeed);
        const n = audioMap.audioSegSite.length;
        if (n > 0) {
          const seg = Math.floor(Math.random() * n);
          triggerAutoPluck(
            seg,
            audioMap.audioAssign.segFreq[seg] ?? 220,
            0.4 + Math.random() * 0.35
          );
        }
      }
    } else if (params.soundMode === "music") {
      // K101: notes start on the audio clock's grid, handed out
      // MUSIC_LOOKAHEAD ahead so a slow frame cannot delay or stretch them.
      // Before the autoplay gate (silent plucks, visuals only) the grid runs
      // on wall time with no lookahead.
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
        const segs = segmentsNear(audioMap.audioAssign, f);
        if (segs.length > 0 && Number.isFinite(f)) {
          // The song's true pitch plays; the matching segment moves.
          triggerAutoPluck(
            segs[Math.floor(Math.random() * segs.length)],
            f,
            0.62,
            audioNow === null ? undefined : at,
            at - now
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
