import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tr, LANGUAGE } from '../js/i18n.js';
import { VERSION } from '../js/data.js';

// Committed output keeps GitHub Pages buildless and provides English before JS loads.
// Run after editing templates/index.html or its copy in js/locales/en.js.
export async function renderHTML() {
  const template = await readFile(new URL('../templates/index.html', import.meta.url), 'utf8');
  const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return template.replace(/\{\{([\w.-]+)\}\}/g, (_, key) => escape(key === 'language' ? LANGUAGE : key === 'version' ? VERSION : tr(key)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = await renderHTML(), target = new URL('../index.html', import.meta.url);
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== html) throw new Error('Realm index.html is stale. Run node games/realm/scripts/localize-html.mjs');
  } else await writeFile(target, html);
}
