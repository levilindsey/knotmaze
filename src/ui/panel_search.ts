// K793: the settings panel's search, pure (no DOM; docs/design/K793.md).
// The panel hands over one entry per row (its id, label, tags, folder
// path and option labels) and asks which rows a query matches, how well,
// which of the label's characters matched (for the marks) and, when the
// label did not match, which tag or option did (the hint).
//
// THE RULES (the brief's design 2; a hand-rolled scorer, not a library:
// the Handoff has the comparison):
// - A query is words (letters and digits; case and accents ignored), and
//   every word must match the row (an AND, in any order).
// - A word matches a TOKEN exactly or as its prefix ("mino" -> minotaur).
//   Tokens are a field's words, split at spaces, punctuation and camelCase
//   humps ("pluckRipple" -> pluck, ripple), plus each adjacent pair and the
//   whole field joined ("firespeed" matches "Fire speed").
// - Typos: a word of TYPO_MIN (4)+ letters that matches no token anywhere
//   in the index may sit one edit from a token, or from a token's prefix:
//   one wrong, missing, extra or swapped letter (optimal string alignment
//   distance 1; "tempreature", "minotuar"). Only then: a word that matches
//   something exactly never fuzzes, so "speed" never finds "Seed".
// - Fields weigh label 1, tag and the row's key 0.6, option 0.3, folder
//   0.25 (name > tag > folder/option). A word scores its best weighted
//   token; a row scores the mean of its words, plus ALL_LABEL_BONUS when
//   every word matched the label and COVERAGE_BONUS times the share of
//   the label's letters matched. Ties keep panel order: deterministic.

export interface PanelRowEntry {
  /** The param key, or `btn:<title>` for a button. */
  id: string;
  /** The label shown in the panel. */
  label: string;
  tags?: readonly string[];
  /** Folder titles, outermost first. */
  folders?: readonly string[];
  /** A list row's option labels. */
  options?: readonly string[];
}

export interface PanelMatch {
  id: string;
  /** The entry's index: panel order. */
  index: number;
  score: number;
  /** The label's matched characters, as sorted [start, end) ranges. */
  ranges: Array<[number, number]>;
  /** The tags, options or key that matched words the label did not. */
  hint: string | null;
}

type FieldKind = "label" | "tag" | "key" | "option" | "folder";

/** The field weights (name > tag > folder/option). */
export const FIELD_WEIGHT: Readonly<Record<FieldKind, number>> = {
  label: 1,
  tag: 0.6,
  key: 0.6,
  option: 0.3,
  folder: 0.25,
};
/** Typos are tried for words of at least this many letters. */
export const TYPO_MIN = 4;
const ALL_LABEL_BONUS = 0.5;
const COVERAGE_BONUS = 0.25;

interface Token {
  /** Folded text: lowercase letters and digits. */
  text: string;
  /** For each character of text, its index in the source string. */
  pos: number[];
  /** Which source string of the field it came from. */
  src: number;
}

interface Field {
  kind: FieldKind;
  sources: readonly string[];
  tokens: Token[];
}

interface IndexedRow {
  entry: PanelRowEntry;
  index: number;
  fields: Field[];
  /** The label's token characters (the coverage denominator). */
  labelChars: number;
}

export interface PanelSearchIndex {
  readonly rows: readonly IndexedRow[];
}

/** One character folded: accents stripped, lowercase; "" if not a letter
 * or digit (a separator). */
function fold(c: string): string {
  let f = "";
  for (const ch of c.normalize("NFD")) {
    const code = ch.charCodeAt(0);
    // Combining diacritical marks (U+0300 to U+036F): the accents.
    if (code < 0x300 || code > 0x36f) f += ch;
  }
  f = f.toLowerCase();
  return f.length === 1 && /[a-z0-9]/.test(f) ? f : "";
}

/** A source string's words, split at separators and camelCase humps, with
 * each character's source index. */
function words(s: string, src: number): Token[] {
  const out: Token[] = [];
  let cur: Token | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const f = fold(c);
    if (!f) {
      cur = null;
      continue;
    }
    const prev = i > 0 ? s[i - 1] : "";
    const hump = cur !== null && /[A-Z]/.test(c) && /[a-z0-9]/.test(prev);
    if (cur === null || hump) {
      cur = { text: "", pos: [], src };
      out.push(cur);
    }
    cur.text += f;
    cur.pos.push(i);
  }
  return out;
}

/** Words plus each adjacent pair joined, plus the whole string joined. */
function tokenize(s: string, src: number): Token[] {
  const w = words(s, src);
  const out = w.slice();
  const join = (a: number, b: number): Token => ({
    text: w.slice(a, b).map((t) => t.text).join(""),
    pos: w.slice(a, b).flatMap((t) => t.pos),
    src,
  });
  for (let i = 0; i + 1 < w.length; i++) out.push(join(i, i + 2));
  if (w.length > 2) out.push(join(0, w.length));
  return out;
}

