import { frame, header, escapeXml, CX, CW, CY, HEADER_H, MONO, W, type Glow, type Theme } from "../theme.js";
import type { Stats } from "../github.js";

// Row grid from the handoff: 120px name | 44px percent | bar, 12px gaps.
const ROW_H = 18, ROW_GAP = 12, PCT_END = 120 + 12 + 44, BAR_X = PCT_END + 12;

export function stackCard(s: Stats, t: Theme, count = 5) {
  const langs = s.languages.slice(0, count);
  const total = langs.reduce((a, l) => a + l.size, 0) || 1;
  const top = CY + HEADER_H + 16;
  const barW = CW - BAR_X;

  const rows = langs.map((l, i) => {
    const pct = (l.size / total) * 100;
    const color = l.color || t.blue;
    return `
  <g transform="translate(${CX} ${top + i * (ROW_H + ROW_GAP) + ROW_H / 2})">
    <circle cx="4" cy="0" r="4" fill="${color}"/>
    <text x="16" y="4" class="lang">${escapeXml(l.name)}</text>
    <text x="${PCT_END}" y="4" class="pct" text-anchor="end" fill="${color}">${pct.toFixed(0)}%</text>
    <rect x="${BAR_X}" y="-3" width="${barW}" height="6" rx="3" fill="${t.track}"/>
    <rect x="${BAR_X}" y="-3" width="${Math.max(6, (barW * pct) / 100)}" height="6" rx="3" fill="${color}"/>
  </g>`;
  }).join("");

  const style = `
    .lang { font-size: 12px; font-weight: 600; fill: ${t.text}; }
    .pct  { font-family: ${MONO}; font-size: 12px; font-weight: 500; }
    .cmd  { font-family: ${MONO}; font-size: 12px; font-weight: 500; fill: ${t.blue}; }`;
  const glows: Glow[] = [
    { color: t.glowBlue, at: [0.15, 0], size: [1, 0.8], stop: 0.55 },
    { color: t.glowPurple, at: [0.75, 1.1], size: [0.9, 0.7], stop: 0.6 },
  ];
  const inner = header("Language Stack", "Repository-weighted") +
    `\n  <text x="${W - CX}" y="${CY + 13}" class="cmd" text-anchor="end">&gt; stack.scan_</text>` + rows;
  const bottom = top + Math.max(1, langs.length) * (ROW_H + ROW_GAP) - ROW_GAP;
  return frame(bottom, t, glows, inner, ["sora700", "mono500"], style);
}
