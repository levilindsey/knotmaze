param([string]$CapDir, [string]$OutDir, [string]$Pattern = "*_h?")
New-Item -ItemType Directory $OutDir -Force | Out-Null
$sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes"
$todo = Get-ChildItem $CapDir -Directory -Filter $Pattern | Where-Object { (Test-Path (Join-Path $_.FullName "meta.json")) -and -not (Test-Path (Join-Path $OutDir "$($_.Name).screen.json")) }
$q = [System.Collections.Queue]::new(@($todo)); $run = @()
while ($q.Count -or $run.Count) {
  while ($q.Count -and $run.Count -lt 2) { $d = $q.Dequeue(); $s = $d.Name -replace '_h[01]$', ''
    $run += Start-Process node -ArgumentList "scripts/run_node.mjs", ".claude/probes/K1436/k1436_screen_scan.ts", $d.FullName, (Join-Path $OutDir "$($d.Name).screen.json"), "$sceneDir/$s.json" -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $OutDir "$($d.Name).screen.log") }
  Start-Sleep 2; $run = @($run | Where-Object { -not $_.HasExited })
}
