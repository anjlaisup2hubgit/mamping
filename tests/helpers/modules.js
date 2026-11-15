import { readFile } from "node:fs/promises";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

// Load real small modules with only their outside services replaced.
export async function modules(entry, { globals = {}, mocks = {} } = {}) {
  const context = createContext({ console, setTimeout, clearTimeout, Event, TypeError, ...globals });
  const cache = new Map();
  async function load(url) {
    if (cache.has(url)) return cache.get(url);
    let module;
    if (url in mocks || url.startsWith("node:")) {
      const exports = url in mocks ? mocks[url] : await import(url);
      module = new SyntheticModule(Object.keys(exports), function () {
        for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
      }, { context, identifier: url });
    } else module = new SourceTextModule(await readFile(new URL(url), "utf8"), { context, identifier: url });
    cache.set(url, module);
    await module.link((specifier, parent) => load(new URL(specifier, parent.identifier).href));
    return module;
  }
  const module = await load(entry.href);
  await module.evaluate();
  return { exports: module.namespace, context, load };
}
