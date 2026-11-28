import { html, nothing, type TemplateResult } from "lit";
import type { Feed } from "../data/types";
import { parseOpml, type OpmlResult } from "../lib/feed/opml";
import { feedHost } from "../lib/feed/url";
import { initials, relativeTime } from "../lib/format";
import { IkElement } from "../ui/base";
import { refreshIcon } from "../ui/icons";

export interface SourceSummary {
  id: string;
  title: string;
  color: string;
  unread: number;
  total: number;
}

interface ImportDetail extends OpmlResult {
  fileName: string;
}

export class IkSources extends IkElement {
  static properties = {
    feeds: { attribute: false },
    sources: { attribute: false },
    busyIds: { attribute: false },
    importStatus: { attribute: false },
    addError: { attribute: false },
    importing: { type: Boolean },
    feedUrl: { state: true },
    fileError: { state: true },
  };

  feeds: Feed[] = [];
  sources: SourceSummary[] = [];
  busyIds: string[] = [];
  importStatus: string | null = null;
  addError: string | null = null;
  importing = false;
  feedUrl = "";
  fileError = "";

  render(): TemplateResult {
    const failed = this.feeds.filter((feed) => feed.lastError);
    const busy = this.busyIds.length > 0 || this.importing;

    return html`
      <section class="ik-view ik-sources" aria-labelledby="ik-sources-title">
        <header class="ik-view__head">
          <div>
            <span class="ik-view__mark">[ NETWORK ]</span>
            <h2 id="ik-sources-title">Sources</h2>
            <p>
              Direct feeds, fetched by your browser. Only feeds that allow
              cross-origin reads will load until the local proxy lands.
            </p>
          </div>
          <button
            class="ik-view__action"
            type="button"
            ?disabled=${this.feeds.length === 0 || busy}
            @click=${this.refreshAll}
          >
            ${refreshIcon} Refresh all
          </button>
        </header>

        <div class="ik-source-tools">
          <form class="ik-source-add" @submit=${this.addFeed}>
            <label class="ik-source-add__label" for="ik-feed-url"
              >Feed URL</label
            >
            <div class="ik-source-add__row">
              <input
                id="ik-feed-url"
                class="ik-source-add__input"
                type="text"
                inputmode="url"
                autocomplete="off"
                spellcheck="false"
                placeholder="https://example.com/feed.xml"
                .value=${this.feedUrl}
                @input=${this.onFeedUrlInput}
              />
              <button
                class="ik-view__action ik-source-add__button"
                type="submit"
                ?disabled=${this.importing}
              >
                Add feed
              </button>
            </div>
          </form>

          <div class="ik-source-import">
            <span class="ik-source-add__label">OPML</span>
            <input
              id="ik-opml-input"
              class="ik-source-import__input"
              type="file"
              accept=".opml,.xml,text/xml,application/xml"
              ?disabled=${this.importing}
              @change=${this.importFile}
            />
            <button
              class="ik-view__action ik-source-import__button"
              type="button"
              ?disabled=${this.importing}
              @click=${this.openOpmlPicker}
            >
              ${this.importing ? "Importing…" : "Import OPML"}
            </button>
            <span class="ik-source-import__hint">
              Read locally. Never uploaded.
            </span>
          </div>
        </div>

        ${
          this.addError
            ? html`<p class="ik-source-message is-error" role="alert">
                ${this.addError}
              </p>`
            : nothing
        }
        ${
          this.fileError
            ? html`<p class="ik-source-message is-error" role="alert">
                ${this.fileError}
              </p>`
            : nothing
        }
        ${
          this.importStatus
            ? html`<p class="ik-source-message" role="status">
                ${this.importStatus}
              </p>`
            : nothing
        }
        ${
          this.feeds.length > 0
            ? this.renderFeeds()
            : html`
                <div class="ik-view__empty ik-source-empty">
                  <span>[ NO SOURCES ]</span>
                  <h3>Wire up the board</h3>
                  <p>
                    Paste a feed URL above, or import a FreshRSS/OPML export.
                    Imported feeds are fetched once so you can see which ones
                    allow direct browser access.
                  </p>
                </div>
              `
        }
        ${
          failed.length > 0
            ? html`
                <footer class="ik-view__foot ik-source-bulk">
                  <button
                    class="ik-view__action"
                    type="button"
                    ?disabled=${busy}
                    @click=${this.retryFailed}
                  >
                    ${refreshIcon} Retry failed (${failed.length})
                  </button>
                  <button
                    class="ik-view__action ik-view__action--danger"
                    type="button"
                    ?disabled=${busy}
                    @click=${this.removeFailed}
                  >
                    Remove failed (${failed.length})
                  </button>
                </footer>
              `
            : nothing
        }
      </section>
    `;
  }