/** The query's words, folded (case and accents ignored). */
export function queryWords(query: string): string[] {
  return words(query.replace(/[A-Z]/g, (c) => c.toLowerCase()), 0).map(
    (t) => t.text
  );
}

/** True when a and b are at most one edit apart: one substitution,
 * insertion, deletion or swap of adjacent letters (OSA distance <= 1). */
export function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return (
      a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)
    );
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** An exact or prefix match: its score, and how many token characters it
 * covers (0 = no match). */
function strict(q: string, t: string): [number, number] {
  if (t === q) return [1, t.length];
  if (t.startsWith(q)) return [0.7 + 0.3 * (q.length / t.length), q.length];
  return [0, 0];
}

/** A match one edit off, against the whole token or a prefix of it. */
function typo(q: string, t: string): [number, number] {
  if (q.length < TYPO_MIN || t.length < 3) return [0, 0];
  if (withinOne(q, t)) return [0.6, t.length];
  // Longest prefix first: a missing letter, a wrong or swapped one, an
  // extra one.
  for (const n of [q.length + 1, q.length, q.length - 1]) {
    if (n < TYPO_MIN || n >= t.length) continue;
    if (withinOne(q, t.slice(0, n))) return [0.4 + 0.2 * (n / t.length), n];
  }
  return [0, 0];
}

export function buildPanelIndex(
  entries: readonly PanelRowEntry[]
): PanelSearchIndex {
  const rows = entries.map((entry, index): IndexedRow => {
    const field = (kind: FieldKind, sources: readonly string[]): Field => ({
      kind,
      sources,
      tokens: sources.flatMap((s, i) => tokenize(s, i)),
    });
    const fields = [
      field("label", [entry.label]),
      field("tag", entry.tags ?? []),
      // A button's key is its title, which is its label already.
      field("key", entry.id.startsWith("btn:") ? [] : [entry.id]),
      field("option", entry.options ?? []),
      field("folder", entry.folders ?? []),
    ];
    const labelChars = words(entry.label, 0).reduce(
      (n, t) => n + t.text.length,
      0
    );
    return { entry, index, fields, labelChars };
  });
  return { rows };
}

/** The rows a query matches, best first (ties in panel order), or null
 * for a query with no words (no filter). */
export function searchPanel(
  index: PanelSearchIndex,
  query: string
): PanelMatch[] | null {
  const qs = queryWords(query);
  if (qs.length === 0) return null;
  // A word fuzzes only when it matches nothing exactly anywhere.
  const fuzzy = qs.map(
    (q) =>
      q.length >= TYPO_MIN &&
      !index.rows.some((r) =>
        r.fields.some((f) => f.tokens.some((t) => strict(q, t.text)[0] > 0))
      )
  );
  const out: PanelMatch[] = [];
  for (const r of index.rows) {
    let total = 0;
    let allLabel = true;
    let ok = true;
    const covered = new Set<number>();
    const hints: string[] = [];
    for (let w = 0; w < qs.length && ok; w++) {
      const q = qs[w];
      const match = fuzzy[w] ? typo : strict;
      let best = 0;
      let bestField: Field | null = null;
      let bestSrc = 0;
      let inLabel = false;
      for (const f of r.fields) {
        const weight = FIELD_WEIGHT[f.kind];
        for (const t of f.tokens) {
          const [s, n] = match(q, t.text);
          if (s <= 0) continue;
          if (f.kind === "label") {
            inLabel = true;
            for (let k = 0; k < n; k++) covered.add(t.pos[k]);
          }
          if (s * weight > best) {
            best = s * weight;
            bestField = f;
            bestSrc = t.src;
          }
        }
      }
      if (best <= 0 || bestField === null) {
        ok = false;
        break;
      }
      total += best;
      if (!inLabel) {
        allLabel = false;
        // A folder shows its own title above the row: no hint for it.
        if (bestField.kind !== "folder") {
          const h = bestField.sources[bestSrc];
          if (!hints.includes(h)) hints.push(h);
        }
      }
    }
    if (!ok) continue;
    const coverage = r.labelChars > 0 ? covered.size / r.labelChars : 0;
    const score =
      total / qs.length +
      (allLabel ? ALL_LABEL_BONUS : 0) +
      COVERAGE_BONUS * coverage;
    out.push({
      id: r.entry.id,
      index: r.index,
      score,
      ranges: toRanges(covered),
      hint: hints.length > 0 ? hints.join(", ") : null,
    });
  }
  out.sort((a, b) => b.score - a.score || a.index - b.index);
  return out;
}

/** Sorted character indices as [start, end) ranges. */
function toRanges(set: Set<number>): Array<[number, number]> {
  const idx = [...set].sort((a, b) => a - b);
  const out: Array<[number, number]> = [];
  for (const i of idx) {
    const last = out[out.length - 1];
    if (last && last[1] === i) last[1] = i + 1;
    else out.push([i, i + 1]);
  }
  return out;
}
