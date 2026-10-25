import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

export type Theme = {
  base: string; frameBorder: string; shadow: string; dot: string;
  glowGreen: string; glowBlue: string; glowPurple: string;
  panelTop: string; panelBottom: string; panelBorder: string;
  tile: string; tileBorder: string; track: string;
  text: string; body: string; muted: string;
  blue: string; cyan: string; purple: string; green: string;
  heat: [string, string, string, string, string];
};

// Dark values come straight from the design handoff ("recruiter signal brief"); light is a GitHub-light translation.
export const themes: Record<string, Theme> = {
  dark: {
    base: "#0a1119", frameBorder: "#1f3b52", shadow: "rgba(68,147,248,0.35)", dot: "rgba(140,180,255,0.16)",
    glowGreen: "rgba(46,160,67,0.16)", glowBlue: "rgba(56,139,253,0.16)", glowPurple: "rgba(137,87,229,0.28)",
    panelTop: "rgba(13,17,23,0.55)", panelBottom: "rgba(13,17,23,0.8)", panelBorder: "#2a3442",
    tile: "rgba(21,27,35,0.7)", tileBorder: "#2a3442", track: "#2a3442",
    text: "#f0f6fc", body: "#d1d7e0", muted: "#9198a1",
    blue: "#4493f8", cyan: "#39c5cf", purple: "#ab7df8", green: "#3fb950",
    heat: ["#161f2c", "#1c3a63", "#2860a8", "#3f86e6", "#79b8ff"],
  },
  light: {
    base: "#f6f8fa", frameBorder: "#c5d6ea", shadow: "rgba(9,105,218,0.18)", dot: "rgba(9,105,218,0.12)",
    glowGreen: "rgba(26,127,55,0.10)", glowBlue: "rgba(9,105,218,0.10)", glowPurple: "rgba(130,80,223,0.16)",
    panelTop: "rgba(255,255,255,0.6)", panelBottom: "rgba(255,255,255,0.85)", panelBorder: "#d1d9e0",
    tile: "rgba(246,248,250,0.85)", tileBorder: "#d1d9e0", track: "#d1d9e0",
    text: "#1f2328", body: "#31373d", muted: "#59636e",
    blue: "#0969da", cyan: "#1b7c83", purple: "#8250df", green: "#1a7f37",
    heat: ["#eff2f5", "#c6dcf7", "#80b3f0", "#3b82e0", "#0a5cc2"],
  },
};

export function pickTheme(name?: string): Theme {
  return themes[name ?? "dark"] ?? themes.dark;
}

export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
export const DISPLAY = `Sora, ${SANS}`;
export const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const fmt = (n: number) => n.toLocaleString("en-US");

export function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

// GitHub serves README images through camo, which blocks external font requests, so the fonts are inlined.
const require = createRequire(import.meta.url);
const FONT_FILES = {
  sora700: ["Sora", 700, "@fontsource/sora/files/sora-latin-700-normal.woff2"],
  mono500: ["JetBrains Mono", 500, "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2"],
  mono700: ["JetBrains Mono", 700, "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2"],
} as const;
export type FontKey = keyof typeof FONT_FILES;
const fontCss = new Map<FontKey, string>();
function fontFace(key: FontKey) {
  let css = fontCss.get(key);
  if (!css) {
    const [family, weight, file] = FONT_FILES[key];
    const b64 = readFileSync(require.resolve(file)).toString("base64");
    css = `@font-face { font-family: '${family}'; font-weight: ${weight}; src: url(data:font/woff2;base64,${b64}) format('woff2'); }`;
    fontCss.set(key, css);
  }
  return css;
}

// Card geometry (handoff spec): 880-wide SVG, 20px margin so the outer glow isn't clipped,
// frame padding 14 → inner panel, panel padding 18 → content.
export const W = 880;
const M = 20, FRAME_PAD = 14, PANEL_PAD = 18;
export const CX = M + FRAME_PAD + PANEL_PAD;          // content left
export const CW = W - CX * 2;                         // content width (776)
export const CY = M + FRAME_PAD + PANEL_PAD;          // content top
export const HEADER_H = 23 + 2 + 16.5;                // title line + gap + subtitle line

