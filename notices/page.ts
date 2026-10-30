// K122: the credits and licenses page, as one self-contained HTML string
// (inline CSS, no script, no requests), readable on a phone and in a
// dark theme. Pure: vite_plugin.ts passes in what notices.ts gathered.

import type { Credit, ResearchCredit } from "./credits";
import type { PackageNotice } from "./notices";

export interface PageModel {
  packages: readonly PackageNotice[];
  // Only the credits that ship (shipped: true); the caller filters.
  credits: readonly Credit[];
  // K277: the published techniques the code follows (credits.ts RESEARCH).
  // The section sits after the packages and is left out when there are none.
  research?: readonly ResearchCredit[];
  // Which build this page describes (the panel header shows the same).
  build: { version: string; sha: string };
  // A line above the licenses; the dev server's placeholder says why the
  // package list is empty there.
  note?: string;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// License text for a narrow screen
// ---------------------------------------------------------------------------

export interface TextBlock {
  text: string;
  // true = keep the original line breaks and indentation (a layout the
  // reflow does not understand); false = the lines were joined into
  // paragraphs.
  verbatim: boolean;
}

const LIST_ITEM = /^\s*(?:\d+[.)]|\([a-z0-9]+\)|[a-z][.)]|[-*•])\s+/i;
const KEEP_LINE = /^\s*(?:copyright\b|\(c\)|©)/i;

// LICENSE files are hard-wrapped at about 78 columns; on a phone every
// such line wraps again and the text zig-zags. Join the lines of each
// paragraph (copyright lines and list items stay on their own lines) and
// leave any block with other indentation exactly as it is. Only
// whitespace changes: the words come out in the same order (tested).
export function licenseBlocks(raw: string): TextBlock[] {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  return text.split(/\n[ \t]*\n/).map((block): TextBlock => {
    const lines = block.split("\n").map((l) => l.replace(/[ \t]+$/, ""));
    const items = lines.some((l) => LIST_ITEM.test(l));
    if (!items && lines.some((l) => /^\s/.test(l))) {
      return { text: lines.join("\n"), verbatim: true };
    }
    const out: string[] = [];
    let prevKept = false;
    for (const line of lines) {
      const t = line.trim();
      const startsNew = LIST_ITEM.test(line) || KEEP_LINE.test(line) || prevKept || out.length === 0;
      if (startsNew) out.push(t);
      else out[out.length - 1] += ` ${t}`;
      prevKept = KEEP_LINE.test(line);
    }
    return { text: out.join("\n"), verbatim: false };
  });
}

// Packages whose license text is the same words (whatever the wrapping)
// share one block on the page.
export interface PackageGroup {
  packages: PackageNotice[];
  text: string;
  textSource?: string;
}

