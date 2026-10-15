import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const buildToken = "{{ site.time | date: '%s' }}";
const modules = ["menu.js", "td.js", ...readdirSync(new URL("js/", root))
  .filter((name) => name.endsWith(".js")).map((name) => `js/${name}`)];
const importMapSource = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];
const importMap = (build) => JSON.parse(importMapSource.replaceAll(buildToken, build)).imports;

test("every production module and stylesheet shares the current deployment version", () => {
  assert.ok(importMapSource, "Import map must precede the module entry point");
  assert.ok(html.indexOf('type="importmap"') < html.indexOf('type="module"'));
  const imports = importMap("release-a");
  assert.deepEqual(Object.keys(imports).sort(), modules.map((name) => `./${name}`).sort());
  for (const [specifier, target] of Object.entries(imports)) {
    assert.equal(target, `${specifier}?v=release-a`);
    assert.notEqual(target, importMap("release-b")[specifier], "A new build must bypass old cache entries");
  }
  const styles = [...html.replaceAll(buildToken, "release-a")
    .matchAll(/<link rel="stylesheet" href="([^\"]+)"/g)].map((m) => m[1]);
  assert.equal(styles.length, 4);
  for (const href of styles) assert.equal(new URL(href, root).search, "?v=release-a");
  // An unversioned script src would bypass the import map entirely.
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/);
});

test("static, side-effect and delayed imports all resolve to the same versioned graph", () => {
  const imports = importMap("release-a");
  const resolve = (specifier, parent) => {
    const url = new URL(specifier, parent);
    return imports[`./${url.pathname.slice(root.pathname.length)}`];
  };
  for (const file of modules) {
    const parent = new URL(imports[`./${file}`], root);
    const source = readFileSync(new URL(file, root), "utf8");
    for (const match of source.matchAll(/(?:from\s+|import\s*(?:\(\s*)?)["']([^"']+)["']/g)) {
      assert.ok(resolve(match[1], parent), `${file}: unversioned dependency ${match[1]}`);
    }
  }
  assert.equal(resolve("./td.js", new URL(imports["./menu.js"], root)), "./td.js?v=release-a");
  for (const file of ["td.js", "js/map-theme.js", "js/tower-selection-visuals.js"]) {
    const specifier = file === "td.js" ? "./js/renderer.js" : "./renderer.js";
    assert.equal(resolve(specifier, new URL(imports[`./${file}`], root)), "./js/renderer.js?v=release-a");
  }
});

test("versioned engine and selection renderer reach the map before and after restart", async (t) => {
  const imports = importMap("startup-regression");
  const mapping = new Map(Object.entries(imports).map(([from, to]) =>
    [new URL(from, root).href, new URL(to, root).href]));
  const loaded = new Set();
  // Apply the page's exact URL remapping to real modules. Any unversioned load
  // models a stale cache hit, the regression that previously blanked the map.
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const absolute = new URL(specifier, context.parentURL || root).href;
      return nextResolve(mapping.get(absolute) || specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith(root.href)) {
        assert.equal(new URL(url).search, "?v=startup-regression", `Stale module: ${url}`);
        loaded.add(url);
      }
      return nextLoad(url, context);
    },
  });
  t.after(() => hooks.deregister());
  const { Game } = await import(new URL("js/engine.js", root).href);
  const { Renderer } = await import(new URL("js/renderer.js", root).href);
  const { getTowerSprites } = await import(new URL("js/tower-sprites.js", root).href);
  const previousImage = Object.getOwnPropertyDescriptor(globalThis, "Image");
  Object.defineProperty(globalThis, "Image", {
    value: class { set src(value) {} }, configurable: true,
  });
  t.after(() => previousImage
    ? Object.defineProperty(globalThis, "Image", previousImage)
    : delete globalThis.Image);
  const sprites = getTowerSprites();
  t.mock.method(sprites, "outline", () => {});
  let drawn = 0;
  t.mock.method(Renderer.prototype, "render", () => { drawn++; });
  await import(new URL("js/tower-selection-visuals.js", root).href);
  const game = new Game();
  const input = { hoverId: null, placing: null, cursor: null };
  const ctx = { strokeRect() {}, save() {}, restore() {}, setTransform() {} };
  const renderer = { ctx, canvas: { width: 960, height: 600 } };
  Renderer.prototype.render.call(renderer, game, input, 0);
  game.reset();
  Renderer.prototype.render.call(renderer, game, input, 0);
  assert.equal(drawn, 2, "The selection wrapper must reach the map on the first frame");
  assert.deepEqual(game.traps, []);
  assert.equal([...loaded].filter((url) => new URL(url).pathname.endsWith("/renderer.js")).length, 1,
    "All visual extensions must patch the same Renderer class");
});
