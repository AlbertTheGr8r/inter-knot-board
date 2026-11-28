# Contributing

Thanks for looking. This is a small, maintainer-led project. PRs and focused
issues are welcome; there is no SLA.

## Scope

Inter-Knot Board is a static board UI for feeds. It is not a hosted service and
it does not want to become one. Changes that add accounts, a hosted proxy,
telemetry, or a second backend abstraction should start as an issue, not a PR.

The feed pipeline is the current focus. Visual changes are welcome when they are
backed by the design references and do not break accessibility or the static
build.

## Setup

Requires [Bun](https://bun.sh/) 1.4+.

```bash
bun install
bun run dev
```

Before opening a PR:

```bash
bun run format:check
bun run check
```

`bun run check` runs the TypeScript check, Vitest, and a production build.

## Issues

- Search existing issues first.
- Use the bug report form. Include browser, OS, the feed mode (demo/direct/
  proxy/backend), steps, expected/actual, and console errors.
- Redact API tokens, private feed URLs, and personal OPML contents.
- Security issues go through [SECURITY.md](SECURITY.md), not the public tracker.

## Pull requests

- Keep the change focused. One concern per PR.
- Explain the why, not just the what. Include a screenshot for UI changes.
- Add or update tests when behavior changes.
- Update docs when a contract changes (`docs/FEEDS.md`, `docs/DEPLOYMENT.md`).
- Verify the static build: `bun run build && bun run preview`.
- Do not include game screenshots, game assets, proprietary fonts, or personal
  feed exports.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(board): add feed error banner
fix(dialog): restore focus after escape
docs(feeds): document freshRSS endpoints
chore(ci): pin bun version
```

### Sign-off (DCO)

This project uses the Developer Certificate of Origin, not a CLA. Sign every
commit:

```bash
git commit -s -m "feat(board): add feed error banner"
```

The sign-off certifies that you wrote the contribution or have the right to
submit it under the project's MIT license. See
<https://developercertificate.org/>.

## AI-assisted contributions

AI-assisted work is allowed and disclosed. In the PR description, say what was
generated and what you verified. Do not submit unreviewed generated code,
invented benchmarks, or assets with unclear licensing. The maintainer may ask
for a smaller change or a test before merging.

## Design and asset policy

- The UI is an original recreation. Do not add ripped game textures, logos,
  fonts, or screenshots.
- Reference screenshots used for design study stay out of the repository. The
  `reference/` folder is gitignored.
- Our own screenshots live in `docs/screenshots/`.
- Fonts are OFL-licensed (Anton, Barlow, Barlow Condensed) and self-hosted.

## Review

- One maintainer reviews on a best-effort basis.
- Small PRs are easier to review and merge.
- A PR may be closed if it expands the product beyond the scope above.
- By contributing, you agree your contribution is licensed under the MIT license
  in [LICENSE](LICENSE).
