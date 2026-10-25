import { frame, header, fmt, CX, CW, CY, HEADER_H, W, type Glow, type Theme } from "../theme.js";
import type { Stats } from "../github.js";

const GAP = 3, LEGEND_CELL = 9;

export function heatmapCard(s: Stats, t: Theme) {
  const weeks = s.weeks.slice(-53);
  // Cells stretch to fill the content width, like the design's 53-column CSS grid.
  const cell = (CW - GAP * 52) / 53;
  const top = CY + HEADER_H + 14;

  const cells: string[] = [];
  weeks.forEach((w, c) => {
    w.forEach((d, r) => {
      const x = (CX + c * (cell + GAP)).toFixed(2), y = (top + r * (cell + GAP)).toFixed(2);
      cells.push(`<rect x="${x}" y="${y}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="2" fill="${t.heat[d.level]}"><title>${d.date}: ${d.count}</title></rect>`);
    });
  });

  // Legend, right-aligned: "Less ■■■■■ More".
  const moreX = W - CX;
  const sq0 = moreX - 24 - 4 - (5 * LEGEND_CELL + 4 * GAP);
  const legend = t.heat.map((col, i) =>
    `<rect x="${sq0 + i * (LEGEND_CELL + GAP)}" y="${CY + 3}" width="${LEGEND_CELL}" height="${LEGEND_CELL}" rx="2" fill="${col}"/>`).join("");

  const style = `.legend { font-size: 10px; fill: ${t.muted}; }`;
  const glows: Glow[] = [
    { color: t.glowGreen, at: [0.9, 0], size: [1, 0.8], stop: 0.55 },
    { color: t.glowPurple, at: [0.7, 1.1], size: [0.9, 0.7], stop: 0.6 },
  ];
  const inner = header("Contribution Activity", `${fmt(s.contributions)} contributions in the last year`) + `
  <text x="${sq0 - 4}" y="${CY + 11}" class="legend" text-anchor="end">Less</text>
  ${legend}
  <text x="${moreX}" y="${CY + 11}" class="legend" text-anchor="end">More</text>
  ${cells.join("")}`;
  return frame(top + 7 * cell + 6 * GAP, t, glows, inner, ["sora700", "mono500"], style);
}
