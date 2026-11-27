import { html, nothing, type TemplateResult } from "lit";
import { demoArticles } from "../data/demo";
import type { Article } from "../data/types";
import { filterArticles, type Scope } from "../lib/article-filter";
import {
  applyDemoState,
  loadDemoState,
  saveDemoState,
} from "../lib/demo-state";
import {
  MINDFUL_IDLE_MS,
  MINDFUL_TICK_MS,
  createMindfulState,
  drainMindful,
  isMindfulEmpty,
  rechargeMindful,
  setMindfulCap,
  setMindfulMode,
  type MindfulMode,
  type MindfulState,
} from "../lib/mindful";
import { loadMindfulState, saveMindfulState } from "../lib/mindful-storage";
import {
  loadCompact,
  loadReadOnScroll,
  saveCompact,
  saveReadOnScroll,
} from "../lib/preferences";
import { IkElement } from "../ui/base";
import { chevronDownIcon } from "../ui/icons";
import "./ik-board";
import "./ik-history";
import "./ik-post-dialog";
import "./ik-proxy";
import "./ik-sources";
import "./ik-topbar";
import type { IkBoard } from "./ik-board";
import type { HistoryEntry } from "./ik-history";
import type { IkPostDialog } from "./ik-post-dialog";
import type { IkProxy } from "./ik-proxy";
import type { SourceSummary } from "./ik-sources";

type Section = "board" | "saved" | "sources" | "history";

interface ScopeOption {
  value: Scope;
  label: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

export class IkApp extends IkElement {
  static properties = {
    articles: { attribute: false },
    section: { state: true },
    scope: { state: true },
    sourceFilter: { state: true },
    openedAt: { state: true },
    mindful: { state: true },
    compact: { state: true },
    readOnScroll: { state: true },
    pageSize: { state: true },
    limit: { state: true },
  };

  private persistedState = loadDemoState();

  articles: Article[] = applyDemoState(demoArticles, this.persistedState);
  section: Section = "board";
  scope: Scope = "all";
  sourceFilter: string | null = null;
  openedAt = new Map(Object.entries(this.persistedState?.openedAt ?? {}));
  mindful: MindfulState = loadMindfulState();
  compact = loadCompact();
  readOnScroll = loadReadOnScroll();
  pageSize = 24;
  limit = 0;

