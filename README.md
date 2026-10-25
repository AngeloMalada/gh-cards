# gh-cards

A small self-hosted service that turns your GitHub activity into styled SVG cards for your GitHub profile README.

It reads your data from GitHub's GraphQL API with your own personal access token, so **private repositories and private
contributions count** toward your numbers, without their contents ever being shown. Every card is drawn on the server
as a self-contained SVG: fonts and your avatar are embedded, so the cards look the same inside GitHub's image proxy
as they do anywhere else.


## The cards

| Card | Endpoint | What it shows |
|---|---|---|
| **Hero** | `/api/hero?username=X` | Round avatar, `@handle` with an optional status, your name in a blue→cyan gradient, a one-line description, a headline stat and pills for your top four languages |
| **Profile Signal** | `/api/stats?username=X` | Stars, contributions (last 365 days), repositories and followers, each with a progress bar |
| **Language Stack** | `/api/stack?username=X` | Your top languages, weighted by code size across every non-fork repository you own, public and private |
| **Contribution Activity** | `/api/heatmap?username=X` | A 53-week contribution grid with your yearly total |
| **Selected Work** | `/api/projects?repos=owner/a,owner/b` | Tiles for up to 6 chosen repositories: description, language, stars, and a Private badge where relevant. Organization repos display as `org / repo` |
| **Organizations** | `/api/orgs?username=X` | The organizations you belong to, with avatar, name, description and repository count. For the token's owner this includes private memberships |
| **Call to action** | `/api/cta` | The closing "Let's talk about the next build" box |

### Options

Every card accepts `theme=dark` (the default) or `theme=light`.

| Card | Extra parameters |
|---|---|
| Hero | `name=` (defaults to your GitHub name), `role=`, `tagline=`, `status=`, `stat=stars\|contributions\|repos\|followers` (default `contributions`) |
| Profile Signal | `subtitle=` |
| Language Stack | `count=` (number of languages, default 5) |
| Selected Work | `repos=` is a comma-separated list of `owner/name` |
| Call to action | `title=`, `text=` |

Write spaces in parameter values as `%20`.

Each card is also served at `/api/section/<name>` and accepts `mode=light|dark`. That makes README markup generated
by GitSkins work after replacing `www.gitskins.com` with your domain.

## Running it locally

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in at least `PAT_1` and `WHITELIST` (see [Configuration](#configuration)).
3. Start the server:
   ```powershell
   npx tsx watch --env-file=.env src/index.ts
   ```
4. Open a card, for example `http://localhost:9000/api/stats?username=YourUsername`.

To iterate on the design without a token, run `npm run preview`. It renders every card with sample data into
`preview/*.svg`.

## Building your profile README

The service only draws the cards. Your actual profile README lives in the special `YourUsername/YourUsername`
repository on GitHub. This project includes a template for it and a script that builds and previews it.

1. Edit [profile/README.template.md](profile/README.template.md): your role, tagline and status in the hero URL, and
   the repositories for Selected Work.
2. Set the README values in `.env`: `CARDS_URL`, `GITHUB_USER`, `LINKEDIN_URL`, `WEBSITE_URL` and `EMAIL`.
3. With the server running, run:
   ```powershell
   npm run readme
   ```
   This writes `profile/README.md`, with links filled in from `.env` (links you leave empty are hidden). It also
   writes `profile/preview.html`: your README rendered by GitHub's own markdown API, so HTML that GitHub would strip
   is stripped here too, with the cards loaded from your local server. Open it in a browser.
4. When you're happy with it, copy `profile/README.md` into your profile repository as `README.md`.

Edit the template, not `profile/README.md`, which is overwritten on every run.

## Configuration

| Variable | Used by | Purpose |
|---|---|---|
| `PAT_1` | server | Classic GitHub token with the `repo` and `read:user` scopes. Required |
| `WHITELIST` | server | Comma-separated usernames (and organizations, for Selected Work) the server will render. Leave empty to allow anyone, which is not recommended |
| `CACHE_SECONDS` | server | How long fetched data is cached, and how long clients may cache the cards. Default 14400 (4 hours), minimum 300 |
| `PORT` | server | Default 9000 |
| `CARDS_URL` | `npm run readme` | Public URL of your deployed service. Cards in the generated README point here. Empty means `http://localhost:PORT` |
| `GITHUB_USER` | `npm run readme` | Username for the README. Defaults to the first `WHITELIST` entry |
| `LINKEDIN_URL`, `WEBSITE_URL`, `EMAIL` | `npm run readme` | Links under the hero and in the contact row. Empty values are hidden |

To feature repositories from an organization, add the organization to `WHITELIST`. Your token also needs access to
it; for organizations with SSO, authorize the token under GitHub → Settings → Developer settings.

## Deploying on Dokploy

1. Push this folder to a **private** git repository. `.gitignore` keeps `.env` out of it; check `git status` before
   your first commit anyway.
2. In Dokploy, create an **Application** from that repository with build type **Dockerfile**.
3. In the Environment tab, set the server variables:
   ```
   PAT_1=ghp_...
   WHITELIST=YourUsername
   CACHE_SECONDS=14400
   ```
4. In the Domains tab, add your domain with container port **9000** and HTTPS on.
5. Deploy, then open `https://your-domain/api/stats?username=YourUsername` to check.
6. Set `CARDS_URL=https://your-domain` in your local `.env` and run `npm run readme` again to point the README at
   the live service.

Alternatively, run the included `docker-compose.yml` as a Compose service, with a `.env` created from
`.env.example`.

## Customizing the look

- **Colors:** `themes.dark` and `themes.light` in [src/theme.ts](src/theme.ts).
- **Shared frame** (glow, dot grid, inner panel, card header): `frame()` and `header()` in [src/theme.ts](src/theme.ts).
- **Card layouts:** [src/cards/](src/cards/), one file per card, written as plain template strings.
- **Progress-bar ceilings** on Profile Signal: `TARGET` in [src/cards/stats.ts](src/cards/stats.ts).

## Good to know

- **Caching.** In production (`NODE_ENV=production`, which the Docker image sets), cards are cached for
  `CACHE_SECONDS`. GitHub's image proxy may also keep showing an old card for a while after you deploy a change;
  adding a parameter such as `&v=2` to the image URL in your README forces a refresh. Outside production, the server
  tells clients not to cache, so changes show up on reload.
- **Card size.** Embedding the fonts makes each card roughly 50–95 KB; the hero is about 150 KB with your avatar.
- **Clicks.** On GitHub, clicking a card image opens the image itself. Only the text links in the README are
  clickable.
- **Private data.** Private repositories you list in Selected Work show their name and description publicly on your
  profile. Only list ones you're comfortable sharing.
