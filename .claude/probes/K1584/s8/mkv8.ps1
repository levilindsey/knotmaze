# K1584 s8: copies this worktree's src into out/v_s8<Var>/ (untracked) with a stage 8 flag-start rule patched into
# gf_look.ts's bake, for s7b/padall.ps1 (env GF_SRCP: its "s6" column = this build, "K" = s7). Every variant logs
# (globalThis.__s8Log) each pair-corner tangent point it sees and each flag it moves.
#   pwsh mkv8.ps1 -Var <name> [-Mode fillet|pad] [-Pad 0.3] [-Gate end|code|none] [-Reach 1.5]
# -Mode fillet: the flag start is the corner's fillet start on the under: the nearer to the crossing of the under's own
#   tangent point and the over's tangent point (same corner) projected onto the under (nearest sample within Reach).
# -Mode pad: s7b's variant i (flag start = stop - arcPer/2 - Pad).
# -Gate: the rule applies on a side only where a border's own gap end reaches the flag start (end: gw[14 + o]; code:
#   the end + GAP_END_PAD + arcPer, codeAt's reach; none: always), compared with the new flag start (-GateAt start)
#   or with s7's (stop - arcPer/2, -GateAt stop: s7b's variant i).
param([Parameter(Mandatory)][string]$Var, [ValidateSet('fillet', 'pad', 'border')][string]$Mode = 'fillet', [double]$Pad = 0.3,
  [ValidateSet('end', 'code', 'none')][string]$Gate = 'end', [ValidateSet('start', 'stop')][string]$GateAt = 'start', [double]$Reach = 1.5)
$ErrorActionPreference = 'Stop'
$wt = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$d = Join-Path $PSScriptRoot "out\v_s8$Var"
if (Test-Path $d) { Write-Output "$d exists (pick another -Var)"; return }
New-Item -ItemType Directory $d -Force | Out-Null
Copy-Item -Recurse (Join-Path $wt 'src') $d
$f = Join-Path $d 'src\render\gpu_field\gf_look.ts'
$t = [IO.File]::ReadAllText($f)
function Rep([string]$old, [string]$new) { if (([regex]::Matches($script:t, [regex]::Escape($old))).Count -ne 1) { throw "not found once: $old" }; $script:t = $script:t.Replace($old, $new) }
Rep '      const pairB = [1e6, 1e6, 1e6, 1e6];' @"
      const pairB = [1e6, 1e6, 1e6, 1e6];
      const pairF = [1e6, 1e6, 1e6, 1e6];
      const jo8 = ja?.get(x.overChain), jpo8 = r.jointPartners?.get(x.overChain);
      let rawO8: number[] | null = null;
"@.TrimEnd()
Rep '          if (lat <= 0) pairB[o + 1] = Math.min(pairB[o + 1], Math.abs(d));' @"
          if (lat <= 0) pairB[o + 1] = Math.min(pairB[o + 1], Math.abs(d));
          let fS = Math.abs(d), oD = NaN;
          if (jo8 && jpo8) {
            if (!rawO8) { const kmO = keptOf(x.overChain, so); rawO8 = []; for (let k = 0; k < so.count; k++) if (rawO8[kmO[k]] === undefined) rawO8[kmO[k]] = k; }
            const pU = { x: 0, y: 0 }, pO = { x: 0, y: 0 }, pt8 = { x: 0, y: 0 };
            gapPointAt(su, arc, pU);
            let best = Infinity, bx = 0, by = 0;
            for (let q2 = 0; q2 < jo8.length; q2++) {
              if (jpo8[q2] !== x.underChain) continue;
              const f2 = jo8[q2], i2 = Math.max(0, Math.min(rawO8.length - 1, Math.floor(f2))), j2 = Math.min(rawO8.length - 1, i2 + 1);
              gapPointAt(so, (rawO8[i2] + Math.max(0, Math.min(1, f2 - i2)) * (rawO8[j2] - rawO8[i2])) * so.arcPer, pO);
              const dd = (pO.x - pU.x) ** 2 + (pO.y - pU.y) ** 2;
              if (dd < best) { best = dd; bx = pO.x; by = pO.y; }
            }
            if (best < $Reach * $Reach) {
              let bd = Infinity, ba = arc;
              const n8 = Math.ceil($Reach / su.arcPer);
              for (let i = -n8; i <= n8; i++) {
                const a2 = arc + i * su.arcPer;
                if (!su.closed && (a2 < 0 || a2 > su.total)) continue;
                gapPointAt(su, a2, pt8);
                const dd = (pt8.x - bx) ** 2 + (pt8.y - by) ** 2;
                if (dd < bd) { bd = dd; ba = a2; }
              }
              let d2 = ba - uC;
              if (su.closed) { d2 = ((d2 % su.total) + su.total) % su.total; if (d2 > su.total / 2) d2 -= su.total; }
              oD = d2;
              if ((d2 >= 0) === (d >= 0)) fS = Math.min(fS, Math.abs(d2));
            }
          }
          if ((globalThis as any).__s8Log) (globalThis as any).__s8Log.push(["tp", x.underChain, x.overChain, +uC.toFixed(3), +d.toFixed(3), lat, +oD.toFixed(3), +fS.toFixed(3)]);
          if (lat >= 0) pairF[o] = Math.min(pairF[o], fS);
          if (lat <= 0) pairF[o + 1] = Math.min(pairF[o + 1], fS);
