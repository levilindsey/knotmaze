import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// K7 stage 1 (docs/design/K7_worker.md): every write main.ts makes to the
// physics goes through the PhysicsHost (src/physics/physics_host.ts), so a
// worker host can replace the in-thread one without a hunt for stray writes
// (from stage 3 `host.view` is the worker's main-thread mirror, where a
// write would silently do nothing). main may READ the system - `host.view`
// and its alias `ps` - but never build one, touch a mutator on it, or
// assign into it.
//
// The scan parses main.ts with the TypeScript parser, so a comment or a
// string can neither hide a call nor fake one. "The system" is any
// expression that names it: `host.view`, the result of `host.build(...)`, a
// variable, parameter or field annotated with ParticleSystem, and every
// alias assigned from one of those (`const sys = ps!`). Not caught: a
// system reached through an unannotated callback parameter, or handed to a
// helper that writes it; `view` is read-only by contract there.
//
// K5 (docs/design/K5_K6_split.md) moves main.ts's code into src/app/, which
// reaches the system through fields declared in another file: the
// SceneRef's `ps` (`scene.ps`, `ctx.scene.ps`) and the probe context's
// `host` (`ctx.host.view`). So the scan covers main.ts and every file under
// src/app/, and collects the fields annotated with ParticleSystem or a host
// type across all of them: an access to such a field, or a destructured
// copy of one (`const { host } = deps`), names the system or the host in
// every scanned file. Fields match by name, so an unrelated `.ps` or
// `.host` counts too; nothing writes through one today.

const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const MAIN = join(SRC, "main.ts");
const APP = join(SRC, "app");

// The scanned files, keyed by their path under src/ ("main.ts",
// "app/probe_hooks.ts"): main.ts and every .ts file under src/app/.
function scannedFiles(): Map<string, string> {
  const files = new Map([["main.ts", readFileSync(MAIN, "utf8")]]);
  const app = readdirSync(APP, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".ts"))
    .sort();
  for (const f of app) {
    files.set(`app/${f.replace(/\\/g, "/")}`, readFileSync(join(APP, f), "utf8"));
  }
  return files;
}

// ParticleSystem's mutators: the input, the step, the reset, the build-time
// surgery. A reference counts, not only a call (`ps.step.call(...)`,
// `const f = ps.step`, a patch `ps.step = ...`).
const MUTATORS = new Set([
  "step",
  "grab",
  "grabAt",
  "dragTo",
  "release",
  "tug",
  "reset",
  "openChain",
  "addJunction",
]);
// Mutating methods of the arrays a system holds (positions, chains, ...).
const ARRAY_MUTATORS = new Set([
  "set",
  "fill",
  "copyWithin",
  "sort",
  "reverse",
  "splice",
  "push",
  "pop",
  "shift",
  "unshift",
]);
const ASSIGNMENTS = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);
const SYSTEM_TYPE = /\bParticleSystem\b/;
const HOST_TYPE = /\b(PhysicsHost|InThreadHost|PhysicsCore)\b/;

function strip(e: ts.Expression): ts.Expression {
  for (;;) {
    if (
      ts.isParenthesizedExpression(e) ||
      ts.isNonNullExpression(e) ||
      ts.isAsExpression(e) ||
      ts.isSatisfiesExpression(e) ||
      ts.isTypeAssertionExpression(e)
    ) {
      e = e.expression;
    } else {
      return e;
    }
  }
}

