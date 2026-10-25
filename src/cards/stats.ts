import { frame, header, fmt, CX, CW, CY, HEADER_H, MONO, type Glow, type Theme } from "../theme.js";
import type { Stats } from "../github.js";

const GAP = 10, TILE_H = 86;

// Soft ceilings for the little progress bars under each number.
const TARGET = { stars: 100, contributions: 2000, repos: 40, followers: 50 };

// "2.3k" style, as in the design; contributions stay exact.
const compact = (n: number) => n < 1000 ? fmt(n) : `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "")}k`;

export function statsCard(s: Stats, t: Theme, opts: { subtitle?: string } = {}) {
  const metrics = [
    { label: "Stars", value: s.stars, text: compact(s.stars), color: t.blue, max: TARGET.stars },
    { label: "Contributions", value: s.contributions, text: fmt(s.contributions), color: t.cyan, max: TARGET.contributions },
    { label: "Repos", value: s.repos, text: fmt(s.repos), color: t.purple, max: TARGET.repos },
    { label: "Followers", value: s.followers, text: compact(s.followers), color: t.green, max: TARGET.followers },
  ];
  const tw = (CW - GAP * 3) / 4;
  const top = CY + HEADER_H + 16;

  const tiles = metrics.map((m, i) => {
    const ratio = Math.max(0.04, Math.min(1, m.value / m.max));
    const barW = tw - 28;
    return `
  <g transform="translate(${CX + i * (tw + GAP)} ${top})">
    <rect x="0.5" y="0.5" width="${tw - 1}" height="${TILE_H - 1}" rx="9.5" fill="${t.tile}" stroke="${t.tileBorder}"/>
    <text x="14" y="24" class="label">${m.label}</text>
    <text x="14" y="58" class="value" fill="${m.color}">${m.text}</text>
    <rect x="14" y="70" width="${barW}" height="4" rx="2" fill="${t.track}"/>
    <rect x="14" y="70" width="${barW * ratio}" height="4" rx="2" fill="${m.color}"/>
  </g>`;
  }).join("");

  const style = `
    .label { font-size: 11px; fill: ${t.muted}; }
    .value { font-family: ${MONO}; font-size: 26px; font-weight: 700; }`;
  const glows: Glow[] = [
    { color: t.glowGreen, at: [0.85, 0], size: [1.2, 0.8], stop: 0.55 },
    { color: t.glowPurple, at: [0.75, 1.1], size: [0.9, 0.7], stop: 0.6 },
  ];
  const inner = header("Profile Signal", opts.subtitle ?? "Live GitHub stats") + tiles;
  return frame(top + TILE_H, t, glows, inner, ["sora700", "mono500", "mono700"], style);
}
