// K122: find the third-party packages that really end up in the bundle,
// read each one's license, and check them against the policy in
// credits.ts. Plain Node (fs + path) with no Vite import, so the tests can
// drive it with a fake node_modules; vite_plugin.ts feeds it the modules of
// the real bundle.
//
// "Really end up in the bundle" is what Rolldown reports per output chunk:
// a module with renderedLength > 0 contributed code. package.json's
// dependency list is NOT consulted (a dependency that is tree-shaken away
// or only holds types ships nothing, and a transitive dependency ships
// code nobody listed). Cross-checked in test/notices against the source
// maps' file lists, an independent record of the same bundle.

import { readdirSync, readFileSync, statSync } from "node:fs";
import {
  ALLOWED_LICENSES,
  LICENSE_FALLBACKS,
  NEEDS_COPYRIGHT_LINE,
  TOOLING_VIRTUAL_PREFIXES,
} from "./credits";
import type { LicenseFallback } from "./credits";

export interface BundledModule {
  id: string;
  renderedLength: number;
}

export type ModuleOwner =
  | { kind: "package"; name: string; dir: string }
  | { kind: "tooling" }
  | { kind: "project" }
  | { kind: "unknown-virtual"; id: string };

// Who owns a bundled module: an npm package (its directory is the part of
// the path up to and including the LAST node_modules/<name>, so nested and
// pnpm layouts resolve to the package that really holds the file), the
// build tooling (a virtual helper module), or this project.
export function ownerOfModule(
  rawId: string,
  toolingPrefixes: readonly string[] = TOOLING_VIRTUAL_PREFIXES
): ModuleOwner {
  let id = rawId.split("?")[0].replace(/\\/g, "/");
  if (id.startsWith("node_modules/")) id = `/${id}`;
  const marker = "/node_modules/";
  const at = id.lastIndexOf(marker);
  if (at >= 0) {
    const parts = id.slice(at + marker.length).split("/");
    const name = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    if (!name || name.endsWith("/undefined")) return { kind: "project" };
    const root = id.startsWith("\0") ? id.slice(1, at + marker.length) : id.slice(0, at + marker.length);
    return { kind: "package", name, dir: root + name };
  }
  if (id.startsWith("\0")) {
    const virtual = id.slice(1);
    return toolingPrefixes.some((p) => virtual.startsWith(p))
      ? { kind: "tooling" }
      : { kind: "unknown-virtual", id: virtual };
  }
  return { kind: "project" };
}

// ---------------------------------------------------------------------------
// Licenses
// ---------------------------------------------------------------------------

// Is every obligation in this SPDX expression covered by the allowed list?
// "A OR B" needs one alternative, "A AND B" both; a WITH exception always
// needs a human. Anything that does not parse ("SEE LICENSE IN ...") is
// not allowed.
export function licenseAllowed(
  expression: string,
  allowed: readonly string[] = ALLOWED_LICENSES
): boolean {
  const ok = new Set(allowed.map((s) => s.toLowerCase()));
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? [];
  const op = (t: string | undefined) => t?.toUpperCase();
  let i = 0;
  const atom = (): boolean => {
    const t = tokens[i++];
    if (t === "(") {
      const v = orExpr();
      if (tokens[i++] !== ")") throw new Error("unbalanced parentheses");
      return v;
    }
    if (t === undefined || t === ")" || ["AND", "OR", "WITH"].includes(op(t) ?? "")) {
      throw new Error("syntax");
    }
    let allowedHere = ok.has(t.toLowerCase());
    if (op(tokens[i]) === "WITH") {
      i += 2;
      allowedHere = false;
    }
    return allowedHere;
  };
  const andExpr = (): boolean => {
    let v = atom();
    while (op(tokens[i]) === "AND") {
      i++;
      const r = atom();
      v = v && r;
    }
    return v;
  };
  const orExpr = (): boolean => {
    let v = andExpr();
    while (op(tokens[i]) === "OR") {
      i++;
      const r = andExpr();
      v = v || r;
    }
    return v;
  };
  try {
    const v = orExpr();
    return i === tokens.length && v;
  } catch {
    return false;
  }
}

const COPYRIGHT_LINE = /copyright|\(c\)|©/i;
const LICENSE_FILE = /^(?:licen[cs]e|copying|unlicense|notice)(?:[-_. ].*)?$/i;

const eol = (s: string) => s.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

// The license(s) a package ships: every top-level LICENSE*, LICENCE*,
// COPYING*, UNLICENSE* and NOTICE* file (licenses first, then notices),
// without repeats, joined by a blank line.
export function readLicenseFiles(dir: string): string {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return "";
  }
  const isNotice = (n: string) => /^notice/i.test(n);
  const files = names
    .filter((n) => LICENSE_FILE.test(n))
    .filter((n) => {
      try {
        return statSync(`${dir}/${n}`).isFile();
      } catch {
        return false;
      }
    })
    .sort((a, b) => Number(isNotice(a)) - Number(isNotice(b)) || a.localeCompare(b));
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const n of files) {
    const text = eol(readFileSync(`${dir}/${n}`, "utf8")).trim();
    const key = text.replace(/\s+/g, " ");
    if (!text || seen.has(key)) continue;
    seen.add(key);
    parts.push(text);
  }
  return parts.join("\n\n");
}

