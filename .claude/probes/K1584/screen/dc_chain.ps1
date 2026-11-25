# One session's plan (2026-11-24): the drag checks alone on four builds, to tell which change, if any, makes the
# WebGL context drop at the fade 1.2 stop of the second drag check on a new Chrome profile.
$t = $PSScriptRoot
$comb = '6764cc1fa3fff187fea6205bb8e6c3fe1294d44a'
"#### dc_comb_warm (both changes, the guards' own warm profile, second check only) $(Get-Date -Format HH:mm:ss)"
pwsh -NoProfile -File "$t\dc_run.ps1" -Ref $comb -Port 5621 -Tag dc_comb_warm
"#### exit $LASTEXITCODE"
$runs = @(
  @{ Tag = 'dc_comb_fresh'; Ref = $comb;       Port = 5621; What = 'both changes' },
  @{ Tag = 'dc_s4_fresh';   Ref = 'e8aab8b50'; Port = 5624; What = 'last step (control)' },
  @{ Tag = 'dc_s5_fresh';   Ref = '9894c1091'; Port = 5622; What = 'gap step alone' },
  @{ Tag = 'dc_s4j_fresh';  Ref = '7f07c10f2'; Port = 5623; What = 'last step + junction change' }
)
foreach ($r in $runs) {
  "#### $($r.Tag) ($($r.What), new profile, both checks) $($r.Ref) $(Get-Date -Format HH:mm:ss)"
  pwsh -NoProfile -File "$t\dc_run.ps1" -Ref $r.Ref -Port $r.Port -Tag $r.Tag -B -Fresh
  "#### exit $LASTEXITCODE"
}
"CHAIN DONE $(Get-Date -Format HH:mm:ss)"
exit 0