  private timerId = 0;
  private lastInteraction = Date.now();
  private hiddenAt = 0;
  private postOpen = false;
  private proxyOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.onDocumentClick);
    document.addEventListener("keydown", this.onDocumentKeydown);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("pagehide", this.onPageHide);
    window.addEventListener("pointerdown", this.onActivity, { passive: true });
    window.addEventListener("wheel", this.onActivity, { passive: true });
    window.addEventListener("scroll", this.onActivity, { passive: true });
    window.addEventListener("resize", this.onResize);
    this.classList.toggle("is-compact", this.compact);
    this.lastInteraction = Date.now();
    this.timerId = window.setInterval(this.tickMindful, MINDFUL_TICK_MS);
  }

  protected firstUpdated(): void {
    void this.updateComplete.then(() => this.syncPageSize(true));
  }

  disconnectedCallback(): void {
    document.removeEventListener("click", this.onDocumentClick);
    document.removeEventListener("keydown", this.onDocumentKeydown);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("pagehide", this.onPageHide);
    window.removeEventListener("pointerdown", this.onActivity);
    window.removeEventListener("wheel", this.onActivity);
    window.removeEventListener("scroll", this.onActivity);
    window.removeEventListener("resize", this.onResize);
    window.clearInterval(this.timerId);
    super.disconnectedCallback();
  }

  render(): TemplateResult {
    return html`
      <a class="ik-skip" href="#board">Skip to board</a>

      <ui-tabs
        .value=${this.section}
        @valuechange=${this.onSectionChange}
        @ik-open-post=${this.onOpenPost}
      >
        <ik-topbar
          .unread=${this.unreadCount}
          .mindful=${this.mindful}
          @ik-refresh=${this.onRefresh}
          @ik-open-proxy=${this.onOpenProxy}
        ></ik-topbar>

        <main class="ik-main" id="board">
          <ui-tabs-panel value="board">
            <ik-board
              .articles=${this.pagedVisible}
              .readOnScroll=${this.readOnScroll && this.scope !== "unread"}
              @ik-mark-read=${this.onMarkRead}
            ></ik-board>
            ${this.renderBoardFoot()}
          </ui-tabs-panel>

          <ui-tabs-panel value="saved">
            <ik-board
              .articles=${this.savedArticles}
              .readOnScroll=${this.readOnScroll && this.scope !== "unread"}
              @ik-mark-read=${this.onMarkRead}
            ></ik-board>
          </ui-tabs-panel>

          <ui-tabs-panel value="sources">
            <ik-sources
              .sources=${this.sourceSummaries}
              @ik-open-source=${this.onOpenSource}
              @ik-refresh=${this.onRefresh}
            ></ik-sources>
          </ui-tabs-panel>

          <ui-tabs-panel value="history">
            <ik-history
              .entries=${this.historyEntries}
              @ik-open-post=${this.onOpenPost}
            ></ik-history>
          </ui-tabs-panel>
        </main>

        ${this.showFilter ? this.renderFilter() : nothing}

        <ik-post-dialog
          @ik-post-closed=${this.onPostClosed}
          @ik-toggle-save=${this.onToggleSave}
        ></ik-post-dialog>

        <ik-proxy
          .mindful=${this.mindful}
          .compact=${this.compact}
          .readOnScroll=${this.readOnScroll}
          @ik-mindful-cap=${this.onMindfulCap}
          @ik-mindful-mode=${this.onMindfulMode}
          @ik-mindful-reset=${this.onMindfulReset}
          @ik-density=${this.onDensity}
          @ik-read-on-scroll=${this.onReadOnScroll}
          @ik-proxy-closed=${this.onProxyClosed}
        ></ik-proxy>
      </ui-tabs>
    `;
  }

  private renderFilter(): TemplateResult {
    const options = SCOPE_OPTIONS;
    const sources = this.filterSources;

    return html`
      <details class="ik-filter">
        <summary class="ik-filter__button">
          <span>${this.filterLabel}</span>
          ${chevronDownIcon}
        </summary>

        <div class="ik-filter__menu">
          <div class="ik-filter__scope" role="group" aria-label="Post scope">
            ${options.map(
              (option) => html`
                <button
                  type="button"
                  aria-pressed=${option.value === this.scope ? "true" : "false"}
                  @click=${() => this.setScope(option.value)}
                >
                  <span>${option.label}</span>
                  ${
                    option.value === this.scope
                      ? html`<span class="ik-filter__check">✓</span>`
                      : nothing
                  }
                </button>
              `,
            )}
          </div>

          <div
            class="ik-filter__sources"
            role="listbox"
            aria-label="Filter by source"
          >
            <span class="ik-filter__label">Sources</span>
            <button
              type="button"
              role="option"
              aria-selected=${this.sourceFilter === null ? "true" : "false"}
              @click=${() => this.setSource(null)}
            >
              <span class="ik-filter__source-name">All sources</span>
              ${
                this.sourceFilter === null
                  ? html`<span class="ik-filter__check">✓</span>`
                  : nothing
              }
            </button>
            ${sources.map(
              (source) => html`
                <button
                  type="button"
                  role="option"
                  aria-selected=${
                    this.sourceFilter === source.id ? "true" : "false"
                  }
                  @click=${() => this.setSource(source.id)}
                >
                  <span
                    class="ik-filter__source-dot"
                    style=${`--ik-source:${source.color}`}
                  ></span>
                  <span class="ik-filter__source-name">${source.title}</span>
                  <span class="ik-filter__source-count">${source.unread}</span>
                </button>
              `,
            )}
          </div>
        </div>
      </details>
    `;
  }

  private renderBoardFoot(): TemplateResult | typeof nothing {
    if (this.visible.length === 0) return nothing;

    if (!this.hasMore) {
      return html`
        <div class="ik-board-foot">
          <span class="ik-board-foot__mark">[ END ]</span>
          <span>You're all caught up.</span>
        </div>
      `;
    }

    if (isMindfulEmpty(this.mindful)) {
      return html`
        <div class="ik-board-foot">
          <button class="ik-board-foot__button" type="button" disabled>
            Load more
          </button>
          <button
            class="ik-board-foot__link"
            type="button"
            @click=${this.onOpenProxy}
          >
            Cap reached. Refill in Proxy.
          </button>
        </div>
      `;
    }

    return html`
      <div class="ik-board-foot">
        <button
          class="ik-board-foot__button"
          type="button"
          @click=${this.loadMore}
        >
          Load more
        </button>
      </div>
    `;
  }

  private get showFilter(): boolean {
    return this.section === "board" || this.section === "saved";
  }

  private get sectionArticles(): Article[] {
    if (this.section === "saved") {
      return this.articles.filter((article) => article.starred);
    }
    return this.articles;
  }

  private get visible(): Article[] {
    return filterArticles(this.articles, this.scope, this.sourceFilter);
  }

  private get pagedVisible(): Article[] {
    return this.visible.slice(0, this.limit || this.pageSize);
  }

  private get hasMore(): boolean {
    return this.visible.length > (this.limit || this.pageSize);
  }

  private get savedArticles(): Article[] {
    return filterArticles(
      this.articles.filter((article) => article.starred),
      this.scope,
      this.sourceFilter,
    );
  }

  private get filterSources(): SourceSummary[] {
    return this.summarize(this.sectionArticles);
  }

  private get sourceSummaries(): SourceSummary[] {
    return this.summarize(this.articles);
  }

  private get historyEntries(): HistoryEntry[] {
    return [...this.openedAt.entries()]
      .map(([id, openedAt]) => {
        const article = this.articles.find((item) => item.id === id);
        return article ? { article, openedAt } : null;
      })
      .filter((entry): entry is HistoryEntry => entry !== null)
      .sort((a, b) => b.openedAt - a.openedAt);
  }

  private get unreadCount(): number {
    return this.articles.filter((article) => article.unread).length;
  }

  private get filterLabel(): string {
    if (this.sourceFilter) {
      return (
        this.articles.find((article) => article.feedId === this.sourceFilter)
          ?.feedTitle ?? "Source"
      );
    }

    return (
      SCOPE_OPTIONS.find((option) => option.value === this.scope)?.label ??
      "All"
    );
  }

  private summarize(articles: Article[]): SourceSummary[] {
    const sources = new Map<string, SourceSummary>();

    for (const article of articles) {
      const existing = sources.get(article.feedId);
      if (existing) {
        existing.total += 1;
        if (article.unread) existing.unread += 1;
        continue;
      }

      sources.set(article.feedId, {
        id: article.feedId,
        title: article.feedTitle,
        color: article.feedColor,
        unread: article.unread ? 1 : 0,
        total: 1,
      });
    }

    return [...sources.values()].sort((a, b) => a.title.localeCompare(b.title));
  }

  private onSectionChange = (event: Event): void => {
    const detail = (event as CustomEvent<{ value: Section }>).detail;
    if (!detail?.value) return;

    if (this.section === "board" && detail.value !== "board") {
      this.pauseMindful();
    }
    this.section = detail.value;
    this.closeFilter();
    if (detail.value === "board") this.resetPagination();
  };

  private onOpenSource = (event: CustomEvent<string>): void => {
    this.sourceFilter = event.detail;
    this.section = "board";
    this.closeFilter();
    this.resetPagination();
  };

  private onOpenPost = (event: CustomEvent<Article>): void => {
    const article = event.detail;
    this.postOpen = true;
    this.pauseMindful();
    this.markOpened(article);
    const updated =
      this.articles.find((item) => item.id === article.id) ?? article;
    const dialog = this.querySelector<IkPostDialog>("ik-post-dialog");
    void dialog?.open(updated);
  };

  private onPostClosed = (): void => {
    this.postOpen = false;
    this.lastInteraction = Date.now();
    this.pauseMindful();
  };

  private onOpenProxy = (): void => {
    this.proxyOpen = true;
    this.pauseMindful();
    const proxy = this.querySelector<IkProxy>("ik-proxy");
    void proxy?.open();
  };

  private onProxyClosed = (): void => {
    this.proxyOpen = false;
    this.lastInteraction = Date.now();
    this.pauseMindful();
  };

  private onMindfulCap = (event: CustomEvent<number>): void => {
    const cap = event.detail;
    const now = Date.now();
    this.updateMindful(
      setMindfulMode(setMindfulCap(this.mindful, cap, now), "mindful", now),
    );
    this.lastInteraction = now;
  };

  private onMindfulMode = (event: CustomEvent<MindfulMode>): void => {
    const now = Date.now();
    this.updateMindful(setMindfulMode(this.mindful, event.detail, now));
    this.lastInteraction = now;
  };

  private onMindfulReset = (): void => {
    const now = Date.now();
    this.updateMindful(createMindfulState(now, this.mindful.capMinutes));
    this.lastInteraction = now;
  };

  private onActivity = (): void => {
    const now = Date.now();
    const wasIdle = now - this.lastInteraction > MINDFUL_IDLE_MS;
    this.lastInteraction = now;
    if (wasIdle) this.pauseMindful(now);
  };

  private onVisibilityChange = (): void => {
    const now = Date.now();
    if (document.visibilityState === "hidden") {
      this.hiddenAt = now;
      this.pauseMindful(now);
      return;
    }

    const away = this.hiddenAt > 0 ? now - this.hiddenAt : 0;
    this.hiddenAt = 0;
    this.lastInteraction = now;
    this.updateMindful(rechargeMindful(this.mindful, away, now));
  };

  private onPageHide = (): void => {
    this.pauseMindful();
  };

  private tickMindful = (): void => {
    const now = Date.now();
    const canDrain =
      document.visibilityState === "visible" &&
      !this.postOpen &&
      !this.proxyOpen &&
      this.section === "board" &&
      now - this.lastInteraction <= MINDFUL_IDLE_MS;

    if (!canDrain) {
      this.pauseMindful(now);
      return;
    }

    const elapsed = now - this.mindful.updatedAt;
    if (elapsed < 1000) return;
    this.updateMindful(drainMindful(this.mindful, elapsed, now));
  };

  private pauseMindful(now = Date.now()): void {
    this.mindful = { ...this.mindful, updatedAt: now };
    saveMindfulState(this.mindful);
  }

  private updateMindful(next: MindfulState): void {
    this.mindful = next;
    saveMindfulState(next);
  }

  private onToggleSave = (
    event: CustomEvent<{ id: string; starred: boolean }>,
  ) => {
    const { id, starred } = event.detail;
    this.articles = this.articles.map((article) =>
      article.id === id ? { ...article, starred } : article,
    );
    this.persistReadingState();
  };

  private onMarkRead = (event: CustomEvent<string[]>): void => {
    const ids = new Set(event.detail);
    this.articles = this.articles.map((article) =>
      ids.has(article.id) ? { ...article, unread: false } : article,
    );
    this.persistReadingState();
  };

  private onReadOnScroll = (event: CustomEvent<boolean>): void => {
    this.readOnScroll = event.detail;
    saveReadOnScroll(this.readOnScroll);
  };

  private markOpened(article: Article): void {
    this.articles = this.articles.map((item) =>
      item.id === article.id ? { ...item, unread: false } : item,
    );

    const opened = new Map(this.openedAt);
    opened.set(article.id, Date.now());
    this.openedAt = opened;
    this.persistReadingState();
  }

  private persistReadingState(): void {
    saveDemoState({
      readIds: this.articles
        .filter((article) => !article.unread)
        .map((article) => article.id),
      starredIds: this.articles
        .filter((article) => article.starred)
        .map((article) => article.id),
      openedAt: Object.fromEntries(this.openedAt),
    });
  }

  private setScope(value: Scope): void {
    this.scope = value;
    this.closeFilter();
    this.resetPagination();
  }

  private setSource(value: string | null): void {
    this.sourceFilter = value;
    this.closeFilter();
    this.resetPagination();
  }

  private loadMore = (): void => {
    if (isMindfulEmpty(this.mindful)) return;

    const board = this.getBoard();
    const next = board?.getBatchSize() ?? this.pageSize;
    this.pageSize = next;
    this.limit = (this.limit || next) + next;
  };

  private resetPagination(): void {
    this.limit = 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    void this.updateComplete.then(() => this.syncPageSize(true));
  }

  private syncPageSize(force = false): void {
    if (this.section !== "board") return;

    const board = this.getBoard();
    const size = board?.getBatchSize() ?? this.pageSize;
    this.pageSize = size;
    if (force || this.limit === 0) {
      this.limit = size;
    }
  }

  private getBoard(): IkBoard | null {
    return this.querySelector<IkBoard>('ui-tabs-panel[value="board"] ik-board');
  }

  private onResize = (): void => {
    this.syncPageSize(false);
  };

  private closeFilter(): void {
    const details = this.querySelector<HTMLDetailsElement>(".ik-filter");
    if (details) details.open = false;
  }

  private onRefresh = (): void => {
    this.classList.add("is-syncing");
    window.setTimeout(() => this.classList.remove("is-syncing"), 900);
  };

  private onDensity = (event: Event): void => {
    const detail = (event as CustomEvent<boolean>).detail;
    this.compact = typeof detail === "boolean" ? detail : !this.compact;
    this.classList.toggle("is-compact", this.compact);
    saveCompact(this.compact);
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