/** Radial glow, CSS-style: ellipse `size` (fractions of frame w/h) centred `at` (fractions), fading out by `stop`. */
export type Glow = { color: string; at: [number, number]; size: [number, number]; stop: number };

/** Title + mono subtitle at the top of the content area. */
export function header(title: string, subtitle: string) {
  return `
  <text x="${CX}" y="${CY + 17}" class="title">${escapeXml(title)}</text>
  <text x="${CX}" y="${CY + 23 + 2 + 12}" class="sub">${escapeXml(subtitle)}</text>`;
}

/**
 * Shared card shell: glowing frame (dot grid + radial glows over a dark base) holding a bordered inner panel.
 * `contentBottom` is the y where the last content ends; heights are derived from it.
 */
export function frame(contentBottom: number, t: Theme, glows: Glow[], inner: string, fonts: FontKey[], extraStyle = "") {
  const H = Math.ceil(contentBottom + PANEL_PAD + FRAME_PAD + M);
  const fw = W - M * 2, fh = H - M * 2;
  const px = M + FRAME_PAD, pw = fw - FRAME_PAD * 2, ph = fh - FRAME_PAD * 2;

  const gradients = glows.map((g, i) => {
    const cx = M + g.at[0] * fw, cy = M + g.at[1] * fh;
    return `<radialGradient id="glow${i}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="matrix(${g.size[0] * fw} 0 0 ${g.size[1] * fh} ${cx} ${cy})">
    <stop offset="0" stop-color="${g.color}"/><stop offset="${g.stop}" stop-color="${g.color}" stop-opacity="0"/>
  </radialGradient>`;
  }).join("\n  ");
  // Glows are listed top-most first, as in CSS backgrounds, so paint them in reverse.
  const glowRects = glows.map((_, i) => `<rect x="${M}" y="${M}" width="${fw}" height="${fh}" fill="url(#glow${i})"/>`).reverse().join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
<defs>
  <style>
    ${fonts.map(fontFace).join("\n    ")}
    text { font-family: ${SANS}; }
    .title { font-family: ${DISPLAY}; font-size: 18px; font-weight: 700; fill: ${t.text}; }
    .sub   { font-family: ${MONO}; font-size: 11px; font-weight: 500; fill: ${t.muted}; }
    ${extraStyle}
  </style>
  <filter id="shadow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
  <pattern id="dots" x="${M}" y="${M}" width="16" height="16" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r="1.1" fill="${t.dot}"/>
  </pattern>
  ${gradients}
  <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${t.panelTop}"/><stop offset="1" stop-color="${t.panelBottom}"/>
  </linearGradient>
  <clipPath id="clip"><rect x="${M}" y="${M}" width="${fw}" height="${fh}" rx="14"/></clipPath>
</defs>
<rect x="${M + 12}" y="${M + 12}" width="${fw - 24}" height="${fh - 24}" rx="14" fill="${t.shadow}" filter="url(#shadow)"/>
<g clip-path="url(#clip)">
  <rect x="${M}" y="${M}" width="${fw}" height="${fh}" fill="${t.base}"/>
  ${glowRects}
  <rect x="${M}" y="${M}" width="${fw}" height="${fh}" fill="url(#dots)"/>
</g>
<rect x="${M + 0.5}" y="${M + 0.5}" width="${fw - 1}" height="${fh - 1}" rx="13.5" fill="none" stroke="${t.frameBorder}"/>
<rect x="${px + 0.5}" y="${px + 0.5}" width="${pw - 1}" height="${ph - 1}" rx="11.5" fill="url(#panel)" stroke="${t.panelBorder}"/>
${inner}
</svg>`;
}
