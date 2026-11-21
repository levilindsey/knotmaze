# K1375 (27Z): ordinary-load guards on the fix commit's build (:5492), one kept profile.
$ErrorActionPreference = "Continue"
$base = "http://localhost:5492"
$prof = ".claude/probes/K1375/profile_guards"
$out = ".claude/probes/K1375/out/27Z/guards"
New-Item -ItemType Directory -Force $out, "$out/drag_gf", "$out/drag_gfh" | Out-Null
Write-Host "HOLD plain"
node .claude/probes/K1450/hold.mjs "$base/?3&xp=off&am=instant&rp=gf" "$out/hold_plain" $prof 60 250 5000
Write-Host "hold plain exit $LASTEXITCODE"
Write-Host "HOLD linkA"
node .claude/probes/K1450/hold.mjs "$base/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1" "$out/hold_A" $prof 60 250 5000
Write-Host "hold A exit $LASTEXITCODE"
Write-Host "DRAG gf"
node .claude/probes/K1458/dragcheck.mjs $base "$out/drag_gf" $prof gf
Write-Host "drag gf exit $LASTEXITCODE"
Write-Host "DRAG gfh"
node .claude/probes/K1458/dragcheck.mjs $base "$out/drag_gfh" $prof gfh
Write-Host "drag gfh exit $LASTEXITCODE"
Write-Host "GUARDS27Z DONE"