  focusAdd(): void {
    this.querySelector<HTMLInputElement>("#ik-feed-url")?.focus();
  }

  private renderFeeds(): TemplateResult {
    return html`
      <ul class="ik-source-list">
        ${this.feeds.map((feed) => this.renderFeed(feed))}
      </ul>
    `;
  }

  private renderFeed(feed: Feed): TemplateResult {
    const summary = this.sources.find((source) => source.id === feed.id);
    const busy = this.busyIds.includes(feed.id);
    const error = feed.lastError;
    const relative = feed.lastFetchedAt ? relativeTime(feed.lastFetchedAt) : "";
    const updated = error
      ? "fetch failed"
      : !feed.lastFetchedAt
        ? "not fetched yet"
        : relative === "now"
          ? "updated just now"
          : `updated ${relative} ago`;

    return html`
      <li class=${`ik-source-card${error ? " is-error" : ""}`}>
        <button
          class="ik-source-card__open"
          type="button"
          aria-label=${`Open the board filtered to ${feed.title}`}
          @click=${() => this.openSource(feed.id)}
        >
          <span
            class="ik-avatar ik-avatar--source"
            style=${`--ik-avatar:${feed.color}`}
            >${initials(feed.title)}</span
          >
          <span class="ik-source-card__body">
            <strong>${feed.title}</strong>
            <span class="ik-source-card__url"
              >${feedHost(feed.siteUrl ?? feed.url)}</span
            >
            <span class="ik-source-card__meta">
              ${summary?.total ?? 0}
              ${(summary?.total ?? 0) === 1 ? "post" : "posts"}
              ${
                error
                  ? nothing
                  : summary && summary.unread > 0
                    ? html` · ${summary.unread} unread`
                    : html` · caught up`
              }
              · ${updated}
            </span>
            ${
              error
                ? html`<span class="ik-source-card__error">
                    <b>${error.code}</b> ${error.message}
                  </span>`
                : nothing
            }
          </span>
        </button>

        <span class="ik-source-card__actions">
          <button
            class=${`ik-source-card__action${busy ? " is-busy" : ""}`}
            type="button"
            aria-label=${`Refresh ${feed.title}`}
            title=${busy ? "Refreshing…" : "Refresh feed"}
            ?disabled=${busy}
            @click=${() => this.refreshFeed(feed.id)}
          >
            ${refreshIcon}
          </button>
          <button
            class="ik-source-card__action ik-source-card__action--remove"
            type="button"
            aria-label=${`Remove ${feed.title}`}
            title="Remove feed"
            ?disabled=${busy}
            @click=${() => this.removeFeed(feed.id)}
          >
            ×
          </button>
        </span>
      </li>
    `;
  }

  private onFeedUrlInput = (event: Event): void => {
    this.feedUrl = (event.target as HTMLInputElement).value;
  };

  private openOpmlPicker = (): void => {
    this.querySelector<HTMLInputElement>("#ik-opml-input")?.click();
  };

  private addFeed = (event: Event): void => {
    event.preventDefault();
    const url = this.feedUrl.trim();
    if (!url) return;

    this.dispatchEvent(
      new CustomEvent<string>("ik-add-feed", {
        detail: url,
        bubbles: true,
        composed: true,
      }),
    );
    this.feedUrl = "";
  };

  private async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    this.fileError = "";

    try {
      const text = await file.text();
      const result = parseOpml(text);
      const detail: ImportDetail = { ...result, fileName: file.name };
      this.dispatchEvent(
        new CustomEvent<ImportDetail>("ik-import-opml", {
          detail,
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      this.fileError =
        error instanceof Error
          ? error.message
          : "The OPML file could not be read.";
    }
  }

  private refreshAll = (): void => {
    this.dispatchEvent(
      new CustomEvent("ik-refresh", { bubbles: true, composed: true }),
    );
  };

  private refreshFeed = (id: string): void => {
    this.dispatchEvent(
      new CustomEvent<string>("ik-refresh-feed", {
        detail: id,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private removeFeed = (id: string): void => {
    this.dispatchEvent(
      new CustomEvent<string>("ik-remove-feed", {
        detail: id,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private retryFailed = (): void => {
    this.dispatchEvent(
      new CustomEvent("ik-retry-failed", { bubbles: true, composed: true }),
    );
  };

  private removeFailed = (): void => {
    this.dispatchEvent(
      new CustomEvent("ik-remove-failed", { bubbles: true, composed: true }),
    );
  };

  private openSource = (id: string): void => {
    this.dispatchEvent(
      new CustomEvent<string>("ik-open-source", {
        detail: id,
        bubbles: true,
        composed: true,
      }),
    );
  };
}

customElements.define("ik-sources", IkSources);
