import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { build } from "vite";
import {
  ALLOWED_LICENSES,
  CREDITS,
  LICENSE_FALLBACKS,
  NEEDS_COPYRIGHT_LINE,
} from "../../notices/credits";
import {
  gatherNotices,
  hasCopyrightLine,
  licenseAllowed,
  ownerOfModule,
  readLicenseFiles,
  webUrl,
} from "../../notices/notices";
import type { BundledModule } from "../../notices/notices";
import { escapeHtml, groupByText, licenseBlocks, renderPage } from "../../notices/page";
import { NOTICES_BANNER, NOTICES_FILE, notices } from "../../notices/vite_plugin";

// K122: the third-party notices. The package list comes from the bundle
// itself, so these tests drive the collector with a fake node_modules and
// then build the real app in memory and check what it would ship.

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

const MIT_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.`;
const mit = (holder: string) => `MIT License\n\nCopyright (c) 2020 ${holder}\n\n${MIT_BODY}\n`;

const words = (s: string) => s.split(/\s+/).filter(Boolean);

describe("which package owns a bundled module", () => {
  it("finds the package directory in Windows and POSIX ids", () => {
    expect(ownerOfModule("C:\\Users\\a\\repo\\node_modules\\pixi.js\\lib\\x.mjs")).toEqual({
      kind: "package",
      name: "pixi.js",
      dir: "C:/Users/a/repo/node_modules/pixi.js",
    });
    expect(ownerOfModule("/a/node_modules/@pixi/colord/index.mjs?x=1")).toEqual({
      kind: "package",
      name: "@pixi/colord",
      dir: "/a/node_modules/@pixi/colord",
    });
  });

  it("takes the innermost node_modules (nested and pnpm layouts)", () => {
    expect(ownerOfModule("/a/node_modules/x/node_modules/y/z.js")).toMatchObject({
      name: "y",
      dir: "/a/node_modules/x/node_modules/y",
    });
    expect(
      ownerOfModule("/a/node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js")
    ).toMatchObject({ name: "pkg" });
  });

  it("sorts virtual modules into build tooling and the unknown", () => {
    expect(ownerOfModule("\0vite/preload-helper.js").kind).toBe("tooling");
    expect(ownerOfModule("\0vite/modulepreload-polyfill.js").kind).toBe("tooling");
    expect(ownerOfModule("\0rolldown/runtime.js").kind).toBe("tooling");
    expect(ownerOfModule("\0commonjsHelpers.js")).toEqual({
      kind: "unknown-virtual",
      id: "commonjsHelpers.js",
    });
    // A plugin's proxy for a package file still belongs to the package.
    expect(ownerOfModule("\0/a/node_modules/foo/index.js?commonjs-proxy")).toMatchObject({
      kind: "package",
      name: "foo",
      dir: "/a/node_modules/foo",
    });
  });

  it("leaves this project's own files alone", () => {
    expect(ownerOfModule("C:/repo/src/main.ts").kind).toBe("project");
    expect(ownerOfModule("C:/repo/index.html").kind).toBe("project");
  });
});

describe("the license policy", () => {
  it("allows permissive licenses and expressions that reach one", () => {
    for (const ok of [
      "MIT",
      "mit",
      "ISC",
      "BSD-3-Clause",
      "Apache-2.0",
      "(MIT OR Apache-2.0)",
      "(GPL-3.0-only OR MIT)",
      "MIT AND BSD-2-Clause",
      "(MIT AND (ISC OR GPL-2.0-only))",
    ]) {
      expect(licenseAllowed(ok), ok).toBe(true);
    }
  });

  it("flags everything else for Levi", () => {
    for (const bad of [
      "",
      "GPL-3.0-only",
      "LGPL-2.1",
      "MPL-2.0",
      "CC-BY-4.0",
      "UNLICENSED",
      "MIT AND GPL-3.0-only",
      "Apache-2.0 WITH LLVM-exception",
      "SEE LICENSE IN LICENSE",
      "(MIT",
      "MIT OR",
    ]) {
      expect(licenseAllowed(bad), bad).toBe(false);
    }
  });

  it("only lists licenses whose notice we can reproduce", () => {
    expect(ALLOWED_LICENSES).toContain("MIT");
    for (const id of NEEDS_COPYRIGHT_LINE) expect(ALLOWED_LICENSES).toContain(id);
  });

  it("tells a copyright line from the license's own sentences", () => {
    for (const yes of [
      "Copyright (c) 2016 cocopon <cocopon@me.com>",
      "Copyright 2024 Justin Ridgewell",
      "Copyright © 2014 Foo",
      "Copyright (C) 2006 by Rob Landley",
      "Copyright Joyent, Inc. and other Node contributors.",
      "(c) 2016 cocopon",
      "© 2016 Foo",
      "MIT License\n\n  Copyright (c) 2020 Indented Author\n\nPermission",
    ]) {
      expect(hasCopyrightLine(yes), yes).toBe(true);
    }
    for (const no of [
      "",
      "MIT License\n\nThe above copyright notice and this permission notice shall be included",
      "retain the above\ncopyright notice, this list of conditions",
      "IN NO EVENT SHALL THE AUTHORS OR\nCOPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM",
      "Under\ncopyright law you may",
    ]) {
      expect(hasCopyrightLine(no), no).toBe(false);
    }
  });
});

describe("project links", () => {
  it("turns npm metadata into https links a phone can open", () => {
    expect(webUrl("git+https://github.com/pixijs/pixijs.git")).toBe("https://github.com/pixijs/pixijs");
    expect(webUrl("git://github.com/mapbox/earcut.git")).toBe("https://github.com/mapbox/earcut");
    expect(webUrl("omgovich/colord")).toBe("https://github.com/omgovich/colord");
    expect(webUrl({ type: "git", url: "git@github.com:a/b.git" })).toBe("https://github.com/a/b");
    expect(webUrl("https://tweakpane.github.io/docs/")).toBe("https://tweakpane.github.io/docs/");
  });

  it("drops anything that is not https or could break out of an attribute", () => {
    expect(webUrl("http://pixijs.com/")).toBeUndefined();
    expect(webUrl("javascript:alert(1)")).toBeUndefined();
    expect(webUrl('https://x.dev/a"onmouseover="x')).toBeUndefined();
    expect(webUrl(undefined)).toBeUndefined();
    expect(webUrl("")).toBeUndefined();
  });
});

describe("license text on a narrow screen", () => {
  const bsd3 = `Copyright (c) 2014, Someone
