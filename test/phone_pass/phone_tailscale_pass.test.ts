import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// K1160: scripts/phone_pass.ps1 finds the phone among the online
// android peers; -TailscaleHost stays as the override and defaults to
// empty. Every name and address in the fixtures is invented. The
// behavior half takes Select-TailscaleIp out of the script's own
// parse tree (the function only; the script body never runs) and
// never runs tailscale.
const repo = resolve(__dirname, "../..");
const script = join(repo, "scripts", "phone_pass.ps1");
const onWindows = process.platform === "win32";

const src = () => readFileSync(script, "utf8");

describe("K1160 phone_pass.ps1: the finder, scanned", () => {
  it("the param block defaults -TailscaleHost to empty", () => {
    const text = src();
    const paramBlock = text.slice(text.indexOf("param("), text.indexOf("$ErrorActionPreference"));
    expect(paramBlock).toContain('[string]$TailscaleHost = ""');
  });

  it("Select-TailscaleIp reads Online and the android OS", () => {
    const text = src();
    const sel = text.slice(text.indexOf("function Select-TailscaleIp"), text.indexOf("function Find-TailscaleIp"));
    expect(sel).toContain("Online");
    expect(sel).toContain("OS");
    expect(sel).toContain("android");
  });

  it("Find-TailscaleIp hands the status and the param to the finder", () => {
    const text = src();
    const find = text.slice(text.indexOf("function Find-TailscaleIp"), text.indexOf("function Get-Devices"));
    expect(find).toContain("status --json");
    expect(find).toContain("Select-TailscaleIp $status $TailscaleHost");
  });

  it("the file carries no script-level tailnet host assignment", () => {
    const text = src();
    expect(text).not.toMatch(/^\$tailscaleHost\s*=/m);
  });
});

// The harness defines only Select-TailscaleIp, from the script's parse
// tree, and feeds it invented statuses. It opens nothing.
const HARNESS = String.raw`
param([string]$ScriptPath)
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw "parse errors in phone_pass.ps1" }
$func = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Select-TailscaleIp' }, $true)
if (-not $func) { throw "Select-TailscaleIp not found" }
Invoke-Expression $func.Extent.Text

function Status([string]$json) { $json | ConvertFrom-Json }

$onePhone = Status @'
{"Peer":{
 "nodekey:fixture-laptop":{"HostName":"Test Laptop","DNSName":"test-laptop.fixture.ts.net","OS":"windows","Online":true,"TailscaleIPs":["100.64.1.11","fd7a:115c:a1e0::11"]},
 "nodekey:fixture-tablet":{"HostName":"Test Tablet","DNSName":"test-tablet.fixture.ts.net","OS":"iOS","Online":true,"TailscaleIPs":["100.64.1.12"]},
 "nodekey:fixture-phone":{"HostName":"Test Phone","DNSName":"test-phone.fixture.ts.net","OS":"android","Online":true,"TailscaleIPs":["100.64.1.21","fd7a:115c:a1e0::21"]}
}}
'@

$twoPhones = Status @'
{"Peer":{
 "nodekey:fixture-laptop":{"HostName":"Test Laptop","DNSName":"test-laptop.fixture.ts.net","OS":"windows","Online":true,"TailscaleIPs":["100.64.1.11"]},
 "nodekey:fixture-phone":{"HostName":"Test Phone","DNSName":"test-phone.fixture.ts.net","OS":"android","Online":true,"TailscaleIPs":["100.64.1.21"]},
 "nodekey:fixture-phone-two":{"HostName":"Test Phone Two","DNSName":"test-phone-two.fixture.ts.net","OS":"android","Online":true,"TailscaleIPs":["100.64.1.22"]}
}}
'@

$phoneOffline = Status @'
{"Peer":{
 "nodekey:fixture-laptop":{"HostName":"Test Laptop","DNSName":"test-laptop.fixture.ts.net","OS":"windows","Online":true,"TailscaleIPs":["100.64.1.11"]},
 "nodekey:fixture-tablet":{"HostName":"Test Tablet","DNSName":"test-tablet.fixture.ts.net","OS":"iOS","Online":true,"TailscaleIPs":["100.64.1.12"]},
 "nodekey:fixture-phone":{"HostName":"Test Phone","DNSName":"test-phone.fixture.ts.net","OS":"android","Online":false,"TailscaleIPs":["100.64.1.21"]}
}}
'@

$noIpv4 = Status @'
{"Peer":{
 "nodekey:fixture-laptop":{"HostName":"Test Laptop","DNSName":"test-laptop.fixture.ts.net","OS":"windows","Online":true,"TailscaleIPs":["100.64.1.11"]},
 "nodekey:fixture-phone":{"HostName":"Test Phone","DNSName":"test-phone.fixture.ts.net","OS":"android","Online":true,"TailscaleIPs":["fd7a:115c:a1e0::31"]}
}}
'@

$out = [ordered]@{
  onePhone = Select-TailscaleIp $onePhone ""
  twoPhones = Select-TailscaleIp $twoPhones ""
  phoneOffline = Select-TailscaleIp $phoneOffline ""
  overrideDns = Select-TailscaleIp $phoneOffline "test-phone"
  overrideHost = Select-TailscaleIp $phoneOffline "Test Phone"
  noIpv4 = Select-TailscaleIp $noIpv4 ""
}
$out | ConvertTo-Json -Compress
`;

const PARSE_CHECK = String.raw`
param([string]$ScriptPath)
$tokens = $null
$errors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Output $_.Message }
  exit 1
}
Write-Output "0 errors"
`;

function runPwsh(scriptText: string): string {
  const dir = mkdtempSync(join(tmpdir(), "k1160-"));
  const file = join(dir, "harness.ps1");
  writeFileSync(file, scriptText);
  return execFileSync("pwsh", ["-NoProfile", "-File", file, script], { encoding: "utf8", timeout: 60000 });
}

describe("K1160 phone_pass.ps1: the finder, on invented peers", () => {
  it.skipIf(!onWindows)("picks the one online android peer, and only that one", () => {
    const r = JSON.parse(runPwsh(HARNESS).trim()) as Record<string, string | null>;
    expect(r).toEqual({
      onePhone: "100.64.1.21",
      twoPhones: null,
      phoneOffline: null,
      overrideDns: "100.64.1.21",
      overrideHost: "100.64.1.21",
      noIpv4: null,
    });
  });

  it.skipIf(!onWindows)("scripts/phone_pass.ps1 parses with no errors", () => {
    expect(runPwsh(PARSE_CHECK).trim()).toBe("0 errors");
  });
});
