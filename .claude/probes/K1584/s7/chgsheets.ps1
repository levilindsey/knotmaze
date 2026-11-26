# K1584 s7: one sheet per -Per changed places from chgplaces.py's out/chg_args_t<Thr>.txt: today | s6 | s7 | diff s6->s7,
# each place boxed.   pwsh chgsheets.ps1 [-Thr 1] [-Per 8] [-Scale 5] [-Half 24]   -> out/chg_<n>.png
param([string]$Thr = '1', [int]$Per = 8, [int]$Scale = 5, [int]$Half = 24)
$args_ = Get-Content (Join-Path $PSScriptRoot "out\chg_args_t$Thr.txt") | Where-Object { $_ }
for ($i = 0; $i -lt $args_.Count; $i += $Per) {
  $n = [int]($i / $Per) + 1; $chunk = $args_[$i..([Math]::Min($i + $Per, $args_.Count) - 1)]
  python (Join-Path $PSScriptRoot 'sheet7.py') (Join-Path $PSScriptRoot "out\chg_$n.png") $Scale $Half 'today,s6,s7' --diff 's6,s7' @chunk
}
