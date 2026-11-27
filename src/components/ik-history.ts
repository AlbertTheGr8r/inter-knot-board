import { html, type TemplateResult } from "lit";
import type { Article } from "../data/types";
import { initials, relativeTime } from "../lib/format";
import { IkElement } from "../ui/base";

export interface HistoryEntry {
  article: Article;
  openedAt: number;
}

export class IkHistory extends IkElement {
  static properties = {
    entries: { attribute: false },
  };

  entries: HistoryEntry[] = [];

  render(): TemplateResult {
    return html`
      <section class="ik-view ik-history" aria-labelledby="ik-history-title">
        <header class="ik-view__head">
          <div>
            <span class="ik-view__mark">[ JOURNEY ]</span>
            <h2 id="ik-history-title">History</h2>
            <p>
              Posts you actually opened. Scrolling the board never adds anything
              here.
            </p>
          </div>
          <span class="ik-view__count">${this.entries.length} opened</span>
        </header>

        ${
          this.entries.length > 0
            ? html`
                <ol class="ik-history-list">
                  ${this.entries.map(
                    ({ article, openedAt }) => html`
                      <li>
                        <button
                          class="ik-history-row"
                          type="button"
                          @click=${() => this.openPost(article)}
                        >
                          <span class="ik-history-row__time">
                            ${relativeTime(new Date(openedAt).toISOString())}
                          </span>
                          <span
                            class="ik-avatar ik-avatar--source"
                            style=${`--ik-avatar:${article.feedColor}`}
                            >${initials(article.feedTitle)}</span
                          >
                          <span class="ik-history-row__body">
                            <span class="ik-history-row__source"
                              >${article.feedTitle}</span
                            >
                            <strong>
                              <span class="ik-tag">[${article.tag}]</span>
                              ${article.title}
                            </strong>
                          </span>
                          <span class="ik-history-row__open">Open</span>
                        </button>
                      </li>
                    `,
                  )}
                </ol>
              `
            : html`
                <div class="ik-view__empty">
                  <span>[ EMPTY ]</span>
                  <h3>Nothing opened yet</h3>
                  <p>
                    Open a post from the board and it will be filed here. Your
                    reading history stays in this browser.
                  </p>
                </div>
              `
        }
      </section>
    `;
  }

  private openPost(article: Article): void {
    this.dispatchEvent(
      new CustomEvent<Article>("ik-open-post", {
        detail: article,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

customElements.define("ik-history", IkHistory);
