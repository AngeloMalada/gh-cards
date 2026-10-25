import { frame, header, fmt, escapeXml, CX, CW, CY, HEADER_H, MONO, type Glow, type Theme } from "../theme.js";
import type { Repo } from "../github.js";

const GAP = 10, COLS = 2, TILE_H = 150;

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = (cur + " " + w).trim();
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, Math.max(1, max - 1)) + "…" : s);

export function projectsCard(repos: Repo[], t: Theme) {
  const tw = (CW - GAP * (COLS - 1)) / COLS;
  const rows = Math.max(1, Math.ceil(repos.length / COLS));
  const top = CY + HEADER_H + 16;

  // Mirrors the "Selected work" details cell: repo name, description, "● Lang · ★ n", "Read the repository →".
  const tiles = repos.map((r, i) => {
    const x = CX + (i % COLS) * (tw + GAP);
    const y = top + Math.floor(i / COLS) * (TILE_H + GAP);
    const desc = wrap(r.description || "No description yet.", 54, 2)
      .map((l, j) => `<text x="16" y="${62 + j * 19}" class="desc">${escapeXml(l)}</text>`).join("");
    const lang = r.language ? `<tspan fill="${r.language.color}">●</tspan> ${escapeXml(r.language.name)}  ·  ` : "";
    const badge = r.isPrivate ? `<text x="${tw - 16}" y="34" class="badge" text-anchor="end">Private</text>` : "";
    // Org repos read "org / repo" like on GitHub, with the org muted; long pairs are clipped to fit the tile.
    const room = r.isPrivate ? 28 : 34;
    const owner = r.ownerIsOrg ? clip(r.owner, Math.max(8, room - r.name.length - 3)) : "";
    const name = clip(r.name, room - (owner ? owner.length + 3 : 0));
    const title = (owner ? `<tspan class="owner">${escapeXml(owner)} / </tspan>` : "") + escapeXml(name);
    return `
  <g transform="translate(${x} ${y})">
    <rect x="0.5" y="0.5" width="${tw - 1}" height="${TILE_H - 1}" rx="9.5" fill="${t.tile}" stroke="${t.tileBorder}"/>
    <text x="16" y="34" class="name" xml:space="preserve">${title}</text>
    ${badge}
    ${desc}
    <text x="16" y="${TILE_H - 44}" class="meta" xml:space="preserve">${lang}★ ${fmt(r.stars)}</text>
    <text x="16" y="${TILE_H - 18}" class="link">Read the repository →</text>
  </g>`;
  }).join("");

  const empty = repos.length ? "" :
    `<text x="${CX}" y="${top + 24}" class="desc">No repositories matched the repos= parameter.</text>`;

  const style = `
    .name { font-size: 18px; font-weight: 600; fill: ${t.blue}; }
    .owner{ font-weight: 400; fill: ${t.muted}; }
    .desc { font-size: 13px; fill: ${t.body}; }
    .meta { font-size: 12px; fill: ${t.muted}; }
    .link { font-size: 13px; fill: ${t.blue}; }
    .badge{ font-family: ${MONO}; font-size: 11px; font-weight: 500; fill: ${t.purple}; }`;
  const glows: Glow[] = [
    { color: t.glowBlue, at: [0.15, 0], size: [1, 0.8], stop: 0.55 },
    { color: t.glowPurple, at: [0.75, 1.1], size: [0.9, 0.7], stop: 0.6 },
  ];
  const inner = header("Selected Work", "Featured repositories") + tiles + empty;
  const bottom = repos.length ? top + rows * TILE_H + (rows - 1) * GAP : top + 32;
  return frame(bottom, t, glows, inner, ["sora700", "mono500"], style);
}
