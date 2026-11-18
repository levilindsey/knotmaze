// K1468: is packUnorm4x8 into RGBA32UI bit-exact with the hardware's float -> RGBA8 write, and unpackUnorm4x8 with
// its RGBA8 -> float fetch? node exact.mjs   (headed Chrome, ANGLE D3D11, like the app)
// Write side: N floats (every k/255 +- 64 ulps, every (k+.5)/255 +- 64 ulps, 0.5M random in [-0.1, 1.1], NaN, +-inf)
// drawn once as `out vec4` into RGBA8 and once per pack variant into RGBA32UI; counts the bytes that differ.
// Read side: every byte k fetched from an RGBA8 texel vs each unpack variant, as float bits.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, args: ["--use-angle=d3d11", "--window-position=2200,50"] });
const p = await b.newPage();
const r = await p.evaluate(() => {
  const c = document.createElement("canvas"); const gl = c.getContext("webgl2"); gl.getExtension("EXT_color_buffer_float");
  const f32 = new Float32Array(1); const u32 = new Uint32Array(f32.buffer);
  const vals = [];
  const near = (x) => { f32[0] = x; const base = u32[0]; for (let d = -64; d <= 64; d++) { u32[0] = base + d; vals.push(f32[0]); } };
  for (let k = 0; k <= 255; k++) { near(k / 255); near((k + 0.5) / 255); }
  let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < 500000; i++) vals.push(-0.1 + 1.2 * rnd());
  const FINE = vals.length; for (let k = 0; k < 255; k++) for (let j = 0; j < 512; j++) vals.push((k + 0.45 + 0.2 * j / 512) / 255);
  vals.push(NaN, Infinity, -Infinity, -0, 1e-30);
  const W = 1024; const H = Math.ceil(vals.length / 4 / W);
  const src = new Float32Array(W * H * 4); src.set(vals);
  const mkTex = (ifmt, fmt, type, data) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, W, H, 0, fmt, type, data); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); return t; };
  const inTex = mkTex(gl.RGBA32F, gl.RGBA, gl.FLOAT, src);
  const VS = "#version 300 es\nvoid main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); gl_Position = vec4(p*2.0-1.0,0,1); }";
  const prog = (fs) => { const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }; const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr)); return pr; };
  const run = (fs, ifmt, fmt, type, Arr, inT) => {
    const t = mkTex(ifmt, fmt, type, null); const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, W, H); const pr = prog(fs); gl.useProgram(pr); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, inT); gl.uniform1i(gl.getUniformLocation(pr, "uI"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3); const out = new Arr(W * H * 4); gl.readPixels(0, 0, W, H, fmt, type, out); return out;
  };
  const HEAD = "#version 300 es\nprecision highp float; precision highp int;\nuniform highp sampler2D uI;\n";
  const ref = run(HEAD + "out vec4 o; void main(){ o = texelFetch(uI, ivec2(gl_FragCoord.xy), 0); }", gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, Uint8Array, inTex);
  const variants = {
    roundHalfUp: "uvec4 b = uvec4(clamp(v, 0.0, 1.0) * 255.0 + 0.5); uint w = b.x | (b.y << 8) | (b.z << 16) | (b.w << 24);",
    rtz16: "vec4 c = clamp(v, 0.0, 1.0); c = uintBitsToFloat(floatBitsToUint(c) & 0xffffe000u); uvec4 b = uvec4(c * 255.0 + 0.5); uint w = b.x | (b.y << 8) | (b.z << 16) | (b.w << 24);",
    roundEven: "uvec4 b = uvec4(roundEven(clamp(v, 0.0, 1.0) * 255.0)); uint w = b.x | (b.y << 8) | (b.z << 16) | (b.w << 24);",
  };
  const res = {};
  for (const [name, body] of Object.entries(variants)) {
    const o = run(HEAD + `out highp uvec4 o; void main(){ vec4 v = texelFetch(uI, ivec2(gl_FragCoord.xy), 0); ${body} o = uvec4(w, 0u, 0u, 0u); }`, gl.RGBA32UI, gl.RGBA_INTEGER, gl.UNSIGNED_INT, Uint32Array, inTex);
    let bad = 0; const ex = [];
    for (let i = 0; i < vals.length; i++) { const px = i >> 2, ch = i & 3; const got = (o[px * 4] >>> (8 * ch)) & 255; if (got !== ref[i]) { bad++; if (ex.length < 8) ex.push([vals[i], ref[i], got]); } }
    let badR = 0; const exR = []; let fmin = 9, fmax = -9; for (let i = 256 * 2 * 129; i < vals.length; i++) { const px = i >> 2, ch = i & 3; const g = (o[px * 4] >>> (8 * ch)) & 255; if (g !== ref[i]) { badR++; const fr = vals[i] * 255 - Math.floor(vals[i] * 255); fmin = Math.min(fmin, fr); fmax = Math.max(fmax, fr); if (exR.length < 6) exR.push([vals[i], +(vals[i] * 255).toFixed(5), ref[i], g]); } }
    res[name] = { bad, badRandom: badR, of: vals.length, exR, fmin, fmax };
  }
  // read side: an RGBA8 texture whose texel i holds bytes (i, i, i, i) mod 256
  const bytes = new Uint8Array(W * H * 4); for (let i = 0; i < bytes.length; i++) bytes[i] = (i >> 2) & 255;
  const t8 = mkTex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
  const words = new Uint32Array(W * H * 4); for (let i = 0; i < W * H; i++) { const k = i & 255; words[i * 4] = k | (k << 8) | (k << 16) | (k << 24); }
  const tu = mkTex(gl.RGBA32UI, gl.RGBA_INTEGER, gl.UNSIGNED_INT, words);
  const fr = run(HEAD + "out vec4 o; void main(){ o = texelFetch(uI, ivec2(gl_FragCoord.xy), 0); }", gl.RGBA32F, gl.RGBA, gl.FLOAT, Float32Array, t8);
  const HU = "#version 300 es\nprecision highp float; precision highp int;\nuniform highp usampler2D uI;\n";
  const U8 = "const float GF_U8[256] = float[256](" + Array.from({ length: 256 }, (_, k) => { const s = Math.fround(k / 255).toPrecision(9); return s.includes(".") || s.includes("e") ? s : s + ".0"; }).join(", ") + ");\n";
  const rv = { constArr: U8.replace("const", "") + "x".slice(1) + "uint w = texelFetch(uI, ivec2(gl_FragCoord.xy), 0).x; o = vec4(GF_U8[w & 255u], GF_U8[(w >> 8) & 255u], GF_U8[(w >> 16) & 255u], GF_U8[w >> 24]);", mulInv: "uint w = texelFetch(uI, ivec2(gl_FragCoord.xy), 0).x; o = vec4(uvec4(w, w >> 8, w >> 16, w >> 24) & 255u) * (1.0 / 255.0);", divide: "uint w = texelFetch(uI, ivec2(gl_FragCoord.xy), 0).x; o = vec4(uvec4(w, w >> 8, w >> 16, w >> 24) & 255u) / 255.0;" };
  for (const [name, body] of Object.entries(rv)) {
    const o = run(HU + (name === "constArr" ? U8 + "out vec4 o; void main(){ uint w = texelFetch(uI, ivec2(gl_FragCoord.xy), 0).x; o = vec4(GF_U8[w & 255u], GF_U8[(w >> 8) & 255u], GF_U8[(w >> 16) & 255u], GF_U8[w >> 24]); }" : `out vec4 o; void main(){ ${body} }`), gl.RGBA32F, gl.RGBA, gl.FLOAT, Float32Array, tu);
    let bad = 0; const ex = [];
    for (let i = 0; i < 256 * 4; i++) if (Object.is(o[i], fr[i]) === false) { bad++; if (ex.length < 8) ex.push([i >> 2, fr[i], o[i]]); }
    let exactDiv = 0; for (let k = 0; k < 256; k++) if (Math.fround(k / 255) !== fr[k * 4]) exactDiv++;
    res["read_" + name] = { bad, of: 1024, ex, hwNotCorrectlyRounded: exactDiv };
  }
  // the HW threshold around each tie: the first offset d (ulps from fround((k+.5)/255)) whose byte is k+1, as x*255 - (k+.5)
  const thr = []; for (let k = 0; k < 255; k++) { const base = (2 * k + 1) * 129; let d0 = null; for (let d = 0; d < 129; d++) if (ref[base + d] === k + 1) { d0 = d; break; } thr.push(d0 === null ? null : +(vals[base + d0] * 255 - (k + 0.5)).toExponential(3)); }
  const ft = []; for (let k = 0; k < 255; k++) { let d0 = -1; for (let j = 0; j < 512; j++) if (ref[FINE + k * 512 + j] === k + 1) { d0 = j; break; } ft.push(d0 < 0 ? null : +(vals[FINE + k * 512 + d0] * 255 - k).toFixed(4)); }
  res.fine = ft;
  res.thr = thr.filter((_, i) => i % 16 === 0 || i > 250); res.thrNull = thr.filter((x) => x === null).length;
  res.renderer = gl.getParameter(gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL);
  return res;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