Copyright (c) 2015, Someone Else

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
`;
  const apacheish = `                                 Apache License
                           Version 2.0, January 2004

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.
`;

  it("joins hard-wrapped lines into paragraphs and keeps copyright lines apart", () => {
    const blocks = licenseBlocks(mit("Jane Doe"));
    expect(blocks.map((b) => b.text.split("\n").length)).toEqual([1, 1, 1, 1, 1]);
    expect(blocks[1].text).toBe("Copyright (c) 2020 Jane Doe");
    expect(blocks.every((b) => !b.verbatim)).toBe(true);
    // Several copyright lines stay several lines.
    expect(licenseBlocks(bsd3)[0].text).toBe("Copyright (c) 2014, Someone\nCopyright (c) 2015, Someone Else");
  });

  it("keeps list items whole and on their own lines", () => {
    const blocks = licenseBlocks(bsd3);
    expect(blocks[2].text.startsWith("1. Redistributions of source code")).toBe(true);
    expect(blocks[2].text.includes("\n")).toBe(false);
    expect(blocks[3].text.startsWith("2. Redistributions in binary form")).toBe(true);
  });

  it("leaves a layout it does not understand exactly as written", () => {
    const blocks = licenseBlocks(apacheish);
    expect(blocks[0].verbatim).toBe(true);
    expect(blocks[0].text).toContain("                           Version 2.0, January 2004");
  });

  it("changes only whitespace: the same words in the same order", () => {
    for (const text of [mit("A B"), bsd3, apacheish, ...Object.values(LICENSE_FALLBACKS).map((f) => f.text)]) {
      expect(words(licenseBlocks(text).map((b) => b.text).join("\n\n"))).toEqual(words(text));
    }
  });
});

describe("gathering the packages", () => {
  const root = mkdtempSync(join(tmpdir(), "knotmaze-k122-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const pkg = (name: string, json: Record<string, unknown>, files: Record<string, string> = {}, dir = root) => {
    const d = join(dir, "node_modules", ...name.split("/"));
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "package.json"), JSON.stringify({ name, version: "1.2.3", ...json }));
    for (const [f, text] of Object.entries(files)) writeFileSync(join(d, f), text);
  };
  const mod = (name: string, renderedLength = 100, dir = root): BundledModule => ({
    id: join(dir, "node_modules", name, "index.js").replace(/\\/g, "/"),
    renderedLength,
  });

  pkg("good-mit", { license: "MIT", homepage: "https://good.example/" }, { LICENSE: mit("Good Author") });
  pkg("good-isc", { license: "ISC" }, { "LICENSE.md": "ISC License\r\n\r\nCopyright (c) 2019, Isc Author\r\n\r\nPermission to use." });
  pkg("@scope/scoped", { license: "MIT" }, { LICENCE: mit("Scoped Author") });
  pkg("twin-a", { license: "MIT" }, { LICENSE: mit("Same Author") });
  pkg("twin-b", { license: "MIT" }, { LICENSE: mit("Same Author").replace(/\n/g, "\r\n") });
  pkg("dual", { license: "(MIT OR Apache-2.0)" }, { "LICENSE-MIT": mit("Dual Author"), "LICENSE-APACHE": "Apache License\nVersion 2.0" });
  pkg("apache", { license: "Apache-2.0" }, { LICENSE: "Apache License\nVersion 2.0, January 2004", NOTICE: "Apache notice: Product includes software by Someone." });
  pkg("array-licenses", { licenses: [{ type: "MIT" }] }, { LICENSE: mit("Array Author") });
  pkg("no-file", { license: "MIT" });
  pkg("no-file-fallback", { license: "MIT" });
  pkg("fallback-mismatch", { license: "ISC" });
  pkg("fallback-ignored", { license: "MIT" }, { LICENSE: mit("Real File Author") });
  pkg("gpl", { license: "GPL-3.0-only" }, { LICENSE: "GNU GENERAL PUBLIC LICENSE\nVersion 3" });
  pkg("no-field", {}, { LICENSE: mit("No Field Author") });
  pkg("template", { license: "MIT" }, { LICENSE: `MIT License\n\n${MIT_BODY}` });
  pkg("tree-shaken", { license: "GPL-3.0-only" });

  const fallbacks = {
    "no-file-fallback": { license: "MIT", source: "https://up.example/LICENSE", text: mit("Upstream Author") },
    "fallback-mismatch": { license: "MIT", source: "https://up.example/x", text: mit("Upstream Author") },
    "fallback-ignored": { license: "MIT", source: "https://up.example/y", text: mit("Upstream Author") },
  };

  it("lists the packages that render code, once each, sorted", () => {
    const out = gatherNotices(
      [
        mod("good-mit"),
        mod("good-mit", 50), // a second module of the same package
        mod("@scope/scoped"),
        mod("good-isc"),
        mod("tree-shaken", 0), // contributed nothing: not shipped, not checked
        { id: "\0vite/preload-helper.js", renderedLength: 900 },
        { id: join(root, "src", "main.ts").replace(/\\/g, "/"), renderedLength: 5000 },
      ],
      { fallbacks }
    );
    expect(out.problems).toEqual([]);
    expect(out.packages.map((p) => p.name)).toEqual(["@scope/scoped", "good-isc", "good-mit"]);
    const good = out.packages.find((p) => p.name === "good-mit");
    expect(good).toMatchObject({ version: "1.2.3", license: "MIT", url: "https://good.example/" });
    expect(good?.text).toContain("Copyright (c) 2020 Good Author");
    // CRLF license files are read as LF.
    expect(out.packages.find((p) => p.name === "good-isc")?.text).not.toContain("\r");
  });

  it("reads every license file a package ships, licenses first, without repeats", () => {
    const dual = readLicenseFiles(join(root, "node_modules", "dual"));
    expect(dual).toContain("Copyright (c) 2020 Dual Author");
    expect(dual).toContain("Apache License");
    const apache = gatherNotices([mod("apache")], { fallbacks }).packages[0];
    expect(apache.text.indexOf("Apache License")).toBeLessThan(apache.text.indexOf("Apache notice"));
    expect(readLicenseFiles(join(root, "node_modules", "no-file"))).toBe("");
    const twins = gatherNotices([mod("twin-a"), mod("twin-b")], { fallbacks }).packages;
    expect(groupByText(twins)).toHaveLength(1);
    expect(groupByText(twins)[0].packages.map((p) => p.name)).toEqual(["twin-a", "twin-b"]);
  });

  it("reads a legacy licenses array", () => {
    const out = gatherNotices([mod("array-licenses")], { fallbacks });
    expect(out.problems).toEqual([]);
    expect(out.packages[0].license).toBe("MIT");
  });

  it("falls back to the tracked upstream text only when the package ships none", () => {
    const out = gatherNotices([mod("no-file-fallback"), mod("fallback-ignored")], { fallbacks });
    expect(out.problems).toEqual([]);
    const used = out.packages.find((p) => p.name === "no-file-fallback");
    expect(used?.text).toContain("Upstream Author");
    expect(used?.textSource).toBe("https://up.example/LICENSE");
    const own = out.packages.find((p) => p.name === "fallback-ignored");
    expect(own?.text).toContain("Real File Author");
    expect(own?.textSource).toBeUndefined();
  });

  it("fails on a package with no license text, naming the package and the fix", () => {
    const { problems } = gatherNotices([mod("no-file")], { fallbacks });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("no-file@1.2.3 ships no license file");
    expect(problems[0]).toContain("LICENSE_FALLBACKS");
  });

  it("fails when a fallback was copied under another license than the package declares now", () => {
    const { problems } = gatherNotices([mod("fallback-mismatch")], { fallbacks });
    expect(problems.join("\n")).toContain('now declares "ISC"');
  });

  it("fails on a license outside the allowed list, or none", () => {
    const { problems } = gatherNotices([mod("gpl"), mod("no-field")], { fallbacks });
    expect(problems.some((p) => p.includes('gpl@1.2.3 is licensed "GPL-3.0-only"'))).toBe(true);
    expect(problems.some((p) => p.includes("no-field@1.2.3 declares no license"))).toBe(true);
  });

  it("fails on license text that is a template without a copyright line", () => {
    const { problems } = gatherNotices([mod("template")], { fallbacks });
    expect(problems.join("\n")).toContain("no copyright line");
  });

  it("fails on code from a virtual module nobody has classified", () => {
    const { problems } = gatherNotices([{ id: "\0some-plugin/helper.js", renderedLength: 40 }], { fallbacks });
    expect(problems.join("\n")).toContain("some-plugin/helper.js");
    expect(
      gatherNotices([{ id: "\0some-plugin/helper.js", renderedLength: 0 }], { fallbacks }).problems
    ).toEqual([]);
  });
});

describe("the page", () => {
  const base = { build: { version: "9.9.9", sha: "abc1234" } };
  const pkgs = [
    { name: "a", version: "1.0.0", license: "MIT", url: "https://a.example/", text: mit("A Author") },
    { name: "b-pkg", version: "2.0.0", license: "ISC", text: "Copyright (c) B\n\nPermission <to> use & \"copy\"." },
  ];

  it("escapes everything that came from outside", () => {
    const html = renderPage({
      ...base,
      packages: [{ ...pkgs[1], name: "x<script>", text: "<script>alert(1)</script> & \"q\" 'r'" }],
      credits: [{ id: "c", title: "T<b>", by: "B&B", note: "<img src=x onerror=y>", url: "https://c.example/?a=1&b=2", shipped: true }],
    });
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot; &#39;r&#39;");
    expect(html).toContain('href="https://c.example/?a=1&amp;b=2"');
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("is one self-contained page with relative links only", () => {
    const html = renderPage({ ...base, packages: pkgs, credits: [] });
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<meta name="viewport" content="width=device-width');
    expect(html).not.toMatch(/<script|<link |@import|src=/);
    expect(html).toContain('<a class="home" href="./">');
    // Every in-page link has a target.
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
      expect(html, id).toContain(`id="${id}"`);
    }
    expect(html).toContain("Knotmaze v9.9.9");
    expect(html).toContain("abc1234");
  });

  it("lists each package with its version, license, link and full text", () => {
    const html = renderPage({ ...base, packages: pkgs, credits: [] });
    expect(html).toContain('data-package="a" data-version="1.0.0"');
    expect(html).toContain('data-package="b-pkg" data-version="2.0.0"');
    expect(html).toContain('href="https://a.example/"');
    expect(html).toContain("Copyright (c) 2020 A Author");
    expect(html).not.toContain("does not include its license file");
    const withSource = renderPage({
      ...base,
      packages: [{ ...pkgs[0], textSource: "https://up.example/LICENSE" }],
      credits: [],
    });
    expect(withSource).toContain("does not include its license file");
    expect(withSource).toContain('href="https://up.example/LICENSE"');
  });

  it("groups packages that share a license text under one block", () => {
    const html = renderPage({
      ...base,
      packages: [pkgs[0], { ...pkgs[0], name: "a-twin", text: pkgs[0].text.replace(/\n/g, "\r\n") }],
      credits: [],
    });
    expect(html.match(/<div class="lic">/g)).toHaveLength(1);
    expect(html).toContain('data-package="a-twin"');
  });

  it("shows a credit's notice verbatim, line breaks and all", () => {
    const html = renderPage({
      ...base,
      packages: [],
      credits: [
        { id: "n", title: "Fonts", by: "Someone", note: "N.", notice: "First paragraph.\n\nSecond:\nline a\nline b", shipped: true },
      ],
    });
    expect(html).toContain("<blockquote><p>First paragraph.</p><p>Second:\nline a\nline b</p></blockquote>");
  });

  it("shows the shipped credits, with the sources the code comments cite", () => {
    const html = renderPage({ ...base, packages: [], credits: CREDITS.filter((c) => c.shipped) });
    for (const who of ["Inigo Quilez", "Jarzynski", "Olano", "Jimenez", "Perlin"]) {
      expect(html, who).toContain(who);
    }
    expect(html).not.toContain("Hershey");
  });
});

describe("the tracked credits", () => {
  const hershey = CREDITS.find((c) => c.id === "hershey-fonts");

  it("have stable unique ids and https links", () => {
    expect(new Set(CREDITS.map((c) => c.id)).size).toBe(CREDITS.length);
    for (const c of CREDITS) {
      expect(c.title && c.by && c.note, c.id).toBeTruthy();
      if (c.url) expect(c.url, c.id).toMatch(/^https:\/\//);
    }
  });

  it("carry the Hershey acknowledgements the font license requires", () => {
    // hershey.txt, USE RESTRICTION, condition 1: both acknowledgements
    // must be distributed with the font data.
    expect(hershey).toBeDefined();
    const n = hershey?.notice ?? "";
    expect(n).toContain("Dr. A. V. Hershey");
    expect(n).toContain("U. S. National Bureau of Standards");
    expect(n).toContain("James Hurt");
    expect(n).toContain("Cognition, Inc.");
  });

  it("ship the Hershey acknowledgements as soon as anything in the app mentions the fonts", () => {
    // K115 adds the font data. If a source or public file names Hershey (or
    // is a .jhf file) while the credit is still unshipped, the app would
    // carry the data without its acknowledgement: set `shipped: true` on
    // the "hershey-fonts" entry in notices/credits.ts in that commit.
    const hits: string[] = [];
    const scan = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          scan(path);
          continue;
        }
        if (/hershey|\.jhf$/i.test(name)) hits.push(path);
        else if (/\.(ts|js|mjs|json|glsl|svg|html|css|txt|md)$/i.test(name) && /hershey/i.test(readFileSync(path, "utf8"))) {
          hits.push(path);
        }
      }
    };
    for (const d of ["src", "public"]) scan(join(repoRoot, d));
    if (hits.length) {
      expect(hershey?.shipped, `Hershey is mentioned in ${hits.join(", ")}`).toBe(true);
    }
  });

  it("keep the fallback licenses complete: permission text and a copyright line", () => {
    for (const [name, fb] of Object.entries(LICENSE_FALLBACKS)) {
      expect(ALLOWED_LICENSES, name).toContain(fb.license);
      expect(fb.source, name).toMatch(/^https:\/\//);
      expect(fb.text, name).toContain("Permission is hereby granted, free of charge");
      expect(fb.text, name).toContain("The above copyright notice and this permission notice shall be included");
      expect(fb.text, name).toMatch(/copyright \(c\) \d{4} \S/i);
    }
    expect(LICENSE_FALLBACKS.tweakpane.text).toContain("cocopon");
    expect(LICENSE_FALLBACKS["@pixi/colord"].text).toContain("Vlad Shilov");
  });
});

describe("the dev server", () => {
  it("answers /licenses.html with a placeholder and passes everything else on", () => {
    const plugin = notices();
    let middleware: ((req: { url?: string }, res: FakeRes, next: () => void) => void) | undefined;
    type FakeRes = { statusCode: number; headers: Record<string, string>; body: string; setHeader(k: string, v: string): void; end(b: string): void };
    const server = { middlewares: { use: (fn: typeof middleware) => (middleware = fn) } };
    (plugin.configureServer as (s: unknown) => void)(server);

    const res: FakeRes = {
      statusCode: 0,
      headers: {},
      body: "",
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end(b) {
        this.body = b;
      },
    };
    let passed = 0;
    middleware?.({ url: `/${NOTICES_FILE}?x=1` }, res, () => passed++);
    expect(passed).toBe(0);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toContain("text/html");
    expect(res.body).toContain("development server");
    middleware?.({ url: "/index.html" }, res, () => passed++);
    expect(passed).toBe(1);
  });
});

// The plugin's wiring, in a throwaway project (one HTML page, one module,
// three fake packages): a bundled package without license text stops the
// build, a package that is imported but tree-shaken away is neither listed
// nor checked, and a good one lands on the page.
describe("the plugin in a throwaway project", () => {
  const root = mkdtempSync(join(tmpdir(), "knotmaze-k122-proj-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const lib = (name: string, files: Record<string, string>, json: Record<string, unknown> = {}) => {
    const d = join(root, "node_modules", name);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "package.json"), JSON.stringify({ name, version: "1.0.0", main: "index.js", ...json }));
    for (const [f, text] of Object.entries(files)) writeFileSync(join(d, f), text);
  };
  const project = (main: string) => {
    writeFileSync(join(root, "index.html"), `<!doctype html><script type="module" src="/main.js"></script>`);
    writeFileSync(join(root, "main.js"), main);
  };
  const run = async () => {
    const result = await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [notices()],
      build: { write: false, outDir: join(root, "out") },
    });
    const rolled = Array.isArray(result) ? result[0] : result;
    return (rolled as unknown as { output: { type: string; fileName: string; source?: string; code?: string }[] }).output;
  };

  lib("good-lib", { "index.js": "export const good = () => 'good';", LICENSE: mit("Good Lib Author") }, { license: "MIT" });
  lib("bare-lib", { "index.js": "export const bare = () => 'bare';" }, { license: "MIT" });
  lib("shaken-lib", { "index.js": "export const shaken = () => 'shaken';" }, { license: "GPL-3.0-only", sideEffects: false });

  it("fails the build for a bundled package with no license text, naming it", async () => {
    project(`import { bare } from "bare-lib"; console.log(bare());`);
    await expect(run()).rejects.toThrow(/bare-lib@1\.0\.0 ships no license file/);
  });

  it("fails the build for a bundled package under a license nobody approved", async () => {
    project(`import { shaken } from "shaken-lib"; console.log(shaken());`);
    await expect(run()).rejects.toThrow(/shaken-lib@1\.0\.0 is licensed "GPL-3\.0-only"/);
  });

  it("lists a good package, ignores one that was tree-shaken away, and banners the chunk", async () => {
    // shaken-lib is imported and never used, and declares sideEffects: false.
    project(`import { good } from "good-lib"; import { shaken } from "shaken-lib"; console.log(good());`);
    const out = await run();
    const page = out.find((o) => o.fileName === NOTICES_FILE);
    expect(page?.source).toContain('data-package="good-lib"');
    expect(page?.source).toContain("Copyright (c) 2020 Good Lib Author");
    expect(page?.source).not.toContain("shaken-lib");
    const chunk = out.find((o) => o.type === "chunk");
    expect(chunk?.code).toContain(NOTICES_BANNER);
  });
});

// The guard on the real thing: build the app in memory and read what it
// would publish. A bundled package with no license text, a license outside
// the allowed list, or an unclassified virtual module fails the build
// itself (vite_plugin.ts), so reaching the assertions already means the
// policy held; the rest checks the page against an independent record of
// the same bundle, the source maps' file lists.
describe("the real build", () => {
  type Asset = { type: "asset"; fileName: string; source: string | Uint8Array };
  type Chunk = { type: "chunk"; fileName: string; code: string };
  let out: (Asset | Chunk)[];

  const text = (a: Asset): string =>
    typeof a.source === "string" ? a.source : new TextDecoder().decode(a.source);
  const nodeModulePackages = (path: string): string | undefined =>
    /(?:^|[\\/])node_modules[\\/](@[^\\/]+[\\/][^\\/]+|[^\\/@][^\\/]*)[\\/]/.exec(path)?.[1].replace(/\\/g, "/");

  it("builds, and its page lists exactly the packages the bundle contains", async () => {
    const result = await build({
      root: repoRoot,
      configFile: join(repoRoot, "vite.config.ts"),
      logLevel: "silent",
      build: { write: false, sourcemap: true, outDir: join(tmpdir(), "knotmaze-k122-dist") },
    });
    const rolled = Array.isArray(result) ? result[0] : result;
    out = (rolled as unknown as { output: (Asset | Chunk)[] }).output;

    const page = out.find((o): o is Asset => o.type === "asset" && o.fileName === NOTICES_FILE);
    expect(page, `${NOTICES_FILE} is in the build output`).toBeDefined();
    const html = text(page as Asset);

    const listed = new Set([...html.matchAll(/data-package="([^"]+)"/g)].map((m) => m[1]));
    const inBundle = new Set<string>();
    for (const o of out) {
      if (o.type !== "asset" || !o.fileName.endsWith(".map")) continue;
      const map = JSON.parse(text(o)) as { sources: string[] };
      for (const s of map.sources) {
        const name = nodeModulePackages(s);
        if (name) inBundle.add(name);
      }
    }
    expect([...inBundle].length).toBeGreaterThan(0);
    expect([...listed].sort()).toEqual([...inBundle].sort());

    // The dependencies this repo is known to ship are all there.
    for (const name of ["pixi.js", "tweakpane", "simplex-noise"]) expect(listed.has(name), name).toBe(true);

    // Every listed package carries a copyright line in its text.
    for (const [, name, body] of html.matchAll(/data-package="([^"]+)"[\s\S]*?<div class="lic">([\s\S]*?)<\/div>/g)) {
      expect(body, name).toMatch(/copyright/i);
    }
    // Credits ship; the Hershey acknowledgement waits for K115's data.
    expect(html).toContain("Inigo Quilez");
    expect(html).not.toContain("Hershey");
    // Nothing from the deleted Vite template icons.
    expect(out.some((o) => /vite\.svg|typescript\.svg/.test(o.fileName))).toBe(false);
  }, 120_000);

  it("points every JS chunk at the page and keeps packages' own legal comments", () => {
    const chunks = out.filter((o): o is Chunk => o.type === "chunk");
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.code, c.fileName).toContain(NOTICES_BANNER);
    // Tweakpane's own one-line notice survives the minifier.
    expect(chunks.some((c) => c.code.includes("/*! Tweakpane"))).toBe(true);
  });
});
