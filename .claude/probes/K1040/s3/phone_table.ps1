# K1040 S3b step 4: a markdown table of phone_time.mjs's runs (out/
# phone_time_<label>_<scene>.json; the label 'final' is the unlabelled run), sync
# p50/p95 ms per scene and label. With -Floor <label>, a last column is the
# first label's p50 minus that floor run's p50 (K923's label cost).
# K1040 S3f: -Upload adds each run's upload p50 (the pass's main-thread time in
# its upload calls, outside the sync) to its cell, and to the last column: the
# gate's cost, sync p50 - floor p50 + upload p50.
# Usage: & .claude\probes\K1040\s3\phone_table.ps1 fit pre3fit fitnoscan nofd nofdnd floorall -Floor floorall [-Upload]
[CmdletBinding(PositionalBinding = $false)]
param([Parameter(ValueFromRemainingArguments)][string[]]$Labels, [string]$Floor = '', [switch]$Upload)
function Up($r) { if ($r -and $r.upload -and $null -ne $r.upload.p50) { [double]$r.upload.p50 } else { 0.0 } }
$out = Join-Path $PSScriptRoot 'out'
$scenes = 'muse_hash', 'muse_default_tw', 'def', 'fat', 'ring', 'user_tw42.lightpaper', 'g41_def_tw42', 'g41_def_tw64', 'g41_ring_tw42', 'g41_ring_tw64', 'g41_user_tw42', 'g41_user_tw64'
function Load([string]$label, [string]$scene) {
  $name = if ($label -eq 'final') { "phone_time_$scene.json" } else { "phone_time_${label}_$scene.json" }
  $p = Join-Path $out $name
  if (Test-Path $p) { Get-Content $p -Raw | ConvertFrom-Json } else { $null }
}
$head = '| scene | ' + (($Labels | ForEach-Object { if ($_ -eq 'final') { 'final 2480x1800' } else { $_ } }) -join ' | ')
if ($Floor) { $head += " | $($Labels[0]) - $Floor$(if ($Upload) { ' + upload' })" }
$head + ' |'
'|' + ('---|' * (1 + $Labels.Count + [int][bool]$Floor))
foreach ($s in $scenes) {
  $cells = foreach ($l in $Labels) {
    $r = Load $l $s
    if ($r) { ('{0:N1}/{1:N1}' -f $r.sync.p50, $r.sync.p95) + $(if ($Upload) { ' +{0:N1}' -f (Up $r) }) } else { '-' }
  }
  $row = "| $s | " + ($cells -join ' | ')
  if ($Floor) {
    $a = Load $Labels[0] $s; $f = Load $Floor $s
    $row += if ($a -and $f) { ' | {0:N1}' -f ($a.sync.p50 - $f.sync.p50 + $(if ($Upload) { Up $a } else { 0 })) } else { ' | -' }
  }
  $row + ' |'
}
