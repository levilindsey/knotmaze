// K1247 s35: a puppeteer-free Chrome driver (raw DevTools protocol over Node's WebSocket), for when the shared
// node_modules has no working puppeteer-core (2026-11-12 18:34: @puppeteer/browsers vanished from the main
// checkout's install). Launches headed Chrome with the bench's flags on a URL; evaluate() awaits a promise.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch(url) {
  const profile = mkdtempSync(join(tmpdir(), "k1247s35-cdp-"));
  const proc = spawn(CHROME, ["--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1200,800", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", url], { stdio: "ignore" });
  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
  const port = readFileSync(portFile, "utf8").split("\n")[0].trim();
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.type === "page" && t.url.startsWith(url.slice(0, 20)));
    if (!target) await sleep(100);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let nextId = 1; const waiting = new Map(); const listeners = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } else if (m.method) listeners.forEach((f) => f(m));
  };
  const send = (method, params = {}) => new Promise((r) => { const id = nextId++; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send("Runtime.enable");
  listeners.push((m) => { if (m.method === "Runtime.exceptionThrown") console.log(`pageerror: ${m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text}`); });
  const evaluate = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  const waitFor = async (expr, ms = 300000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evaluate(expr)) return; await sleep(200); } throw new Error(`timeout: ${expr}`); };
  const version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser;
  const close = async () => { try { await send("Browser.close"); } catch { /* gone */ } ws.close(); await sleep(500); try { proc.kill(); } catch { /* gone */ } try { rmSync(profile, { recursive: true, force: true }); } catch { /* held */ } };
  return { evaluate, waitFor, version, close };
}
