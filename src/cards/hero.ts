import { frame, escapeXml, CX, CY, W, MONO, DISPLAY, type Glow, type Theme } from "../theme.js";
import type { Stats } from "../github.js";

// Profile hero: avatar, @handle, gradient name, one-liner, a headline stat and top-language pills,
// in the same glowing frame as the other cards.
const AV_R = 46, PILL_H = 26, PILL_GAP = 12;

const STATS = {
  stars: ["Total stars", (s: Stats) => s.stars],
  contributions: ["Contributions", (s: Stats) => s.contributions],
  repos: ["Repositories", (s: Stats) => s.repos],
  followers: ["Followers", (s: Stats) => s.followers],
} as const;
export type HeroStat = keyof typeof STATS;

export type HeroOpts = { name?: string; role?: string; tagline?: string; status?: string; stat?: HeroStat; avatar?: string };

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + "…" : s);
const short = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1000 ? `${(n / 1000).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, "")}K` : String(n);

export function heroCard(s: Stats, t: Theme, o: HeroOpts = {}) {
  const [statLabel, statOf] = STATS[o.stat ?? "contributions"] ?? STATS.contributions;
  const langs = s.languages.slice(0, 4);
  const line = [o.role, o.tagline].filter(Boolean).join(" · ") ||
    (langs[0] ? `Building with ${langs[0].name} on GitHub.` : "Building in public on GitHub.");

  const ax = CX + AV_R + 2, ay = CY + AV_R + 2;
  const tx = CX + AV_R * 2 + 24;
  const statX = W - CX - 70;

  const avatar = o.avatar
    ? `<image href="${o.avatar}" x="${ax - AV_R}" y="${ay - AV_R}" width="${AV_R * 2}" height="${AV_R * 2}" clip-path="url(#avatar)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${ax}" cy="${ay}" r="${AV_R}" fill="${t.tile}"/>`;

  const status = o.status
    ? `<tspan dx="14" fill="${t.green}">●</tspan><tspan dx="6" class="status">${escapeXml(clip(o.status, 40))}</tspan>`
    : "";

  // Decorative arc starts just past the @handle line (mono glyphs ≈ 0.6em wide).
  const arcX = Math.min(tx + (s.login.length + 1) * 7.8 + (o.status ? 26 + clip(o.status, 40).length * 7.2 : 0) + 16, statX - 300);

  let px = CX;
  const pillY = CY + 116;
  const pills = langs.map((l) => {
    const w = Math.max(90, l.name.length * 7.5 + 36);
    const g = `
  <g transform="translate(${px} ${pillY})">
    <rect x="0.5" y="0.5" width="${w - 1}" height="${PILL_H - 1}" rx="${PILL_H / 2}" fill="${t.tile}" stroke="${t.frameBorder}"/>
    <circle cx="14" cy="${PILL_H / 2}" r="4" fill="${l.color || t.blue}"/>
    <text x="26" y="17" class="pill">${escapeXml(l.name)}</text>
  </g>`;
    px += w + PILL_GAP;
    return g;
  }).join("");

  const style = `
    .handle { font-family: ${MONO}; font-size: 13px; font-weight: 700; fill: ${t.text}; }
    .status { font-family: ${MONO}; font-size: 12px; font-weight: 700; fill: ${t.green}; }
    .name   { font-family: ${DISPLAY}; font-size: 40px; font-weight: 700; }
    .line   { font-size: 14px; fill: ${t.body}; }
    .stat   { font-family: ${DISPLAY}; font-size: 34px; font-weight: 700; fill: ${t.cyan}; }
    .statl  { font-family: ${MONO}; font-size: 10px; font-weight: 700; letter-spacing: 2px; fill: ${t.cyan}; }
    .pill   { font-size: 12px; font-weight: 600; fill: ${t.blue}; }`;
  const glows: Glow[] = [
    { color: t.glowBlue, at: [0.1, 0], size: [0.9, 1.2], stop: 0.6 },
    { color: t.glowBlue, at: [0.85, 0.4], size: [0.5, 1], stop: 0.6 },
    { color: t.glowPurple, at: [0.8, 1.1], size: [0.9, 0.9], stop: 0.6 },
  ];

  const inner = `
  <defs>
    <clipPath id="avatar"><circle cx="${ax}" cy="${ay}" r="${AV_R}"/></clipPath>
    <linearGradient id="name" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.blue}"/><stop offset="1" stop-color="${t.cyan}"/>
    </linearGradient>
    <linearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.blue}" stop-opacity="0.7"/><stop offset="1" stop-color="${t.blue}" stop-opacity="0"/>
    </linearGradient>
    <filter id="ring" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <path d="M${arcX} ${CY + 9} Q ${arcX + 120} ${CY - 2} ${arcX + 230} ${CY + 22}" fill="none" stroke="url(#arc)" stroke-width="1.2"/>
  <circle cx="${ax}" cy="${ay}" r="${AV_R + 2}" fill="none" stroke="${t.blue}" stroke-width="3" opacity="0.6" filter="url(#ring)"/>
  ${avatar}
  <circle cx="${ax}" cy="${ay}" r="${AV_R + 1}" fill="none" stroke="${t.blue}" stroke-width="2"/>
  <text x="${tx}" y="${CY + 14}" class="handle">@${escapeXml(s.login)}${status}</text>
  <text x="${tx}" y="${CY + 60}" class="name" fill="url(#name)">${escapeXml(clip(o.name ?? s.name, 22))}</text>
  <text x="${tx}" y="${CY + 86}" class="line">${escapeXml(clip(line, 64))}</text>
  <text x="${statX}" y="${CY + 50}" class="stat" text-anchor="middle">${short(statOf(s))}</text>
  <text x="${statX}" y="${CY + 70}" class="statl" text-anchor="middle">${statLabel.toUpperCase()}</text>
  ${pills}`;
  return frame(pillY + PILL_H, t, glows, inner, ["sora700", "mono700"], style);
}
