import { frame, header, fmt, escapeXml, CX, CW, CY, HEADER_H, MONO, type Glow, type Theme } from "../theme.js";
import type { Org } from "../github.js";

const GAP = 10, TILE_H = 88, AV = 48;

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

/** Organizations the user belongs to; `avatars` maps org login → data URI (camo can't load remote images). */
export function orgsCard(orgs: Org[], avatars: Record<string, string | undefined>, t: Theme) {
  const cols = orgs.length === 1 ? 1 : 2;
  const tw = (CW - GAP * (cols - 1)) / cols;
  const descChars = Math.floor((tw - AV - 48) / 6.5);
  const top = CY + HEADER_H + 16;
  const rows = Math.max(1, Math.ceil(orgs.length / cols));

  const tiles = orgs.map((o, i) => {
    const x = CX + (i % cols) * (tw + GAP);
    const y = top + Math.floor(i / cols) * (TILE_H + GAP);
    const avatar = avatars[o.login]
      ? `<image href="${avatars[o.login]}" x="16" y="20" width="${AV}" height="${AV}" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`
      : `<rect x="16" y="20" width="${AV}" height="${AV}" rx="10" fill="${t.track}"/>`;
    const meta = `@${o.login}  ·  ${fmt(o.repos)} ${o.repos === 1 ? "repo" : "repos"}`;
    return `
  <g transform="translate(${x} ${y})">
    <rect x="0.5" y="0.5" width="${tw - 1}" height="${TILE_H - 1}" rx="9.5" fill="${t.tile}" stroke="${t.tileBorder}"/>
    ${avatar}
    <rect x="16.5" y="20.5" width="${AV - 1}" height="${AV - 1}" rx="9.5" fill="none" stroke="${t.frameBorder}"/>
    <text x="${AV + 32}" y="36" class="org">${escapeXml(clip(o.name, 40))}</text>
    <text x="${AV + 32}" y="54" class="meta" xml:space="preserve">${escapeXml(meta)}</text>
    ${o.description ? `<text x="${AV + 32}" y="72" class="desc">${escapeXml(clip(o.description, descChars))}</text>` : ""}
  </g>`;
  }).join("");

  const empty = orgs.length ? "" : `<text x="${CX}" y="${top + 24}" class="desc">No organizations to show.</text>`;

  const style = `
    .org  { font-size: 16px; font-weight: 600; fill: ${t.text}; }
    .meta { font-family: ${MONO}; font-size: 11px; font-weight: 500; fill: ${t.muted}; }
    .desc { font-size: 12px; fill: ${t.body}; }`;
  const glows: Glow[] = [
    { color: t.glowBlue, at: [0.85, 0], size: [1, 0.8], stop: 0.55 },
    { color: t.glowPurple, at: [0.2, 1.1], size: [0.9, 0.7], stop: 0.6 },
  ];
  const inner = `
  <defs><clipPath id="av"><rect x="16" y="20" width="${AV}" height="${AV}" rx="10"/></clipPath></defs>` +
    header("Organizations", `Member of ${orgs.length} ${orgs.length === 1 ? "organization" : "organizations"}`) + tiles + empty;
  const bottom = orgs.length ? top + rows * TILE_H + (rows - 1) * GAP : top + 32;
  return frame(bottom, t, glows, inner, ["sora700", "mono500"], style);
}
