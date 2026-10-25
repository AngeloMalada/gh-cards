import { escapeXml, SANS } from "../theme.js";

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + " " + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) lines.splice(maxLines - 1, Infinity, lines.slice(maxLines - 1).join(" ").slice(0, maxChars - 1) + "…");
  return lines;
}

// Closing call-to-action box from the design handoff: dot grid + green glow from the bottom-left.
// The contact links stay as real markdown links under the image. Dark-only, like the design.
const W = 640, PAD_X = 24;
const C = { bg: "#0d1117", border: "#3d444d", text: "#f0f6fc", body: "#d1d7e0" };

export function ctaCard(o: { title: string; text: string }) {
  const lines = wrap(o.text, 88, 3);
  const titleY = 20 + 21;
  const ruleY = 20 + 27.5 + 8;
  const bodyY = ruleY + 1 + 10;
  const H = Math.ceil(bodyY + lines.length * 19.5 + 20);

  const body = lines.map((l, i) => `<text x="${PAD_X}" y="${bodyY + 14 + i * 19.5}" class="body">${escapeXml(l)}</text>`).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(o.title)}">
<defs>
  <style>
    text { font-family: ${SANS}; }
    .h2   { font-size: 22px; font-weight: 600; fill: ${C.text}; }
    .body { font-size: 13px; fill: ${C.body}; }
  </style>
  <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r="1.1" fill="rgba(140,180,255,0.14)"/>
  </pattern>
  <radialGradient id="green" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="matrix(${W * 0.7} 0 0 ${H * 0.9} 0 ${H})">
    <stop offset="0" stop-color="rgba(46,160,67,0.2)"/><stop offset="0.7" stop-color="rgba(46,160,67,0.2)" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<rect width="${W}" height="${H}" fill="url(#dots)"/>
<rect width="${W}" height="${H}" fill="url(#green)"/>
<text x="${PAD_X}" y="${titleY}" class="h2">${escapeXml(o.title)}</text>
<rect x="${PAD_X}" y="${ruleY}" width="${W - PAD_X * 2}" height="1" fill="${C.border}"/>
${body}
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${C.border}"/>
</svg>`;
}
