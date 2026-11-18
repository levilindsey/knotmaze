# K1468 s2: shared helpers. Dot-source: . .claude/probes/K1468/s2/common.ps1
$LinkA = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&prp=off&phw=0&fw=0&bg=none&snd=none&fl=0.14&tlk=fill"
$LinkB = "?3&xp=off&am=instant&rp=gf&prp=off&phw=0&fw=0&bg=none&snd=none&fl=0.14&tlk=fill"
# Second run's rule: C: free swings with the pagefile. Wait (15 min at most) while FreeVirtualMemory < 3 GB or
# C: free < 8 GB; throw (stop and report) only if C: is still under 5 GB after the wait.
function Wait-Mem {
  $t0 = Get-Date
  while ($true) {
    $os = Get-CimInstance Win32_OperatingSystem
    $c = (Get-PSDrive C).Free
    if ($os.FreeVirtualMemory -ge 3MB -and $c -ge 8GB) { return }
    if (((Get-Date) - $t0).TotalMinutes -ge 15) {
      Write-Warning ("after 15 min: FreeVirtualMemory {0:N1} GB, C: {1:N1} GB" -f ($os.FreeVirtualMemory / 1MB), ($c / 1GB))
      if ($c -lt 5GB) { throw "C: under 5 GB free after the wait: stop and report" }
      return
    }
    Start-Sleep 15
  }
}
function Test-Disk { }
