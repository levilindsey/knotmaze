# K1468 s2: shared helpers. Dot-source: . .claude/probes/K1468/s2/common.ps1
$LinkA = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&prp=off&phw=0&fw=0&bg=none&snd=none&fl=0.14&tlk=fill"
$LinkB = "?3&xp=off&am=instant&rp=gf&prp=off&phw=0&fw=0&bg=none&snd=none&fl=0.14&tlk=fill"
function Wait-Mem {
  $t0 = Get-Date
  while ($true) {
    $os = Get-CimInstance Win32_OperatingSystem
    if ($os.FreeVirtualMemory -ge 3MB) { return }
    if (((Get-Date) - $t0).TotalMinutes -ge 10) { Write-Warning "FreeVirtualMemory still under 3 GB after 10 min"; return }
    Start-Sleep 15
  }
}
function Test-Disk { if ((Get-PSDrive C).Free -lt 5GB) { throw "C: under 5 GB free: stop and report" } }
