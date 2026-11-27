# Feeds, CORS, and backends

This page is the contract for how Inter-Knot Board will fetch feeds. It is
deliberately blunt about the browser constraint so the project does not promise
something a static site cannot deliver.

## The constraint

A page served from `https://albertthegr8r.github.io` can only read a cross-origin
feed response when that feed sends an `Access-Control-Allow-Origin` header that
allows the page's origin. Many feeds do; many do not. No client-side code can
change that, and GitHub Pages cannot proxy the request.

Therefore:

- **Direct fetch is the default.** It is the only mode that needs zero setup.
- **No public CORS proxy is shipped or recommended.** A public proxy sees every
  URL and every article you read, and can disappear at any time.
- **A local proxy is the supported escape hatch** for feeds that block CORS.
- **FreshRSS/Miniflux are the supported sync backends.** We consume their APIs
  rather than building another aggregator.

## Modes

| Mode         | What it does                                                                     | Setup                                                   | Secrets                        |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------ |
| `direct`     | `fetch(feedUrl, { mode: "cors" })` in the browser.                               | None.                                                   | None.                          |
| `localProxy` | Sends the feed URL to a loopback HTTP service, which fetches it server-side.     | Run `tools/local-api` and paste its URL in settings.    | Optional shared bearer token.  |
| `freshrss`   | Uses FreshRSS's Google Reader API for subscriptions, articles, and read state.   | FreshRSS with API access enabled; API password.         | API password, session storage. |
| `miniflux`   | Uses the Miniflux REST API.                                                      | Miniflux instance and API token; CORS or reverse proxy. | API token, session storage.    |
| `lemmy`      | Uses Lemmy's native community/user RSS feeds through the direct/proxy transport. | None beyond the feed URL.                               | None.                          |

Transport selection is explicit. If a direct fetch fails, the app explains the
failure and offers the configured alternatives; it never silently reroutes a
feed through a third party.

The `Sources` section is the UI shell for this contract. It lands with the direct
transport in v0.2.0; the other rows are documented, not shipped. Folder
management is deferred until the FreshRSS phase, when imported categories need a
review and conflict flow.

## Direct fetch rules

- **HTTPS only.** An HTTPS page cannot fetch an `http://` feed (mixed content).
- **No credentials.** `credentials: "omit"`, no cookies, no `Authorization`
  header to the feed origin.
- **Time and size limits.** 10 s timeout; abort after 5 MB; check
  `Content-Type` against XML, RSS/Atom, or JSON Feed types.
- **Redirects.** Follow a small number of HTTPS redirects; reject a redirect to
  a non-HTTPS URL.
- **User agent.** A descriptive user agent is used where the browser allows it;
  feed owners can identify the demo.
- **Errors are classified.** CORS/network, timeout, HTTP status, unsupported
  content type, too large, parse failure. The UI shows the class and the next
  step, not a generic "failed".

## Add-feed flow (planned, v0.2.0)

1. Normalize the input (trim, add `https://` when missing, reject non-HTTP(S)).
2. If the URL returns HTML, look for
   `<link rel="alternate" type="application/rss+xml|atom+xml|feed+json">` and
   offer the discovered feed(s).
3. Fetch through the selected transport with the limits above.
4. Parse and normalize into articles. Reject empty or malformed feeds with a
   specific message.
5. Store feed metadata: title, site URL, feed URL, icon/colour, added time,
   last fetch, last error.
6. Fetch once so the board is populated immediately. Respect a per-feed cache
   interval (default 15 minutes) for later refreshes.

## Local proxy contract (planned, v0.3.0)

A single-file Bun server under `tools/local-api/`. It is an example for one
trusted user on the same machine, not a hosted service.

```
GET /health
  -> { "ok": true, "version": "0.1.0" }

GET /feed?url=<encoded feed URL>
  Authorization: Bearer <optional token>
  -> 200 with the upstream body
      Content-Type preserved
      X-Final-Url: the URL after redirects
  -> 4xx/5xx with { "error": { "code": "...", "message": "..." } }
```

The server must, at minimum:

- Bind `127.0.0.1` by default, never `0.0.0.0`.
- Allow only `http`/`https` targets; require HTTPS except for loopback targets.
- Resolve the hostname and reject loopback, private, link-local, multicast,
  unspecified, and cloud-metadata addresses. Re-check every redirect.
- Limit redirects to 5, timeout to 10 s, response body to 5 MB.
- Allow only feed/XML/JSON content types.
- Send CORS headers only for an explicit origin allowlist (the Pages origin and
  localhost dev origins), with `Vary: Origin`.
- Require a bearer token when one is configured. The token is generated or set
  by the user; it is never committed.
- Rate-limit per client (for example, 60 requests/minute).
- Avoid logging full feed URLs, which may contain private tokens.
- Strip cookies and never forward browser credentials upstream.

The app stores the proxy URL in `localStorage`; the token goes in
`sessionStorage` by default. Both are user-controlled and removable.

## FreshRSS

FreshRSS is the recommended sync backend if you want the same state on multiple
devices. Its Google Reader-compatible endpoint already sends
`Access-Control-Allow-Origin: *`, so a static page can call it directly.

Setup:

1. Enable **Allow API access** in FreshRSS administration → Authentication.
2. Set a dedicated **API password** in the user profile. Do not use the web
   login password.
3. Point the app at `https://your-host/api/greader.php`.

Useful endpoints:

```
POST /accounts/ClientLogin                 Email=...&Passwd=<api password>
GET  /reader/api/0/subscription/list       ?output=json
GET  /reader/api/0/stream/contents/reading-list?output=json
GET  /reader/api/0/unread-count            ?output=json
POST /reader/api/0/edit-tag                mark read / star
```

The first integration should be read-only: subscriptions, unread counts, and
article content. Marking read/starred can follow. Feed management stays in
FreshRSS; the app is the board UI, not a replacement admin panel.

## Miniflux

Miniflux exposes a REST API authenticated with `X-Auth-Token` (or HTTP Basic).
Recent releases support CORS; older deployments may need a reverse proxy that
adds the headers. Relevant endpoints:

```
GET /v1/me
GET /v1/feeds
GET /v1/entries?status=unread&limit=50
PUT /v1/entries            mark read
```

Treat the API token like a password. Because CORS support varies by version, the
app should show a clear "this instance did not allow the request" error and link
to the reverse-proxy note instead of falling back to a third-party proxy.

## Lemmy

Lemmy publishes native RSS for communities, users, local timelines, and the
federated timeline. Those are ordinary feeds and reuse the direct/proxy
transport. Read-only scope and the comment caveat are documented in
[LEMMY.md](LEMMY.md).

## OPML

OPML import/export is planned for v0.2.0:

- Flatten nested outlines; preserve folder names as tags if the UI supports them.
- Deduplicate by normalized feed URL.
- Report imported, skipped, and failed feeds separately.
- Export a plain OPML 2.0 file with feed titles and URLs.

An OPML export can contain private feed URLs. It is read locally, never uploaded,
and never committed to the repository.

## Failure UX

The board should fail honestly:

- A feed with a CORS error keeps its last cached articles and shows an inline
  banner with the reason and a link to the transport settings.
- A feed that has never loaded appears in the feed manager with the exact error;
  it does not produce an empty card.
- The demo posts are labeled as demo content and are hidden once real feeds are
  configured.
