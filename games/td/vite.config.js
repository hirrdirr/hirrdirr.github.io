// Development only. Production remains ordinary Jekyll + native ES modules.
import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
export default defineConfig({
  root,
  server: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    allowedHosts: ["terminal.local"],
  },
  plugins: [
    {
      name: "td-jekyll-preview",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/__td-qa") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(
              `<!doctype html><html><head><title>Core Defense layout QA</title><style>body{margin:0;padding:16px;background:#20252a;color:white;font:16px system-ui}iframe{display:block;border:1px solid #718375;height:1100px;margin-top:16px;background:white}select{font:inherit;padding:8px}</style></head><body><label>Viewport <select aria-label="Viewport" onchange="document.querySelector('iframe').style.width=this.value+'px'"><option>320</option><option selected>390</option><option>768</option><option>1024</option></select></label><iframe title="Responsive game preview" src="/games/td/" style="width:390px"></iframe></body></html>`,
            );
            return;
          }
          if (req.url === "/") {
            res.writeHead(302, { Location: "/games/td/" });
            res.end();
            return;
          }
          next();
        });
      },
      transformIndexHtml: {
        order: "pre",
        handler(html, ctx) {
          if (!ctx.path.startsWith("/games/td")) return html;
          const content = html.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
          const nav = readFileSync(
            root + "_includes/topbar.html",
            "utf8",
          ).replace(/{{\s*page.navlabel[^}]*}}/g, "games / core defense");
          return readFileSync(root + "_layouts/default.html", "utf8")
            .replace(/{{\s*page.title[^}]*}}/g, "Core Defense · Tower Defense")
            .replace("{% include topbar.html %}", nav)
            .replace("{{ content }}", content);
        },
      },
    },
  ],
});
