import { FeedError } from "./errors";
import { isHttpsUrl } from "./url";

export interface FeedResponse {
  body: string;
  contentType: string;
  finalUrl: string;
  fetchedAt: string;
}

export interface FetchFeedOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxBytes?: number;
}

export const FEED_TIMEOUT_MS = 10_000;
export const FEED_MAX_BYTES = 5 * 1024 * 1024;

function textDecoderFor(contentType: string): TextDecoder {
  const charset = /charset\s*=\s*"?([^";\s]+)/i.exec(contentType)?.[1];
  try {
    return new TextDecoder(charset || "utf-8");
  } catch {
    return new TextDecoder("utf-8");
  }
}

function isTextFeedType(contentType: string): boolean {
  if (!contentType) return true;
  return /(?:xml|rss|atom|json|text\/plain|application\/octet-stream)/i.test(
    contentType,
  );
}

/**
 * Direct browser transport. It intentionally knows nothing about parsing.
 * CORS failures are surfaced as a distinct code so the UI can explain that the
 * feed is reachable but the browser is not allowed to read it.
 */
export async function fetchFeed(
  url: string,
  options: FetchFeedOptions = {},
): Promise<FeedResponse> {
  const timeoutMs = options.timeoutMs ?? FEED_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? FEED_MAX_BYTES;
  const securePage =
    typeof location !== "undefined" && location.protocol === "https:";

  if (securePage && !isHttpsUrl(url)) {
    throw new FeedError(
      "network",
      "This page is HTTPS, so it cannot fetch an HTTP feed.",
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  let timer = 0;
  const onAbort = (): void => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  timer = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept:
            "application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, application/json;q=0.9, */*;q=0.5",
        },
      });
    } catch (error) {
      if (timedOut) {
        throw new FeedError(
          "timeout",
          `The feed did not answer within ${Math.round(timeoutMs / 1000)} seconds.`,
        );
      }
      if (options.signal?.aborted) {
        throw new FeedError("network", "The request was cancelled.");
      }
      if (error instanceof TypeError) {
        throw new FeedError(
          "cors",
          "The browser blocked this feed. It does not allow direct cross-origin fetches (CORS); the local proxy is the next milestone.",
        );
      }
      throw new FeedError(
        "network",
        "The feed could not be reached. Check the URL and your connection.",
      );
    }

    if (!response.ok) {
      throw new FeedError(
        "http",
        `The feed server answered with HTTP ${response.status}.`,
        response.status,
      );
    }

    if (securePage && response.url && !isHttpsUrl(response.url)) {
      throw new FeedError(
        "network",
        "The feed redirected to an insecure HTTP URL.",
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (/text\/html/i.test(contentType)) {
      throw new FeedError(
        "unsupported",
        "This URL returned a web page, not a feed. Use the feed URL, not the site URL.",
      );
    }
    if (!isTextFeedType(contentType)) {
      throw new FeedError(
        "unsupported",
        `This URL returned ${contentType || "an unsupported content type"}, not a feed.`,
      );
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new FeedError(
        "too-large",
        "The feed is larger than the 5 MB direct-fetch limit.",
      );
    }

    let body: string;
    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          total += value.byteLength;
          if (total > maxBytes) {
            await reader.cancel();
            throw new FeedError(
              "too-large",
              "The feed is larger than the 5 MB direct-fetch limit.",
            );
          }
          chunks.push(value);
        }
      } catch (error) {
        if (error instanceof FeedError) throw error;
        if (timedOut) {
          throw new FeedError(
            "timeout",
            `The feed did not finish within ${Math.round(timeoutMs / 1000)} seconds.`,
          );
        }
        throw new FeedError("network", "The feed response was interrupted.");
      }

      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      body = textDecoderFor(contentType).decode(merged);
    } else {
      body = await response.text();
      if (new TextEncoder().encode(body).byteLength > maxBytes) {
        throw new FeedError(
          "too-large",
          "The feed is larger than the 5 MB direct-fetch limit.",
        );
      }
    }

    return {
      body,
      contentType,
      finalUrl: response.url || url,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    globalThis.clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}
