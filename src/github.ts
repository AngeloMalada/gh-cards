export type Day = { date: string; count: number; level: number };
export type Lang = { name: string; color: string; size: number };
export type Stats = {
  login: string;
  name: string;
  stars: number;
  repos: number;
  followers: number;
  contributions: number; // last 365 days, includes private
  commits: number;
  prs: number;
  issues: number;
  activeDays: number;
  weeks: Day[][];
  languages: Lang[];
};

const Q = `
query($login: String!, $from: DateTime!, $to: DateTime!, $after: String) {
  user(login: $login) {
    login
    name
    followers { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
    repositories(first: 100, after: $after, ownerAffiliations: [OWNER], orderBy: { field: STARGAZERS, direction: DESC }) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        isFork
        stargazers { totalCount }
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

const LEVEL: Record<string, number> = {
  NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4,
};

export async function fetchStats(login: string, token: string): Promise<Stats> {
  const to = new Date();
  const from = new Date(to.getTime() - 365 * 86400 * 1000);

  let after: string | null = null;
  let user: any = null;
  const repos: any[] = [];

  do {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "gh-cards" },
      body: JSON.stringify({ query: Q, variables: { login, from: from.toISOString(), to: to.toISOString(), after } }),
    });
    const json: any = await res.json();
    if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join("; "));
    if (!json.data?.user) throw new Error(`User "${login}" not found`);
    user = json.data.user;
    repos.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
  } while (after);

  const langMap = new Map<string, Lang>();
  let stars = 0;
  for (const r of repos) {
    stars += r.stargazers.totalCount;
    if (r.isFork) continue;
    for (const e of r.languages.edges) {
      const cur = langMap.get(e.node.name) ?? { name: e.node.name, color: e.node.color ?? "#8b949e", size: 0 };
      cur.size += e.size;
      langMap.set(e.node.name, cur);
    }
  }
  const languages = [...langMap.values()].sort((a, b) => b.size - a.size);

  const cc = user.contributionsCollection;
  const weeks: Day[][] = cc.contributionCalendar.weeks.map((w: any) =>
    w.contributionDays.map((d: any) => ({ date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0 })),
  );
  const activeDays = weeks.flat().filter((d) => d.count > 0).length;

  return {
    login: user.login,
    name: user.name ?? user.login,
    stars,
    repos: user.repositories.totalCount,
    followers: user.followers.totalCount,
    contributions: cc.contributionCalendar.totalContributions,
    commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    activeDays,
    weeks,
    languages,
  };
}

export type Repo = {
  owner: string; ownerIsOrg: boolean; name: string; description: string;
  language: { name: string; color: string } | null;
  stars: number; forks: number; isPrivate: boolean; updatedAt: string;
};

export async function fetchRepos(refs: { owner: string; name: string }[], token: string): Promise<Repo[]> {
  if (!refs.length) return [];
  const fields = refs.map((r, i) =>
    `r${i}: repository(owner: ${JSON.stringify(r.owner)}, name: ${JSON.stringify(r.name)}) {
      owner { login __typename } name description isPrivate updatedAt stargazerCount forkCount
      primaryLanguage { name color }
    }`).join("\n");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "gh-cards" },
    body: JSON.stringify({ query: `query { ${fields} }` }),
  });
  const json: any = await res.json();
  if (!json.data) throw new Error(json.errors?.map((e: any) => e.message).join("; ") ?? "GraphQL error");
  return refs.map((_, i) => json.data[`r${i}`]).filter(Boolean).map((r: any) => ({
    owner: r.owner.login, ownerIsOrg: r.owner.__typename === "Organization", name: r.name, description: r.description ?? "",
    language: r.primaryLanguage ? { name: r.primaryLanguage.name, color: r.primaryLanguage.color ?? "#8b949e" } : null,
    stars: r.stargazerCount, forks: r.forkCount, isPrivate: r.isPrivate, updatedAt: r.updatedAt,
  }));
}
