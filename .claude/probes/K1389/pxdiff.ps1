# K1389: pixel diff of two same-size PNGs. Prints the count of differing pixels, the max channel delta, the bounding
# box of the differences and a coarse 8x8 grid of where they are; with -Out, writes a diff image (white = differs,
# brightness = delta x Gain).
# usage: pwsh pxdiff.ps1 -A a.png -B b.png [-Out diff.png] [-Gain 8] [-Thresh 0]
param([Parameter(Mandatory)] [string]$A, [Parameter(Mandatory)] [string]$B, [string]$Out = "", [int]$Gain = 8,
  [int]$Thresh = 0)
Add-Type -AssemblyName System.Drawing
$null = [System.Drawing.Bitmap]::new(1, 1)  # loads GdiPlus's private assemblies, which the compile must reference
$refs = @(@([System.Drawing.Bitmap].Assembly.Location) + ([AppDomain]::CurrentDomain.GetAssemblies() |
  Where-Object { $_.GetName().Name -match '^(System\.(Drawing|Private\.Windows|Runtime|Collections|Memory|Primitives)|netstandard)' -and $_.Location } |
  ForEach-Object Location) | Sort-Object -Unique)
if (-not ("K1389Diff" -as [type])) {
  Add-Type -ReferencedAssemblies $refs -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class K1389Diff {
  static byte[] Px(Bitmap b, out int stride) {
    var d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    stride = d.Stride; var a = new byte[stride * b.Height]; Marshal.Copy(d.Scan0, a, 0, a.Length); b.UnlockBits(d);
    return a;
  }
  public static string Run(string pa, string pb, string outp, int gain, int thresh) {
    using (var ba = new Bitmap(pa)) using (var bb = new Bitmap(pb)) {
      if (ba.Width != bb.Width || ba.Height != bb.Height) return "size differs";
      int w = ba.Width, h = ba.Height, s1, s2; var x = Px(ba, out s1); var y = Px(bb, out s2);
      long n = 0; int mx = 0, x0 = w, y0 = h, x1 = -1, y1 = -1; var grid = new int[64];
      Bitmap o = outp.Length > 0 ? new Bitmap(w, h, PixelFormat.Format32bppArgb) : null;
      byte[] ob = o != null ? new byte[s1 * h] : null;
      for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) {
        int k = j * s1 + i * 4, m = 0;
        for (int c = 0; c < 3; c++) m = Math.Max(m, Math.Abs(x[k + c] - y[k + c]));
        if (ob != null) { byte v = (byte)Math.Min(255, m * gain); ob[k] = v; ob[k + 1] = v; ob[k + 2] = v; ob[k + 3] = 255; }
        if (m > thresh) { n++; mx = Math.Max(mx, m); x0 = Math.Min(x0, i); y0 = Math.Min(y0, j); x1 = Math.Max(x1, i);
          y1 = Math.Max(y1, j); grid[(j * 8 / h) * 8 + (i * 8 / w)]++; }
      }
      if (o != null) { var d = o.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        Marshal.Copy(ob, 0, d.Scan0, ob.Length); o.UnlockBits(d); o.Save(outp, ImageFormat.Png); o.Dispose(); }
      var sb = new System.Text.StringBuilder();
      sb.AppendFormat("{0}x{1} differing {2} ({3:F3}%) max {4} bbox [{5},{6}]-[{7},{8}]\n", w, h, n, 100.0 * n / (w * h), mx,
        x0, y0, x1, y1);
      for (int r = 0; r < 8; r++) { for (int c = 0; c < 8; c++) sb.AppendFormat("{0,7}", grid[r * 8 + c]); sb.Append('\n'); }
      return sb.ToString();
    }
  }
}
"@
}
[K1389Diff]::Run((Resolve-Path $A).Path, (Resolve-Path $B).Path,
  ($(if ($Out) { [IO.Path]::GetFullPath($Out) } else { "" })), $Gain, $Thresh)
