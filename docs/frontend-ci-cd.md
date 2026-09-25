# Frontend Production CI/CD

This document describes the production release and static-publication flow for the Sloty frontend.

The frontend repository is the source of truth for deployment logic. Production remains a static Vite application served by Nginx. There is no Docker image, no Node production server, no `npm run preview`, and no `/usr/local/sbin` copy of the deploy script.

---

## 1. Branch flow

```text
feature/fix
   ↓
PR → dev          Test only
   ↓
push to dev       Test only
   ↓
PR → master       Test only
   ↓
merge to master
   ↓
Test
   ↓
Prepare Production Release
   ↓
Deploy exact master SHA
   ↓
Create GitHub Release
```

Workflow file: [`.github/workflows/frontend-ci-cd.yml`](../.github/workflows/frontend-ci-cd.yml)

Production jobs run only when:

```text
github.event_name == 'push'
github.ref == 'refs/heads/master'
```

---

## 2. CI Test job

Every PR and push to `dev` or `master` runs:

1. `actions/setup-node` with `node-version-file: .nvmrc`
2. `npm ci` from `package-lock.json`
3. `bash -n` on the deploy scripts
4. `npm run lint`
5. `npm test`
6. `npm run build` (`tsc -b && vite build`)

Do not use `npm install` in CI. Do not duplicate the Node version from `.nvmrc` in the workflow.

---

## 3. Frontend releases

Frontend GitHub Releases are independent from Backend releases.

- Authority: git tags `vMAJOR.MINOR.PATCH`, not `package.json` `version`
- First release: `v0.1.0`
- Later releases: `MINOR += 1`, `PATCH = 0`
- Calculation lives in [`scripts/lib/frontend-release.sh`](../scripts/lib/frontend-release.sh) and runs once in **Prepare Production Release**
- If `GITHUB_SHA` already has a valid `vX.Y.Z` tag, that tag is reused
- Deploy and GitHub Release consume the same `release_tag` output
- A tag that already points at a different SHA is a hard failure; tags are never moved

---

## 4. Production publish contract

Canonical executable: [`scripts/deploy-sloty-frontend`](../scripts/deploy-sloty-frontend)

```bash
sudo /srv/sloty/frontend/scripts/deploy-sloty-frontend <COMMIT_SHA> <RELEASE_TAG>
```

| Path | Role |
| :--- | :--- |
| `/srv/sloty/frontend` | Production git worktree |
| `/var/www/sloty/frontend` | Nginx document root |
| `https://sloty.baronlearning.com/` | Public site; deploy requires HTTP 200 |

The script:

1. Discovers the git root from its own location (not the caller's `pwd`)
2. Snapshots `scripts/` to `/tmp` before `git checkout --detach`, then execs the snapshot
3. Requires a clean worktree, the expected GitHub origin, and a SHA that is an ancestor of `origin/master`
4. Fetches with `git fetch origin --prune` (never `git pull`)
5. Checks out the exact GitHub SHA
6. Runs `npm ci` (devDependencies are required for `tsc` and Vite)
7. Injects `VITE_APP_RELEASE` and `VITE_COMMIT_SHA` into `npm run build`
8. Requires `dist/`, `dist/index.html`, and generated production `dist/version.json` (reflecting exact `RELEASE_TAG` and `COMMIT_SHA`) before touching the live site
9. Publishes the complete `dist/` tree with `rsync -a --delete` (PWA/service-worker artifacts and `version.json` included)
10. Verifies `https://sloty.baronlearning.com/` returns HTTP 200, and verifies `version.json` serves the exact deployed `COMMIT_SHA` and `RELEASE_TAG`

It must not change Nginx config, restart Nginx, restart Backend, run Django migrations, or modify other `/var/www` projects.

Existing UI metadata is reused:

- Frontend: [`src/core/config/buildInfo.ts`](../src/core/config/buildInfo.ts) and static `version.json` via [`src/core/release/releaseManager.ts`](../src/core/release/releaseManager.ts)
- Backend: [`src/core/system/`](../src/core/system/) and [`src/shared/components/BuildInfo/`](../src/shared/components/BuildInfo/)

Production API targeting stays in `.env.production` via [`src/shared/config/api.ts`](../src/shared/config/api.ts). Vite env values are client-visible; never put secrets in `VITE_*`.

---

## 5. VPS prerequisites (DevOps, not this repository)

These are server steps after repository review:

- Clone this GitHub repository to `/srv/sloty/frontend`
- Node major version from `.nvmrc` plus npm, git, rsync, and curl on PATH for the deploy user
- Directory `/var/www/sloty/frontend` already served by Nginx
- Dedicated `sloty-deploy` user allowed to run `sudo /srv/sloty/frontend/scripts/deploy-sloty-frontend` as root
- GitHub Actions secret `PROD_SSH_KEY` and variables `PROD_HOST`, `PROD_USER` (same dedicated-user principle as Backend)

This repository must not modify `/etc/sudoers`, Nginx, or Backend.
