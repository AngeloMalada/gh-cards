import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { fetchStats, fetchRepos, type Stats, type Repo } from "./github.js";
import { pickTheme } from "./theme.js";
import { statsCard } from "./cards/stats.js";
import { stackCard } from "./cards/stack.js";
import { heatmapCard } from "./cards/heatmap.js";
import { projectsCard } from "./cards/projects.js";
import { heroCard, type HeroStat } from "./cards/hero.js";
import { ctaCard } from "./cards/cta.js";

const PAT = process.env.PAT_1;
if (!PAT) { console.error("PAT_1 is required"); process.exit(1); }

const WHITELIST = (process.env.WHITELIST ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const CACHE_SECONDS = Math.max(300, Number(process.env.CACHE_SECONDS ?? 14400));
const PORT = Number(process.env.PORT ?? 9000);
// Outside production (the Docker image sets NODE_ENV), tell clients not to cache so card edits show up on refresh.
const CACHE_CONTROL = process.env.NODE_ENV === "production"
  ? `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`
  : "no-store";

const cache = new Map<string, { at: number; data: Stats }>();
async function getStats(login: string): Promise<Stats> {
  const key = login.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_SECONDS * 1000) return hit.data;
  const data = await fetchStats(login, PAT!);
  cache.set(key, { at: Date.now(), data });
  return data;
}

function errorCard(msg: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="80" viewBox="0 0 900 80">
<rect width="900" height="80" rx="16" fill="#1f1115" stroke="#7f1d1d"/>
<text x="28" y="47" font-family="Segoe UI, sans-serif" font-size="15" fill="#fca5a5">${msg.replace(/[<>&]/g, "")}</text></svg>`;
}

const app = new Hono();

app.get("/health", (c) => c.text("ok"));

app.use("/api/*", async (c, next) => {
  // The projects card takes ?repos= and whitelists repo owners itself; the CTA card is plain text.
  if (c.req.path.endsWith("/projects") || c.req.path.endsWith("/cta")) return next();
  const username = c.req.query("username");
  if (!username) return c.body(errorCard("Missing ?username="), 400, { "Content-Type": "image/svg+xml" });
  if (WHITELIST.length && !WHITELIST.includes(username.toLowerCase())) {
    return c.body(errorCard("This instance only renders whitelisted users."), 403, { "Content-Type": "image/svg+xml" });
  }
  await next();
});

type Renderer = (s: Stats, c: any) => string;
// Accepts ?theme=light|dark, or GitSkins-style ?mode=light|dark (so their URLs work with only the host swapped).
const themeOf = (c: any) => pickTheme(c.req.query("theme") === "light" || c.req.query("mode") === "light" ? "light" : "dark");

const routes: Record<string, Renderer> = {
  "/api/stats": (s, c) => statsCard(s, themeOf(c), { subtitle: c.req.query("subtitle") }),
  "/api/stack": (s, c) => stackCard(s, themeOf(c), Number(c.req.query("count") ?? 5)),
  "/api/heatmap": (s, c) => heatmapCard(s, themeOf(c)),
};

for (const [path, render] of Object.entries(routes)) {
  // Each card is also served at /api/section/<name> for drop-in compatibility with GitSkins README markup.
  const handler = async (c: any) => {
    try {
      const svg = render(await getStats(c.req.query("username")!), c);
      return c.body(svg, 200, {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      });
    } catch (e: any) {
      console.error(e);
      return c.body(errorCard(`Could not load stats: ${e.message ?? e}`), 500, { "Content-Type": "image/svg+xml" });
    }
  };
  app.get(path, handler);
  app.get(path.replace("/api/", "/api/section/"), handler);
}

// Hero card: text comes from the query string. The avatar is inlined because camo-proxied SVGs can't load images.
const avatarCache = new Map<string, { at: number; data: string }>();
async function getAvatar(login: string): Promise<string> {
  const key = login.toLowerCase();
  const hit = avatarCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_SECONDS * 1000) return hit.data;
  const res = await fetch(`https://github.com/${encodeURIComponent(login)}.png?size=296`);
  if (!res.ok) throw new Error(`avatar ${res.status}`);
  const data = `data:${res.headers.get("content-type") ?? "image/png"};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  avatarCache.set(key, { at: Date.now(), data });
  return data;
}

const heroHandler = async (c: any) => {
  const login = c.req.query("username")!;
  try {
    const [stats, avatar] = await Promise.all([getStats(login), getAvatar(login).catch(() => undefined)]);
    const svg = heroCard(stats, themeOf(c), {
      name: c.req.query("name"),
      role: c.req.query("role"),
      tagline: c.req.query("tagline"),
      status: c.req.query("status"),
      stat: c.req.query("stat") as HeroStat | undefined,
      avatar,
    });
    return c.body(svg, 200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    });
  } catch (e: any) {
    console.error(e);
    return c.body(errorCard(`Could not load profile: ${e.message ?? e}`), 500, { "Content-Type": "image/svg+xml" });
  }
};
app.get("/api/hero", heroHandler);
app.get("/api/section/hero", heroHandler);

const ctaHandler = (c: any) => c.body(ctaCard({
  title: c.req.query("title") ?? "Let’s talk about the next build",
  text: c.req.query("text") ?? "Open to thoughtful teams, ambitious products, and durable engineering work.",
}), 200, {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": CACHE_CONTROL,
});
app.get("/api/cta", ctaHandler);
app.get("/api/section/cta", ctaHandler);

// Projects card: ?repos=owner/name,owner/name (URL-encoded commas and slashes are fine).
const repoCache = new Map<string, { at: number; data: Repo[] }>();
const projectsHandler = async (c: any) => {
  const raw = c.req.query("repos") ?? "";
  const refs = raw.split(",").map((s: string) => s.trim()).filter(Boolean).map((s: string) => {
    const [owner, name] = s.split("/");
    return { owner, name };
  }).filter((r: any) => r.owner && r.name).slice(0, 6);
  if (WHITELIST.length && refs.some((r: any) => !WHITELIST.includes(r.owner.toLowerCase()))) {
    return c.body(errorCard("This instance only renders repositories owned by whitelisted users."), 403, { "Content-Type": "image/svg+xml" });
  }
  try {
    const key = refs.map((r: any) => `${r.owner}/${r.name}`.toLowerCase()).join(",");
    const hit = repoCache.get(key);
    let repos: Repo[];
    if (hit && Date.now() - hit.at < CACHE_SECONDS * 1000) repos = hit.data;
    else { repos = await fetchRepos(refs, PAT!); repoCache.set(key, { at: Date.now(), data: repos }); }
    return c.body(projectsCard(repos, themeOf(c)), 200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    });
  } catch (e: any) {
    console.error(e);
    return c.body(errorCard(`Could not load repositories: ${e.message ?? e}`), 500, { "Content-Type": "image/svg+xml" });
  }
};
app.get("/api/projects", projectsHandler);
app.get("/api/section/projects", projectsHandler);

serve({ fetch: app.fetch, port: PORT }, () => console.log(`gh-cards listening on :${PORT}`));
