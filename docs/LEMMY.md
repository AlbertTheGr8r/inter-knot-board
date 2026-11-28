# Lemmy integration

Lemmy is the easiest fediverse integration to add because it already publishes
RSS. A first version does not need an account, an API token, or a new parser:
point the reader at a community feed and it is an ordinary post source.

## Native feeds

Lemmy documents these endpoints on any instance:

| Scope                | URL                                 |
| -------------------- | ----------------------------------- |
| All (federated)      | `/feeds/all.xml?sort=Hot`           |
| Local                | `/feeds/local.xml?sort=Hot`         |
| Community            | `/feeds/c/{community}.xml?sort=Hot` |
| User                 | `/feeds/u/{user}.xml?sort=Hot`      |
| Front page (private) | `/feeds/front.xml/{jwt_token}`      |
| Inbox (private)      | `/feeds/inbox.xml/{jwt_token}`      |
| Modlog (private)     | `/feeds/modlog.xml/{jwt_token}`     |

Supported sort values include `Active`, `Hot`, `Scaled`, `New`, `Old`,
`MostComments`, and `NewComments`.

Example:

```
https://lemmy.world/feeds/c/technology.xml?sort=New
```

The public feeds are RSS 2.0 and fit the same parser/normalizer as any other
feed. The app can offer a small helper that builds the URL from
`instance + community + sort`, but the stored value remains a normal feed URL.

## Scope for the first version

- **Read-only.** No login, voting, commenting, subscribing, or moderation.
- **No write actions.** Posting or commenting is out of scope. The post reader
  keeps room for a future action, but it needs a separate auth and security
  design before it can exist.
- **Public feeds only.** Do not ask for a JWT or store one. The
  `front`/`inbox`/`modlog` feeds are out of scope.
- **No invented comments.** A community RSS feed contains posts, not the comment
  tree. The post dialog shows the post body and a link to the original thread;
  the comments rail stays empty until a read-only comment source fills it.
- **Respect the instance.** Rate-limit refresh, identify the client, and do not
  hammer small instances. Cache articles locally like any other feed.
- **NSFW and instance rules.** The reader does not add a content filter in v1.
  If a community is NSFW, the feed is NSFW. A future setting can hide NSFW tags
  when the feed exposes them.

## CORS and transport

Lemmy instances set a `cors_origin` option. Some allow browser clients; others
do not. The reader should:

1. Try the direct transport.
2. On a CORS/network failure, keep the last cached posts and show the normal
   "use the local proxy" guidance.
3. Never route the request through an unconfigured public proxy.

This is the same transport path as any RSS feed, so no Lemmy-specific fetch code
is required.

## Comments (optional, later)

If comments are added, use the public read endpoints:

```
GET /api/v3/post/list?community_name={community}&sort=New&limit=20
GET /api/v3/comment/list?post_id={id}&sort=Top&limit=50
```

Those are read-only and do not require authentication on most instances. The
post dialog already has a comments rail with floor badges, so the mapping is
mostly:

- Lemmy comment `content` → sanitized comment body.
- `creator.name` / `creator.avatar` → author row.
- `published` → relative time.
- `path` depth → indentation if threading is added.

Constraints:

- API versioning is instance-dependent (`/api/v3/...` on the 0.19 line). Treat
  failures as non-fatal and fall back to the RSS post.
- Do not send credentials. Do not add voting or posting without a separate
  security review.
- Cache comments with the article; they are not real-time.

## Third-party option

Open RSS offers per-post comment feeds and richer Lemmy views. It is a useful
fallback for users who want comments without an API call, but it is a third
party that sees the URLs. It must remain opt-in and should not be the default.

## Status

Planned for **v0.5.0**, after the feed core and the local proxy. The native RSS
path is small enough that it can ship as soon as the generic feed pipeline is
stable; comments are an additive layer, not a blocker.
