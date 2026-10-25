// Renders all three cards with sample data to ./preview/*.svg so you can tweak the design without a token.
import { mkdirSync, writeFileSync } from "node:fs";
import { statsCard } from "../src/cards/stats.js";
import { stackCard } from "../src/cards/stack.js";
import { heatmapCard } from "../src/cards/heatmap.js";
import { projectsCard } from "../src/cards/projects.js";
import { pickTheme } from "../src/theme.js";
import type { Stats } from "../src/github.js";

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const weeks = Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
  const count = rnd() < 0.45 ? 0 : Math.floor(rnd() * 14);
  return { date: `2026-W${w}-${d}`, count, level: count === 0 ? 0 : Math.min(4, Math.ceil(count / 3.5)) };
}));

const sample: Stats = {
  login: "your-username", name: "Your Name",
  stars: 128, repos: 24, followers: 42, contributions: 986, commits: 1200, prs: 150, issues: 20,
  activeDays: weeks.flat().filter((d) => d.count > 0).length, weeks,
  languages: [
    { name: "Go", color: "#00ADD8", size: 5400 },
    { name: "TypeScript", color: "#3178c6", size: 2600 },
    { name: "Python", color: "#3572A5", size: 1200 },
    { name: "Shell", color: "#89e051", size: 500 },
    { name: "Dockerfile", color: "#384d54", size: 300 },
  ],
};

mkdirSync("preview", { recursive: true });
for (const theme of ["dark", "light"]) {
  const t = pickTheme(theme);
  writeFileSync(`preview/stats-${theme}.svg`, statsCard(sample, t));
  writeFileSync(`preview/stack-${theme}.svg`, stackCard(sample, t));
  writeFileSync(`preview/heatmap-${theme}.svg`, heatmapCard(sample, t));
  writeFileSync(`preview/projects-${theme}.svg`, projectsCard([
    { owner: "your-username", ownerIsOrg: false, name: "project-one", description: "Event-sourced double-entry ledger with replayable projections and a small admin dashboard.", language: { name: "Go", color: "#00ADD8" }, stars: 86, forks: 7, isPrivate: false, updatedAt: "" },
    { owner: "acme-labs", ownerIsOrg: true, name: "project-two", description: "", language: { name: "TypeScript", color: "#3178c6" }, stars: 0, forks: 0, isPrivate: false, updatedAt: "" },
    { owner: "your-username", ownerIsOrg: false, name: "project-three", description: "Zero-downtime Postgres schema migrations, reviewed like code.", language: { name: "Python", color: "#3572A5" }, stars: 12, forks: 1, isPrivate: true, updatedAt: "" },
  ], t));
}
console.log("wrote preview/*.svg");
