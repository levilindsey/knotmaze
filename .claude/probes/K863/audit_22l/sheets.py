# K863 audit 22L: run the kit's sheet tool (work34/dbg/sheet_k863k.py, unmodified)
# on v6.8 (work34/base, ports M from work28/ports_k990e.json) for the pairs the
# census word lists do not hold and for the solve reports (status, nfev, side,
# crossings) the census JSON does not carry. Outputs land beside this script.
# Run: venv python -I audit_22l/sheets.py   (from anywhere; cwd set to trace)
import os
import subprocess
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(T, "venv", "Scripts", "python.exe")
COL = "approved (v6.8)=work34\\base|ports|M|work28\\ports_k990e.json"

SHEETS = [
    # every join out of o, as two-letter words (K937/K938/K1035/K1090/K1014)
    ("sheets_o", "22L: joins out of o on v6.8 (font | approved v6.8)",
     ",".join("o" + c for c in "abcdefghijklmnopqrstuvwxyz")),
    # joins into o from the left (K937/K938: to io mo ng ao qo zo na nq ea ne)
    ("sheets_into_o", "22L: joins into o on v6.8 (font | approved v6.8)",
     "to,io,mo,ng,ao,qo,zo,na,nq,ea,ne,ho,no,do,ro,eo,co,po"),
    # cusp / corner entries (K991/K1014/K1036/K1194)
    ("sheets_cusp", "22L: cusp and corner entries on v6.8 (font | approved v6.8)",
     "hi,er,es,ow,ai,ar,as,nr,ns,di,dr,ii,ir,ip,up,mp,ot,et,at,it,nt,oi,oj,os,ou,oy,op"),
    # f joins (K990/K1116) and the K998/K1044 pairs
    ("sheets_f", "22L: joins out of f and covered pairs on v6.8 (font | approved v6.8)",
     "fa,fb,fc,fd,fe,ff,fg,fh,fi,fj,fk,fl,fm,fn,fo,fp,fq,fr,fs,ft,fu,fv,fw,fx,fy,fz,bk,ee,br"),
]

for name, title, cases in SHEETS:
    out_svg = os.path.join(HERE, name + ".svg")
    rep = os.path.join(HERE, name)
    cmd = [PY, "-I", os.path.join(T, "work34", "dbg", "sheet_k863k.py"),
           out_svg, title, cases, "--col", COL,
           "--report", rep + ".txt", "--sidecar", rep + "_sidecar.json"]
    print(" ".join(cmd), flush=True)
    r = subprocess.run(cmd, cwd=T, capture_output=True, text=True)
    print(r.stdout[-2000:])
    if r.returncode != 0:
        print(r.stderr[-3000:])
        sys.exit(r.returncode)
print("sheets done")
