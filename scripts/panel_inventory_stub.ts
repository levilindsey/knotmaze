// K339: a recording stand-in for Tweakpane, so scripts/panel_inventory.ts can
// run the real buildPanel() in Node and read back every folder, row and
// button it makes. scripts/panel_inventory.vite.config.mjs aliases the
// "tweakpane" import to this file. Only the slice of the API that
// src/ui/tweakpane_panel.ts uses is here: addFolder, addBinding, addButton,
// on(...), hidden, refresh(), element, children.

type Handler = (ev?: unknown) => void;

export interface RecFolder {
  kind: "folder";
  title: string;
  expanded: boolean;
  parent: RecFolder | null;
  api: FolderApi;
}
export interface RecBinding {
  kind: "binding";
  parent: RecFolder | null;
  obj: Record<string, unknown>;
  key: string;
  opts: Record<string, unknown> | undefined;
  api: BindingApi;
}
export interface RecButton {
  kind: "button";
  parent: RecFolder | null;
  title: string;
  label?: string;
  api: ButtonApi;
}
export type RecItem = RecFolder | RecBinding | RecButton;

// Everything the panel built, in creation order.
export const record: { items: RecItem[] } = { items: [] };

// A DOM element that accepts anything: properties are stored, every unknown
// method returns another stub element, classList and dataset work, and the
// parent is null (the panel then skips its scroll-wrapper setup).
export function stubElement(): Record<string, unknown> {
  const classes = new Set<string>();
  const store: Record<string | symbol, unknown> = {
    style: {},
    dataset: {},
    classList: {
      add: (...c: string[]) => c.forEach((x) => classes.add(x)),
      remove: (...c: string[]) => c.forEach((x) => classes.delete(x)),
      contains: (c: string) => classes.has(c),
      toggle: (c: string, on?: boolean) => {
        const v = on ?? !classes.has(c);
        if (v) classes.add(c);
        else classes.delete(c);
        return v;
      },
    },
    parentElement: null,
    title: "",
  };
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === "symbol") return undefined;
      if (k === "querySelectorAll") return () => [];
      if (k === "then") return undefined;
      return () => stubElement();
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  }) as Record<string, unknown>;
}

export class BindingApi {
  element = stubElement();
  hidden = false;
  handlers: Handler[] = [];
  private shown: unknown;
  constructor(
    readonly obj: Record<string, unknown>,
    readonly key: string
  ) {
    this.shown = obj[key];
  }
  on(event: string, cb: Handler): this {
    if (event === "change") this.handlers.push(cb);
    return this;
  }
  // Tweakpane 4 fires the change handlers whenever the shown value changes.
  refresh(): void {
    const v = this.obj[this.key];
    if (v === this.shown) return;
    this.shown = v;
    for (const h of this.handlers) h({ value: v, last: true });
  }
}

export class ButtonApi {
  element = stubElement();
  hidden = false;
  handlers: Handler[] = [];
  constructor(public title: string) {}
  on(event: string, cb: Handler): this {
    if (event === "click") this.handlers.push(cb);
    return this;
  }
}

class Container {
  element = stubElement();
  hidden = false;
  children: unknown[] = [];
  constructor(readonly rec: RecFolder | null) {}
  addFolder(opts: { title: string; expanded?: boolean }): FolderApi {
    const rec = {
      kind: "folder",
      title: opts.title,
      expanded: opts.expanded ?? true,
      parent: this.rec,
    } as RecFolder;
    rec.api = new FolderApi(rec);
    this.children.push(rec.api);
    record.items.push(rec);
    return rec.api;
  }
  addBinding(
    obj: Record<string, unknown>,
    key: string,
    opts?: Record<string, unknown>
  ): BindingApi {
    const api = new BindingApi(obj, key);
    this.children.push(api);
    record.items.push({ kind: "binding", parent: this.rec, obj, key, opts, api });
    return api;
  }
  addButton(opts: { title: string; label?: string }): ButtonApi {
    const api = new ButtonApi(opts.title);
    this.children.push(api);
    record.items.push({
      kind: "button",
      parent: this.rec,
      title: opts.title,
      label: opts.label,
      api,
    });
    return api;
  }
  refresh(): void {
    for (const it of record.items) if (it.kind === "binding") it.api.refresh();
  }
}

export class FolderApi extends Container {
  get title(): string {
    return this.rec?.title ?? "";
  }
  get expanded(): boolean {
    return this.rec?.expanded ?? true;
  }
  set expanded(v: boolean) {
    if (this.rec) this.rec.expanded = v;
  }
  foldHandlers: Handler[] = [];
  on(event: string, cb: Handler): this {
    if (event === "fold") this.foldHandlers.push(cb);
    return this;
  }
}

export class Pane extends Container {
  constructor() {
    super(null);
  }
}
