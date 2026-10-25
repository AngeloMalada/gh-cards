// Builds profile/README.md from profile/README.template.md using .env (username, card host, links),
// then renders it through GitHub's own markdown API (same sanitizer as a real README) into
// profile/preview.html, with card URLs pointed at the local server. Run `npm run dev` alongside it.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PAT = process.env.PAT_1;
if (!PAT) { console.error("PAT_1 is required (put it in .env)"); process.exit(1); }

const LOCAL_URL = `http://localhost:${process.env.PORT ?? 9000}`;
const PUBLIC_URL = (process.env.CARDS_URL || LOCAL_URL).replace(/\/$/, "");
const user = process.env.GITHUB_USER?.trim() || (process.env.WHITELIST ?? "").split(",")[0]?.trim() || "you";

// Links come from .env; any that aren't set are left out rather than pointing at "#".
const github = `https://github.com/${user}`;
const linkedin = process.env.LINKEDIN_URL?.trim();
const website = process.env.WEBSITE_URL?.trim();
const email = process.env.EMAIL?.trim();
const links = (pairs: [string, string | undefined][]) =>
  pairs.filter(([, href]) => href).map(([label, href]) => `<a href="${href}">${label}</a>`).join(" · ");

const readme = readFileSync("profile/README.template.md", "utf8")
  .replaceAll("{{CARDS_URL}}", PUBLIC_URL)
  .replaceAll("{{USER}}", user)
  .replaceAll("{{LINKS}}", links([["GitHub", github], ["LinkedIn", linkedin], ["Website", website]]))
  .replaceAll("{{CONTACT_LINKS}}", links([["Email", email && `mailto:${email}`], ["LinkedIn", linkedin], ["GitHub", github]]));
writeFileSync("profile/README.md", readme);
console.log(`wrote ${resolve("profile/README.md")}`);

// Cache-bust local card URLs so the browser doesn't show cards cached from an earlier run.
const v = Date.now();
const md = readme
  .replaceAll(PUBLIC_URL, LOCAL_URL)
  .replace(new RegExp(`${LOCAL_URL}/api/[^"\\s)]*`, "g"), (u) => `${u}${u.includes("?") ? "&" : "?"}v=${v}`);

const res = await fetch("https://api.github.com/markdown", {
  method: "POST",
  headers: { Authorization: `bearer ${PAT}`, Accept: "application/vnd.github+json", "User-Agent": "gh-cards" },
  body: JSON.stringify({ text: md, mode: "markdown" }),
});
if (!res.ok) { console.error(`GitHub markdown API: ${res.status} ${await res.text()}`); process.exit(1); }

// GitHub rewrites image URLs to its camo proxy, which can't reach localhost; point them back at the originals.
const html = (await res.text()).replace(
  /src="https:\/\/camo\.githubusercontent\.com\/[^"]*"([^>]*?)data-canonical-src="([^"]*)"/g,
  'src="$2"$1data-canonical-src="$2"',
);

writeFileSync("profile/preview.html", `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>README preview</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-dark.css">
<style>
  body { margin: 0; background: #0d1117; padding: 32px 16px; }
  .box { max-width: 896px; margin: 0 auto; border: 1px solid #3d444d; border-radius: 6px; }
  .head { padding: 12px 24px; font: 12px -apple-system, "Segoe UI", sans-serif; color: #9198a1; border-bottom: 1px solid #3d444d; }
  .markdown-body { padding: 24px; }
</style></head>
<body><div class="box"><div class="head">${user} / README.md</div><article class="markdown-body">
${html}
</article></div></body></html>
`);
console.log(`wrote ${resolve("profile/preview.html")}`);
