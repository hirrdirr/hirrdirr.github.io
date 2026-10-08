import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const files = [
  "menu.js",
  "td.js",
  ...readdirSync(new URL("js/", root)).map((f) => `js/${f}`),
];

test("production entry points and transitive module imports resolve without a bundler", () => {
  assert.match(html, /permalink: \/games\/td\//);
  assert.match(html, /<script type="module" src="\.\/menu\.js"><\/script>/);
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) {
    assert.ok(existsSync(new URL(match[1], root)), match[1]);
  }
  for (const file of files) {
    const url = new URL(file, root);
    for (const match of readFileSync(url, "utf8").matchAll(
      /(?:from\s+|import\(\s*)["']([^"']+)["']/g,
    )) {
      assert.ok(
        match[1].startsWith("./"),
        `Browser import must be relative: ${file}: ${match[1]}`,
      );
      assert.ok(existsSync(new URL(match[1], url)), `${file}: ${match[1]}`);
    }
  }
});

test("static UI bindings resolve to unique elements in the Jekyll entry page", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size, "Duplicate HTML IDs");
  // Inspector controls are generated only when a tower is selected.
  const generated = new Set(
    [
      ...readFileSync(new URL("js/ui.js", root), "utf8").matchAll(
        /\bid="([a-z-]+)"/g,
      ),
    ].map((m) => m[1]),
  );
  for (const file of ["menu.js", "td.js", "js/ui.js"]) {
    for (const match of readFileSync(new URL(file, root), "utf8").matchAll(
      /(?:\$|getElementById)\("([^"]+)"\)/g,
    )) {
      assert.ok(
        ids.includes(match[1]) || generated.has(match[1]),
        `${file}: missing #${match[1]}`,
      );
    }
  }
});
