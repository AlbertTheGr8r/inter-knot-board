import { html, nothing, type TemplateResult } from "lit";
import { demoArticles } from "../data/demo";
import type { Article } from "../data/types";
import { IkElement } from "../ui/base";
import { chevronDownIcon } from "../ui/icons";
import "./ik-board";
import "./ik-post-dialog";
import "./ik-topbar";
import type { IkPostDialog } from "./ik-post-dialog";

interface FilterOption {
  value: string;
  label: string;
}

export class IkApp extends IkElement {
  static properties = {
    articles: { attribute: false },
    tab: { state: true },
    feedFilter: { state: true },
  };

  articles: Article[] = demoArticles;
  tab = "board";
  feedFilter = "all";

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.onDocumentClick);
    document.addEventListener("keydown", this.onDocumentKeydown);
  }

  disconnectedCallback(): void {
    document.removeEventListener("click", this.onDocumentClick);
    document.removeEventListener("keydown", this.onDocumentKeydown);
    super.disconnectedCallback();
  }

  render(): TemplateResult {
    return html`
      <a class="ik-skip" href="#board">Skip to board</a>

      <ui-tabs
        default-value="board"
        @valuechange=${this.onTabChange}
        @ik-open-post=${this.onOpenPost}
      >
        <ik-topbar
          .unread=${this.unreadCount}
          .total=${this.articles.length}
          .level=${this.level}
          @ik-refresh=${this.onRefresh}
          @ik-density=${this.onDensity}
        ></ik-topbar>

        <main class="ik-main" id="board">
          <ui-tabs-panel value="board">
            <ik-board .articles=${this.visible}></ik-board>
          </ui-tabs-panel>
          <ui-tabs-panel value="unread">
            <ik-board .articles=${this.visible}></ik-board>
          </ui-tabs-panel>
          <ui-tabs-panel value="saved">
            <ik-board .articles=${this.visible}></ik-board>
          </ui-tabs-panel>
        </main>

        <details class="ik-filter">
          <summary class="ik-filter__button">
            <span>${this.filterLabel}</span>
            ${chevronDownIcon}
          </summary>
          <div class="ik-filter__menu" role="listbox" aria-label="Filter posts">
            ${this.coreFilters.map(
              (option) => html`
                <button
                  type="button"
                  role="option"
                  aria-selected=${
                    option.value === this.feedFilter ? "true" : "false"
                  }
                  @click=${() => this.setFilter(option.value)}
                >
                  <span>${option.label}</span>
                  ${
                    option.value === this.feedFilter
                      ? html`<span class="ik-filter__check">✓</span>`
                      : nothing
                  }
                </button>
              `,
            )}
            <div class="ik-filter__sep" role="separator"></div>
            ${this.feedFilters.map(
              (option) => html`
                <button
                  type="button"
                  role="option"
                  aria-selected=${
                    option.value === this.feedFilter ? "true" : "false"
                  }
                  @click=${() => this.setFilter(option.value)}
                >
                  <span>${option.label}</span>
                  ${
                    option.value === this.feedFilter
                      ? html`<span class="ik-filter__check">✓</span>`
                      : nothing
                  }
                </button>
              `,
            )}
          </div>
        </details>

        <ik-post-dialog></ik-post-dialog>
      </ui-tabs>
    `;
  }

  private get visible(): Article[] {
    return this.articles.filter((article) => {
      if (this.tab === "unread" && !article.unread) return false;
      if (this.tab === "saved" && !article.starred) return false;

      if (this.feedFilter === "unread" && !article.unread) return false;
      if (this.feedFilter === "saved" && !article.starred) return false;
      if (
        this.feedFilter.startsWith("feed:") &&
        article.feedId !== this.feedFilter.slice(5)
      ) {
        return false;
      }

      return true;
    });
  }

  private get unreadCount(): number {
    return this.articles.filter((article) => article.unread).length;
  }

  private get level(): number {
    return Math.max(1, Math.min(60, Math.floor(this.articles.length / 4) + 1));
  }

  private get coreFilters(): FilterOption[] {
    return [
      { value: "all", label: "All Feeds" },
      { value: "unread", label: "Unread only" },
      { value: "saved", label: "Saved" },
    ];
  }

  private get feedFilters(): FilterOption[] {
    const feeds = new Map<string, string>();
    for (const article of this.articles) {
      feeds.set(article.feedId, article.feedTitle);
    }
    return [...feeds].map(([id, label]) => ({
      value: `feed:${id}`,
      label,
    }));
  }

  private get filterLabel(): string {
    const selected = [...this.coreFilters, ...this.feedFilters].find(
      (option) => option.value === this.feedFilter,
    );
    return selected?.label ?? "All Feeds";
  }

  private onTabChange = (event: Event): void => {
    const detail = (event as CustomEvent<{ value: string }>).detail;
    if (detail?.value) {
      this.tab = detail.value;
    }
  };

  private onOpenPost = (event: CustomEvent<Article>): void => {
    const dialog = this.querySelector<IkPostDialog>("ik-post-dialog");
    void dialog?.open(event.detail);
  };

  private setFilter = (value: string): void => {
    this.feedFilter = value;
    const details = this.querySelector<HTMLDetailsElement>(".ik-filter");
    if (details) details.open = false;
  };

  private onRefresh = (): void => {
    this.classList.add("is-syncing");
    window.setTimeout(() => this.classList.remove("is-syncing"), 900);
  };

  private onDensity = (): void => {
    this.classList.toggle("is-compact");
  };

  private onDocumentClick = (event: MouseEvent): void => {
    const details = this.querySelector<HTMLDetailsElement>(".ik-filter");
    if (!details?.open) return;
    if (event.target instanceof Node && details.contains(event.target)) return;
    details.open = false;
  };

  private onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    const details = this.querySelector<HTMLDetailsElement>(".ik-filter");
    if (details?.open) {
      event.preventDefault();
      details.open = false;
    }
  };
}

customElements.define("ik-app", IkApp);