// package.json's license, as one SPDX expression ("" when it names none).
function licenseOf(pkg: Record<string, unknown>): string {
  const one = (l: unknown): string =>
    typeof l === "string"
      ? l.trim()
      : l && typeof l === "object" && typeof (l as { type?: unknown }).type === "string"
        ? ((l as { type: string }).type).trim()
        : "";
  const single = one(pkg.license);
  if (single) return single;
  if (Array.isArray(pkg.licenses)) {
    const all = pkg.licenses.map(one).filter(Boolean);
    if (all.length === 1) return all[0];
    if (all.length > 1) return `(${all.join(" OR ")})`;
  }
  return "";
}

// A link a phone can open: https only (npm metadata carries git:// and
// git+https:// forms, scp-style and "owner/repo" shorthands).
export function webUrl(raw: unknown): string | undefined {
  let s =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object" && typeof (raw as { url?: unknown }).url === "string"
        ? (raw as { url: string }).url
        : "";
  s = s.trim().replace(/^git\+/, "");
  const scp = /^git@([^:/]+):(.+)$/.exec(s);
  if (scp) s = `https://${scp[1]}/${scp[2]}`;
  s = s.replace(/^(?:git|ssh):\/\/(?:git@)?/, "https://");
  const short = /^(?:github:)?([\w.-]+\/[\w.-]+)$/.exec(s);
  if (short) s = `https://github.com/${short[1]}`;
  s = s.replace(/#.*$/, "").replace(/\.git$/, "");
  return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : undefined;
}

// ---------------------------------------------------------------------------
// Gathering
// ---------------------------------------------------------------------------

export interface PackageNotice {
  name: string;
  version: string;
  // SPDX expression from package.json.
  license: string;
  url?: string;
  // The license text(s), LF line endings.
  text: string;
  // Set when the text came from LICENSE_FALLBACKS: where it was copied.
  textSource?: string;
}

export interface Gathered {
  packages: PackageNotice[];
  // Everything that must stop the build, as readable sentences.
  problems: string[];
}

export interface GatherOptions {
  allowed?: readonly string[];
  fallbacks?: Readonly<Record<string, LicenseFallback>>;
  needsCopyrightLine?: readonly string[];
  toolingPrefixes?: readonly string[];
}

export function gatherNotices(
  modules: readonly BundledModule[],
  options: GatherOptions = {}
): Gathered {
  const allowed = options.allowed ?? ALLOWED_LICENSES;
  const fallbacks = options.fallbacks ?? LICENSE_FALLBACKS;
  const needsLine = options.needsCopyrightLine ?? NEEDS_COPYRIGHT_LINE;
  const problems: string[] = [];

  const dirs = new Map<string, string>(); // package directory -> name
  const unknownVirtual = new Set<string>();
  for (const m of modules) {
    if (!(m.renderedLength > 0)) continue;
    const owner = ownerOfModule(m.id, options.toolingPrefixes);
    if (owner.kind === "package") dirs.set(owner.dir, owner.name);
    else if (owner.kind === "unknown-virtual") unknownVirtual.add(owner.id);
  }
  for (const id of [...unknownVirtual].sort()) {
    problems.push(
      `The bundle contains code from a virtual module "${id}". If it is build tooling, add its prefix to TOOLING_VIRTUAL_PREFIXES in notices/credits.ts; if it carries third-party code, that code needs a notice.`
    );
  }

  const byId = new Map<string, PackageNotice>();
  for (const [dir, name] of [...dirs].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))) {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(`${dir}/package.json`, "utf8")) as Record<string, unknown>;
    } catch {
      problems.push(`${name}: no readable package.json in ${dir}.`);
      continue;
    }
    const version = typeof pkg.version === "string" ? pkg.version : "0.0.0";
    const id = `${name}@${version}`;
    if (byId.has(id)) continue;
    const license = licenseOf(pkg);

    if (!license) {
      problems.push(`${id} declares no license in its package.json.`);
    } else if (!licenseAllowed(license, allowed)) {
      problems.push(
        `${id} is licensed "${license}", which is outside the allowed list. Levi decides: ALLOWED_LICENSES in notices/credits.ts.`
      );
    }

    let text = readLicenseFiles(dir);
    let textSource: string | undefined;
    if (!text) {
      const fb = fallbacks[name];
      if (!fb) {
        problems.push(
          `${id} ships no license file (looked for LICENSE*, COPYING* and NOTICE* in its directory). Copy the upstream LICENSE for this version into LICENSE_FALLBACKS in notices/credits.ts, with its source URL.`
        );
      } else {
        text = eol(fb.text).trim();
        textSource = fb.source;
        if (license && fb.license !== license) {
          problems.push(
            `${id} now declares "${license}" but its fallback text in notices/credits.ts was copied under "${fb.license}". Re-copy it from upstream.`
          );
        }
      }
    }
    if (text && license) {
      const wantsLine = needsLine.some((l) =>
        license.toLowerCase().split(/[\s()]+/).includes(l.toLowerCase())
      );
      if (wantsLine && !COPYRIGHT_LINE.test(text)) {
        problems.push(
          `${id}: its ${license} license text has no copyright line, so it is a template, not the notice the license requires.`
        );
      }
    }

    byId.set(id, {
      name,
      version,
      license,
      url: webUrl(pkg.homepage) ?? webUrl(pkg.repository),
      text,
      textSource,
    });
  }

  const packages = [...byId.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version, "en", { numeric: true })
  );
  return { packages, problems };
}