"@.TrimEnd()
$gateCmp = if ($GateAt -eq 'start') { 'st' } else { 'stop - su.arcPer / 2' }
$gateExpr = switch ($Gate) { 'end' { 'Math.max(gw[14 + oo], gw[15 + oo])' } 'code' { 'Math.max(gw[14 + oo], gw[15 + oo]) + GAP_END_PAD + su.arcPer' } 'none' { '1e9' } }
$start = if ($Mode -eq 'fillet') { 'Math.min(Math.min(pairF[oo], pairF[oo + 1]), stop - su.arcPer / 2)' } else { "stop - su.arcPer / 2 - $Pad" }
# -Mode border: per border b of the side, a border whose own gap end reaches its corner's fillet start (pairF) needs the
#   far term up to that start; any other border needs it up to its code's reach (gap end + GAP_END_PAD + arcPer). The
#   side's flag starts at the largest need, never past s7's; a side with no border reaching its corner keeps s7's.
$flagFn = if ($Mode -eq 'border') { @"
      const flagOf = (oo: number, stop: number): number => {
        const f7 = stop - su.arcPer / 2;
        if (!(stop < 1e5)) return f7;
        let into = false, need = 0;
        for (let b = 0; b < 2; b++) {
          const f = pairF[oo + b], e = gw[14 + oo + b];
          if (f < 1e5 && e >= f) { into = true; need = Math.max(need, f); } else need = Math.max(need, e + GAP_END_PAD + su.arcPer);
        }
        return into ? Math.min(f7, need) : f7;
      };
"@.TrimEnd() } else { "      const flagOf = (oo: number, stop: number): number => { const st = $start; return stop < 1e5 && $gateExpr >= $gateCmp ? st : stop - su.arcPer / 2; };" }
Rep '      const stopN = Math.min(pairB[0], pairB[1]), stopP = Math.min(pairB[2], pairB[3]);' @"
      const stopN = Math.min(pairB[0], pairB[1]), stopP = Math.min(pairB[2], pairB[3]);
$flagFn
      const flagN = flagOf(0, stopN), flagP = flagOf(2, stopP);
      if ((globalThis as any).__s8Log) (globalThis as any).__s8Log.push(["flag", x.underChain, x.overChain, +uC.toFixed(3), +su.arcPer.toFixed(4), +stopN.toFixed(3), +flagN.toFixed(3), +stopP.toFixed(3), +flagP.toFixed(3), gw.slice(14).map((v: number) => +v.toFixed(3))]);
"@.TrimEnd()
Rep '          const stop = off >= 0 ? stopP : stopN;' '          const stop = off >= 0 ? stopP : stopN, flag = off >= 0 ? flagP : flagN;'
Rep 'Math.abs(off) >= stop - su.arcPer / 2 ? GAP_FAR_OFF' 'Math.abs(off) >= flag ? GAP_FAR_OFF'
[IO.File]::WriteAllText($f, $t)
Write-Output "v_s8$Var -> $d"
