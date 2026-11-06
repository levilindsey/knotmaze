# K863 J3j: copy of work31\dbg\area_k1112c.ps1 (J3h's, untouched) writing work33\sheets\png. Its header:
# K1112 (J3h): copy of work30\dbg\area_k1119.ps1 (J3g's, untouched) writing work31\sheets\png. Its header:
# K1119 (J3g): copy of work29\dbg\area_k1113.ps1 (untouched) writing work30\sheets\png. Its header:
# K1113 (J3f): copy of work28\dbg\area_k990e.ps1 (untouched) writing work29\sheets\png. Its header:
# K990e (J3e): copy of work27\dbg\area_k1027.ps1 (untouched) writing work28\sheets\png.
# K1027 (J3d): copy of work26\dbg\area_k1009c.ps1 (untouched) writing work27\sheets\png. Its header: K1009c (J3c): copy of work25\dbg\area_k1029.ps1 (untouched) taking a sheet SVG path (relative to the trace folder). Original header: K1029 (B4, Order step 5): export a region of an out25 sheet at a high dpi (Inkscape command line), to look closer
# than the 96 dpi sheet PNG allows. A cell of a sheet_k1009b sheet: row r, column c (0 = font), offsets in sheet px
# from the cell's left edge and baseline (y down), as Crop-SheetB lays it out.
# Run: pwsh -NoProfile -File work25\dbg\area_k1009c.ps1 <sheet svg path> <out name> <row> <col> <dx0> <dx1> <dy0> <dy1> [dpi]
param([string]$Sheet, [string]$Name, [int]$Row, [int]$Col, [double]$Dx0, [double]$Dx1, [double]$Dy0, [double]$Dy1,
      [int]$Dpi = 960)
$T = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"; $ink = "C:\Program Files\Inkscape\bin\inkscape.com"
$svg = "$T\$Sheet"; $out = "$T\work33\sheets\png"; New-Item -ItemType Directory -Force $out | Out-Null
$head = Get-Content $svg -TotalCount 1
$W = [double]([regex]::Match($head, 'width="([0-9.]+)"').Groups[1].Value)
$ncol = ([regex]::Matches((Get-Content $svg -TotalCount 12) -join "`n", 'font-weight="bold">')).Count
$cw = ($W - 260 - ($ncol - 1) * 30) / $ncol
$x0 = 230 + $Col * ($cw + 30); $base = 110 + $Row * 398.4 + 240
$area = "{0:F2}:{1:F2}:{2:F2}:{3:F2}" -f ($x0 + $Dx0), ($base + $Dy0), ($x0 + $Dx1), ($base + $Dy1)
$png = "$out\zoom_$Name.png"
& $ink $svg --export-type=png --export-dpi=$Dpi --export-area=$area --export-background=white `
  --export-background-opacity=1 --export-filename="$png" 2> "$out\zoom_$Name.inkscape_stderr.txt"
"$((Get-Date).ToString('HH:mm:ss')) zoom_$Name area $area dpi $Dpi exit $LASTEXITCODE ($((Get-Item $png -ErrorAction SilentlyContinue).Length) bytes)"