function walk(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile(
    "main.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

// The names of the fields annotated with a system or a host type.
interface Fields {
  systems: Set<string>;
  hosts: Set<string>;
}

// The annotated fields across `sources`: interface and type-literal
// members, class fields and getters (`readonly ps: ParticleSystem | null`
// in the SceneRef, `host: PhysicsHost` in the probe context).
function annotatedFields(sources: Iterable<string>): Fields {
  const fields: Fields = { systems: new Set(), hosts: new Set() };
  for (const source of sources) {
    const sf = parse(source);
    walk(sf, (n) => {
      if (
        !ts.isPropertySignature(n) &&
        !ts.isPropertyDeclaration(n) &&
        !ts.isGetAccessorDeclaration(n)
      ) {
        return;
      }
      const name = n.name;
      if (!n.type || !(ts.isIdentifier(name) || ts.isStringLiteral(name))) return;
      const type = n.type.getText(sf);
      if (SYSTEM_TYPE.test(type)) fields.systems.add(name.text);
      if (HOST_TYPE.test(type)) fields.hosts.add(name.text);
    });
  }
  return fields;
}

// Every violation of the seam in `source`, as "line: what: code". `fields`
// are the annotated fields of every scanned file (by default, this one's).
function seamViolations(
  source: string,
  fields: Fields = annotatedFields([source])
): string[] {
  const sf = parse(source);
  const systems = new Set<string>();
  const hosts = new Set<string>();

  const isHost = (e: ts.Expression): boolean => {
    const s = strip(e);
    if (ts.isIdentifier(s)) return hosts.has(s.text);
    if (ts.isPropertyAccessExpression(s)) return fields.hosts.has(s.name.text);
    if (ts.isNewExpression(s)) {
      const c = strip(s.expression);
      return ts.isIdentifier(c) && HOST_TYPE.test(c.text);
    }
    return false;
  };
  const isSystem = (e: ts.Expression): boolean => {
    const s = strip(e);
    if (ts.isIdentifier(s)) return systems.has(s.text);
    if (ts.isPropertyAccessExpression(s)) {
      return (
        fields.systems.has(s.name.text) ||
        (s.name.text === "view" && isHost(s.expression))
      );
    }
    if (ts.isCallExpression(s)) {
      const c = strip(s.expression);
      return (
        ts.isPropertyAccessExpression(c) &&
        c.name.text === "build" &&
        isHost(c.expression)
      );
    }
    if (ts.isBinaryExpression(s)) {
      const op = s.operatorToken.kind;
      if (
        op === ts.SyntaxKind.QuestionQuestionToken ||
        op === ts.SyntaxKind.BarBarToken
      ) {
        return isSystem(s.left) || isSystem(s.right);
      }
      if (op === ts.SyntaxKind.AmpersandAmpersandToken) return isSystem(s.right);
      if (op === ts.SyntaxKind.EqualsToken) return isSystem(s.right);
      return false;
    }
    if (ts.isConditionalExpression(s)) {
      return isSystem(s.whenTrue) || isSystem(s.whenFalse);
    }
    return false;
  };
  // A member chain rooted at the system, at least one access deep:
  // ps.x, ps.chains[i], host.view.crossings[0].over.f.
  const reachesSystem = (e: ts.Expression): boolean => {
    let s = strip(e);
    while (ts.isPropertyAccessExpression(s) || ts.isElementAccessExpression(s)) {
      if (isSystem(s.expression)) return true;
      s = strip(s.expression);
    }
    return false;
  };

  // The names that hold a system or a host, to a fixpoint (an alias of an
  // alias, declared in any order).
  let changed = true;
  const add = (set: Set<string>, name: string): void => {
    if (!set.has(name)) {
      set.add(name);
      changed = true;
    }
  };
  while (changed) {
    changed = false;
    walk(sf, (n) => {
      if (
        ts.isVariableDeclaration(n) ||
        ts.isParameter(n) ||
        ts.isPropertyDeclaration(n)
      ) {
        const type = n.type?.getText(sf) ?? "";
        if (ts.isIdentifier(n.name)) {
          if (SYSTEM_TYPE.test(type) || (n.initializer && isSystem(n.initializer))) {
            add(systems, n.name.text);
          }
          if (HOST_TYPE.test(type) || (n.initializer && isHost(n.initializer))) {
            add(hosts, n.name.text);
          }
        } else if (ts.isObjectBindingPattern(n.name)) {
          // `const { view } = host`, and a destructured field:
          // `const { ps } = scene`, `const { host } = deps`, `({ ps }: SceneRef)`.
          const fromHost = n.initializer !== undefined && isHost(n.initializer);
          for (const el of n.name.elements) {
            const key = el.propertyName ?? el.name;
            if (!ts.isIdentifier(key) || !ts.isIdentifier(el.name)) continue;
            if ((fromHost && key.text === "view") || fields.systems.has(key.text)) {
              add(systems, el.name.text);
            }
            if (fields.hosts.has(key.text)) add(hosts, el.name.text);
          }
        }
      }
      if (
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        const left = strip(n.left);
        if (ts.isIdentifier(left)) {
          if (isSystem(n.right)) add(systems, left.text);
          if (isHost(n.right)) add(hosts, left.text);
        }
      }
    });
  }

  const out: string[] = [];
  const report = (n: ts.Node, what: string): void => {
    const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
    out.push(`${line}: ${what}: ${n.getText(sf).split("\n")[0]}`);
  };
  walk(sf, (n) => {
    // A new ParticleSystem outside the host.
    if (ts.isNewExpression(n)) {
      const c = strip(n.expression);
      const name = ts.isIdentifier(c)
        ? c.text
        : ts.isPropertyAccessExpression(c)
          ? c.name.text
          : "";
      if (name === "ParticleSystem") report(n, "builds a ParticleSystem");
    }
    // ParticleSystem imported as a value (only `import type` may name it).
    if (ts.isImportDeclaration(n) && n.importClause && !n.importClause.isTypeOnly) {
      const spec = (n.moduleSpecifier as ts.StringLiteral).text;
      const bindings = n.importClause.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) {
          const imported = (el.propertyName ?? el.name).getText(sf);
          if (imported === "ParticleSystem" && !el.isTypeOnly) {
            report(el, "imports ParticleSystem as a value");
          }
        }
      } else if (
        bindings &&
        ts.isNamespaceImport(bindings) &&
        /particle_system$/.test(spec)
      ) {
        report(n, "imports the particle system module as a namespace");
      }
    }
    // A mutator on the system, called or not: ps.step(...), ps!.grab(...),
    // host.view.release(), ps["reset"](), ps.step.call(...), ps.step = f.
    if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) {
      const name = ts.isPropertyAccessExpression(n)
        ? n.name.text
        : ts.isStringLiteralLike(n.argumentExpression)
          ? n.argumentExpression.text
          : "";
      if (MUTATORS.has(name) && isSystem(n.expression)) {
        report(n, `touches the system's ${name}`);
      }
    }
    // An array mutator on the system's state: ps.positions.set(...).
    if (ts.isCallExpression(n)) {
      const c = strip(n.expression);
      if (
        ts.isPropertyAccessExpression(c) &&
        ARRAY_MUTATORS.has(c.name.text) &&
        reachesSystem(c.expression)
      ) {
        report(n, "mutates the system's state");
      }
    }
    // An assignment into the system: ps.x = v, ps.positions[i] += d, ps.n++.
    let target: ts.Expression | undefined;
    if (ts.isBinaryExpression(n) && ASSIGNMENTS.has(n.operatorToken.kind)) {
      target = n.left;
    } else if (
      (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
      (n.operator === ts.SyntaxKind.PlusPlusToken ||
        n.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      target = n.operand;
    } else if (ts.isDeleteExpression(n)) {
      target = n.expression;
    }
    if (target && reachesSystem(target)) report(n, "writes into the system");
  });
  return out;
}

// The scan: every scanned file against the fields of all of them, as
// "file:line: what: code".
function scan(files: Map<string, string>): string[] {
  const fields = annotatedFields(files.values());
  const out: string[] = [];
  for (const [name, source] of files) {
    for (const v of seamViolations(source, fields)) out.push(`${name}:${v}`);
  }
  return out;
}

// `files` with `line` appended to `name`.
function planted(files: Map<string, string>, name: string, line: string) {
  return new Map(files).set(name, `${files.get(name)}\n${line}\n`);
}

describe("K7 host seam: main.ts and src/app write the physics only through the host", () => {
  it("main.ts and src/app have no write to the system outside the host", () => {
    expect(scan(scannedFiles())).toEqual([]);
  });

  it("the scan sees main's system and host (it is not scanning nothing)", () => {
    const files = scannedFiles();
    // Re-run the name collection through a probe: a write planted at the end
    // of main.ts on each of main's names must be reported.
    for (const line of [
      "scene.ps!.step(1);",
      "host.view!.grab(1, 2);",
      "scene.ps!.positions[0] = 1;",
    ]) {
      expect(scan(planted(files, "main.ts", line)).length, line).toBe(1);
    }
  });

  it("the scan covers src/app and sees the SceneRef's and the probe context's fields", () => {
    const files = scannedFiles();
    expect([...files.keys()]).toEqual(
      expect.arrayContaining([
        "main.ts",
        "app/scene_ref.ts",
        "app/stamp.ts",
        "app/probe_hooks.ts",
      ])
    );
    const fields = annotatedFields(files.values());
    expect(fields.systems.has("ps"), "SceneRef.ps").toBe(true);
    expect(fields.hosts.has("host"), "ProbeCtx.host").toBe(true);
    // A write planted at the end of the probe hooks, through each field.
    for (const line of [
      "ctx.scene.ps!.step(1);",
      "ctx.host.view!.grab(1, 2);",
      "ctx.scene.ps!.positions[0] = 1;",
    ]) {
      expect(scan(planted(files, "app/probe_hooks.ts", line)).length, line).toBe(1);
    }
  });

  it("reports writes through a SceneRef or probe-context field (src/app)", () => {
    // The fields are declared in one file and used in another, as in src/app.
    const fields = annotatedFields([
      'import type { ParticleSystem } from "../physics/particle_system";\n' +
        'import type { PhysicsHost } from "../physics/physics_host";\n' +
        "export interface SceneRef { readonly ps: ParticleSystem | null; }\n" +
        "export interface ProbeCtx {\n" +
        "  ps: ParticleSystem;\n" +
        "  host: PhysicsHost;\n" +
        "  scene: SceneRef;\n" +
        "}\n",
    ]);
    const bad = [
      "ctx.ps.step = () => {};",
      "scene.ps!.positions.set(other);",
      "ctx.scene.ps?.grab(1, 2);",
      "ctx.ps.simTime += 1;",
      "ctx.host.view!.release();",
      "ctx.host.build(graph, params).reset();",
      "const { ps } = ctx; ps.dragTo(1, 2);",
      "const { host } = deps; host.view!.tug(0, 0, 1, 0, 1, 1);",
      "function f3({ ps }: SceneRef) { ps!.chains.push([]); }",
      "const sys = ctx.scene.ps!; sys.crossings[0].over.f = 2;",
    ];
    for (const line of bad) {
      const source =
        'import type { ProbeCtx } from "./probe_hooks";\n' +
        'import type { SceneRef } from "./scene_ref";\n' +
        "export function hooks(ctx: ProbeCtx, scene: SceneRef): void {\n" +
        `  ${line}\n` +
        "}\n";
      expect(seamViolations(source, fields).length, line).toBeGreaterThan(0);
    }
    // Reads, and the host's own calls, through the same fields.
    const ok =
      "const t = scene.ps?.simTime ?? 0; const n = ctx.scene.ps!.chains.length;\n" +
      "const sys = ctx.scene.ps; if (sys) out.set(sys.positions);\n" +
      "ctx.host.freeze(true); ctx.host.stepUntil(1, tuning); ctx.host.sync();\n" +
      "ctx.host.reset(); ctx.host.release(); ctx.host.tug(0, 0, 1, 0, 1, 1);\n" +
      "const { host } = deps; host.grab(1, 2, 3); const k = host.stats().host;\n";
    expect(seamViolations(ok, fields)).toEqual([]);
  });

  it("reports each kind of write", () => {
    const pre =
      'import type { ParticleSystem } from "./physics/particle_system";\n' +
      'import { InThreadHost } from "./physics/physics_host";\n' +
      "const host = new InThreadHost();\n" +
      "let ps: ParticleSystem | null = null;\n";
    const bad = [
      "ps!.step(1 / 60);",
      "ps?.dragTo(1, 2);",
      "(ps as ParticleSystem).tug(0, 0, 1, 0, 1, 1);",
      'ps!["reset"]();',
      "ps!.step.call(ps, 1);",
      "const f = ps!.release;",
      "host.view!.grabAt(3, 1, 2);",
      "const sys = ps!; sys.grab(1, 2);",
      "const a = ps; const b = a; b!.release();",
      "let s2; s2 = host.view; s2!.reset();",
      "const { view } = host; view!.step(1);",
      "ps = host.build(g, p); ps.step(1);",
      "function f2(q: ParticleSystem) { q.dragTo(0, 0); }",
      "new ParticleSystem(graph);",
      "ps!.positions[0] = 1;",
      "ps!.simTime += 1;",
      "ps!.crossings[0].over.f = 2;",
      "host.view!.positions.set(other);",
      "ps!.chains.push([]);",
      "ps!.grabbed++;",
      "delete (ps as any).x;",
    ];
    for (const line of bad) {
      expect(seamViolations(pre + line + "\n").length, line).toBeGreaterThan(0);
    }
    expect(
      seamViolations('import { ParticleSystem } from "./physics/particle_system";\n')
    ).toHaveLength(1);
    expect(
      seamViolations('import * as P from "./physics/particle_system";\n')
    ).toHaveLength(1);
  });

  it("lets reads, the host's own calls and unrelated names through", () => {
    const ok =
      'import type { ParticleSystem, PhysicsTuning } from "./physics/particle_system";\n' +
      'import { InThreadHost } from "./physics/physics_host";\n' +
      "const host = new InThreadHost();\n" +
      "let ps: ParticleSystem | null = null;\n" +
      "ps = host.build(graph, params);\n" +
      "host.grab(ps.nearest(1, 2, 0.7), 1, 2);\n" +
      "host.dragTo(1, 2); host.release(); host.reset(); host.tug(0, 0, 1, 0, 1, 1);\n" +
      "host.frame(1 / 60, tuning, 0, true, 8);\n" +
      "const sys = ps!; const t = sys.simTime; sys.pointOnChain(0, 1, out, 0);\n" +
      "out.set(ps!.positions); const n = ps!.chains[0].length;\n" +
      "const xs = ps!.crossings.map((c) => c.over.f);\n" +
      "songSched.reset(); clock.reset(); heldKeys.release(id); fabricController?.reset();\n" +
      "// ps.step(1); a comment is not a call\n" +
      'const msg = "ps.step(1) in a string is not a call";\n';
    expect(seamViolations(ok)).toEqual([]);
  });
});
