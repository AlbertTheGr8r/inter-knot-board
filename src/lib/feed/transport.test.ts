import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeed } from "./transport";

interface MockResponse {
  ok: boolean;
  status: number;
  url: string;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
  text: () => Promise<string>;
}

function response(
  body: string,
  options: {
    status?: number;
    contentType?: string;
    contentLength?: number;
    url?: string;
  } = {},
): MockResponse {
  const headers = new Headers();
  if (options.contentType) headers.set("content-type", options.contentType);
  if (options.contentLength !== undefined) {
    headers.set("content-length", String(options.contentLength));
  }

  return {
    ok: (options.status ?? 200) >= 200 && (options.status ?? 200) < 300,
    status: options.status ?? 200,
    url: options.url ?? "https://example.com/feed.xml",
    headers,
    body: null,
    text: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchFeed", () => {
  it("reads a successful feed with no credentials", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      response("<rss></rss>", { contentType: "application/rss+xml" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFeed("https://example.com/feed.xml");
    expect(result.body).toBe("<rss></rss>");
    expect(result.contentType).toContain("rss");
    expect(result.finalUrl).toBe("https://example.com/feed.xml");
    expect(result.fetchedAt).toMatch(/T/);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.credentials).toBe("omit");
    expect(init.mode).toBe("cors");
  });

  it("classifies a CORS/network TypeError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(
      fetchFeed("https://example.com/feed.xml"),
    ).rejects.toMatchObject({ code: "cors" });
  });

  it("classifies HTTP failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response("nope", { status: 503 })),
    );

    await expect(
      fetchFeed("https://example.com/feed.xml"),
    ).rejects.toMatchObject({ code: "http", status: 503 });
  });

  it("rejects HTML pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response("<html></html>", { contentType: "text/html; charset=utf-8" }),
      ),
    );

    await expect(
      fetchFeed("https://example.com/feed.xml"),
    ).rejects.toMatchObject({ code: "unsupported" });
  });

  it("rejects declared responses over 5 MB", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response("small", {
          contentType: "application/rss+xml",
          contentLength: 6 * 1024 * 1024,
        }),
      ),
    );

    await expect(
      fetchFeed("https://example.com/feed.xml"),
    ).rejects.toMatchObject({ code: "too-large" });
  });

  it("times out and aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    );

    await expect(
      fetchFeed("https://example.com/feed.xml", { timeoutMs: 5 }),
    ).rejects.toMatchObject({ code: "timeout" });
  });
});