export function groupByText(packages: readonly PackageNotice[]): PackageGroup[] {
  const groups = new Map<string, PackageGroup>();
  for (const p of packages) {
    const key = p.text.replace(/\s+/g, " ").trim();
    const g = groups.get(key);
    if (g) {
      g.packages.push(p);
      g.textSource ??= p.textSource;
    } else {
      groups.set(key, { packages: [p], text: p.text, textSource: p.textSource });
    }
  }
  return [...groups.values()];
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const paragraphs = (text: string): string =>
  text
    .split(/\n[ \t]*\n/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join("");

const CSS = `
:root{color-scheme:light dark;--bg:#fafaf8;--fg:#1d1e22;--muted:#575b66;--link:#1c56b8;--rule:#d9d7cf;--card:#f1efe9}
@media (prefers-color-scheme:dark){:root{--bg:#15161a;--fg:#e7e8ec;--muted:#a0a4b0;--link:#8db6ff;--rule:#2c2e36;--card:#1d1f25}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:42rem;margin:0 auto;padding:20px max(16px,env(safe-area-inset-right)) 56px max(16px,env(safe-area-inset-left))}
a{color:var(--link);text-underline-offset:2px}
h1{font-size:1.5rem;line-height:1.2;margin:.4rem 0 .75rem}
h2{font-size:1.15rem;margin:2.2rem 0 .6rem;padding-top:1.1rem;border-top:1px solid var(--rule)}
h3{font-size:1rem;margin:0 0 .25rem}
p{margin:0 0 .75rem}
.home{display:inline-block;font-size:.9rem;margin-bottom:.4rem}
.muted,.by,.meta,.foot{color:var(--muted)}
.meta,.foot,.by{font-size:.875rem}
ul{padding-left:1.1rem;margin:0 0 .75rem}
.credits{list-style:none;padding:0}
.credits li{margin:0 0 1rem}
.credits .note{margin:.15rem 0 0}
.index{columns:2 14rem;column-gap:1.5rem}
.index li{break-inside:avoid;margin:0 0 .15rem}
article{margin:0 0 1.6rem}
.pkgs{list-style:none;padding:0;margin:0 0 .5rem}
.pkgs li{margin:0 0 .2rem}
.lic{background:var(--card);border-radius:8px;padding:.75rem .9rem .1rem}
.lic p{font-size:.875rem;white-space:pre-line;overflow-wrap:anywhere}
.lic p.verbatim{white-space:pre-wrap;font:.8rem/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.src{font-size:.8rem;color:var(--muted);margin:.4rem 0 0;overflow-wrap:anywhere}
blockquote{margin:.5rem 0 0;padding:.65rem .9rem;background:var(--card);border-left:3px solid var(--rule);border-radius:0 8px 8px 0;font-size:.875rem;white-space:pre-line}
blockquote p{margin:0 0 .6rem}
blockquote p:last-child{margin:0}
.foot{margin-top:2.5rem;border-top:1px solid var(--rule);padding-top:1rem}
.built{color:var(--muted);font-size:.875rem}
.jump{font-size:.9rem}
.research{list-style:none;padding:0;margin:0}
.research>li{background:var(--card);border-radius:8px;padding:.75rem .9rem .2rem;margin:0 0 .8rem;overflow-wrap:anywhere}
.research .by{margin:0 0 .5rem}
.research .refs{list-style:none;padding:0;margin:0 0 .6rem;font-size:.9rem}
.research .refs li{margin:0 0 .3rem}
.research .row{font-size:.9rem;margin:0 0 .6rem}
.research .lbl{display:block;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.research code{display:inline-block;margin:0 .4rem .15rem 0;font:.78rem/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
`;

export function renderPage(m: PageModel): string {
  const groups = groupByText(m.packages);

  // K321: art and music entries (credit.section) get their own sections,
  // above the built-with line; the rest are techniques and notices.
  const bySection = (section?: "art" | "music") => m.credits.filter((c) => c.section === section);
  const renderCredits = (list: readonly Credit[]) => list
    .map((c) => {
      const title = c.url
        ? `<a href="${escapeHtml(c.url)}" rel="noopener">${escapeHtml(c.title)}</a>`
        : escapeHtml(c.title);
      return (
        `<li id="credit-${slug(c.id)}"><h3>${title} <span class="by">· ${escapeHtml(c.by)}</span></h3>` +
        `<p class="note">${escapeHtml(c.note)}</p>` +
        (c.notice ? `<blockquote>${paragraphs(c.notice)}</blockquote>` : "") +
        (c.notice && c.noticeSource
          ? `<p class="src">The text above was copied from <a href="${escapeHtml(c.noticeSource)}" rel="noopener">${escapeHtml(c.noticeSource)}</a>.</p>`
          : "") +
        `</li>`
      );
    })
    .join("\n");
  const credits = renderCredits(bySection(undefined));
  const creditSection = (id: string, heading: string, list: readonly Credit[]) =>
    list.length ? `<h2 id="${id}">${heading}</h2>\n<ul class="credits">\n${renderCredits(list)}\n</ul>\n` : "";
  const artSection = creditSection("art", "Art and icons", bySection("art"));
  const musicSection = creditSection("music", "Music and sound", bySection("music"));
  const creditsSection = credits ? `<h2 id="credits">Credits</h2>\n<ul class="credits">\n${credits}\n</ul>\n` : "";
  const builtWith = `<p class="built">Built with <a href="https://claude.com/claude-code" rel="noopener">Claude Code</a> (Anthropic)</p>\n`;

  const index = m.packages
    .map(
      (p) =>
        `<li><a href="#pkg-${slug(`${p.name}-${p.version}`)}">${escapeHtml(p.name)}</a> <span class="muted">${escapeHtml(p.version)}</span></li>`
    )
    .join("\n");

  const articles = groups
    .map((g) => {
      const items = g.packages
        .map((p) => {
          const link = p.url ? ` · <a href="${escapeHtml(p.url)}" rel="noopener">project</a>` : "";
          return (
            `<li id="pkg-${slug(`${p.name}-${p.version}`)}" data-package="${escapeHtml(p.name)}" data-version="${escapeHtml(p.version)}">` +
            `<strong>${escapeHtml(p.name)}</strong> ${escapeHtml(p.version)}` +
            `<span class="meta"> · ${escapeHtml(p.license)}${link}</span></li>`
          );
        })
        .join("\n");
      const text = licenseBlocks(g.text)
        .map((b) => `<p${b.verbatim ? ' class="verbatim"' : ""}>${escapeHtml(b.text)}</p>`)
        .join("\n");
      const source = g.textSource
        ? `<p class="src">This package does not include its license file; the text above is the project's own, copied from <a href="${escapeHtml(g.textSource)}" rel="noopener">${escapeHtml(g.textSource)}</a>.</p>`
        : "";
      return `<article><ul class="pkgs">\n${items}\n</ul>\n<div class="lic">\n${text}\n</div>\n${source}</article>`;
    })
    .join("\n");

  const software = m.packages.length
    ? `<p>The software below is bundled into this build. Each license asks that its notice travel with the software, so here they are.</p>
<ul class="index">
${index}
</ul>
${articles}`
    : `<p class="muted">${escapeHtml(m.note ?? "No third-party software is bundled into this build.")}</p>`;

  // K277: one card per technique, stacked for a phone. Wording is fixed in
  // credits.ts (uses / follows / after; nothing that reads as endorsement
  // or affiliation; no legal claims).
  const research = m.research ?? [];
  const researchCards = research
    .map((r) => {
      const refs = r.sources
        .map((s) =>
          s.url
            ? `<li><a href="${escapeHtml(s.url)}" rel="noopener">${escapeHtml(s.text)}</a></li>`
            : `<li>${escapeHtml(s.text)}</li>`
        )
        .join("");
      const files = [...new Set(r.files.map((f) => f.path))]
        .map((p) => `<code>${escapeHtml(p)}</code>`)
        .join(" ");
      return (
        `<li id="research-${slug(r.id)}"><h3>${escapeHtml(r.technique)}</h3>` +
        `<p class="by">${escapeHtml(r.by)}</p>` +
        `<ul class="refs">${refs}</ul>` +
        `<p class="row"><span class="lbl">Used for</span>${escapeHtml(r.use)}</p>` +
        `<p class="row"><span class="lbl">Where</span>${files}</p></li>`
      );
    })
    .join("\n");
  const researchSection = research.length
    ? `<h2 id="research">Research and techniques</h2>
<p>Knotmaze uses these published techniques. Each entry names who described the technique and when, where to read about it, what Knotmaze uses it for, and the source files that do. A name here credits an idea; it does not mean its author has reviewed or endorsed Knotmaze.</p>
<ul class="research">
${researchCards}
</ul>
`
    : "";
  const jumpLinks = [
    bySection("art").length ? `<a href="#art">Art and icons</a>` : "",
    bySection("music").length ? `<a href="#music">Music and sound</a>` : "",
    credits ? `<a href="#credits">Credits</a>` : "",
    `<a href="#licenses">Open-source licenses</a>`,
    research.length ? `<a href="#research">Research and techniques</a>` : "",
  ].filter(Boolean);
  const jump = jumpLinks.length > 1 ? `<p class="jump">${jumpLinks.join(" · ")}</p>\n` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Credits · Knotmaze</title>
<style>${CSS}</style>
</head>
<body>
<main>
<a class="home" href="./">← Knotmaze</a>
<h1>Credits</h1>
<p>Created by Levi Lindsey</p>
<p>© 2026 <a href="https://snoringcat.games" rel="noopener">Snoring Cat</a> LLC. All rights reserved.</p>
${jump}${artSection}${musicSection}${builtWith}${creditsSection}<h2 id="licenses">Open-source licenses</h2>
${software}
${researchSection}<p class="foot">Generated from the modules bundled into this build (Knotmaze v${escapeHtml(m.build.version)} · ${escapeHtml(m.build.sha)}).</p>
</main>
</body>
</html>
`;
}
