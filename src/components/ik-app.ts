import { html, nothing, type TemplateResult } from "lit";
import type { Article, Feed, JournalEntry } from "../data/types";
import { filterArticles, type Scope } from "../lib/article-filter";
import {
  FeedError,
  errorCode,
  errorMessage,
  statusOf,
} from "../lib/feed/errors";
import { normalizeFeed } from "../lib/feed/normalize";
import type { OpmlResult } from "../lib/feed/opml";
import { parseFeed } from "../lib/feed/parse";
import {
  isFeedStale,
  mapWithConcurrency,
  REFRESH_CONCURRENCY,
} from "../lib/feed/refresh";
import {
  applyReadingState,
  emptyReadingState,
  flattenCache,
  loadArticleCache,
  loadFeeds,
  loadReadingState,
  mergeArticles,
  saveArticleCache,
  saveFeeds,
  saveReadingState,
  type ArticleCache,
  type ReadingState,
} from "../lib/feed/store";
import { fetchFeed } from "../lib/feed/transport";
import {
  feedColorForUrl,
  feedIdForUrl,
  feedTitleFromUrl,
  normalizeFeedUrl,
} from "../lib/feed/url";
import {
  JOURNAL_MAX_LENGTH,
  addJournalEntry,
  journalArticleIds,
  loadJournal,
  removeJournalEntry,
  saveJournal,
} from "../lib/journal-store";
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
import { infoIcon } from "../ui/icons";
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
import type { IkSources, SourceSummary } from "./ik-sources";

type Section = "board" | "saved" | "sources" | "history";

interface ScopeOption {
  value: Scope;
  label: string;
}

interface FeedSeed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  folder?: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "journal", label: "Journal" },
];

export class IkApp extends IkElement {
  static properties = {
    feeds: { state: true },
    articles: { state: true },
    journalEntries: { state: true },
    journalInfoOpen: { state: true },
    loading: { state: true },
    busyIds: { state: true },
    importing: { state: true },
    importStatus: { state: true },
    addError: { state: true },
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

  feeds: Feed[] = [];
  articles: Article[] = [];
  journalEntries: JournalEntry[] = [];
  journalInfoOpen = false;
  loading = true;
  busyIds: string[] = [];
  importing = false;
  importStatus: string | null = null;
  addError: string | null = null;
  section: Section = "board";
  scope: Scope = "all";
  sourceFilter: string | null = null;
  openedAt = new Map<string, number>();
  mindful: MindfulState = loadMindfulState();
  compact = loadCompact();
  readOnScroll = loadReadOnScroll();
  pageSize = 24;
  limit = 0;

  private cache: ArticleCache = {};
  private reading: ReadingState = emptyReadingState();
  private persistChain: Promise<void> = Promise.resolve();
  private readingChain: Promise<void> = Promise.resolve();
  private journalChain: Promise<void> = Promise.resolve();
  private statusToken = 0;
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
    void this.bootstrap();
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
    const busy = this.busyIds.length > 0 || this.importing;

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
          .busy=${busy}
          @ik-refresh=${this.onRefresh}
          @ik-open-proxy=${this.onOpenProxy}
        ></ik-topbar>

        <main class="ik-main" id="board">
          <ui-tabs-panel value="board">
            ${this.renderBoardPanel()}
          </ui-tabs-panel>

          <ui-tabs-panel value="saved">
            ${this.renderSavedPanel()}
          </ui-tabs-panel>

          <ui-tabs-panel value="sources">
            <ik-sources
              .feeds=${this.feeds}
              .sources=${this.sourceSummaries}
              .busyIds=${this.busyIds}
              .importing=${this.importing}
              .importStatus=${this.importStatus}
              .addError=${this.addError}
              @ik-add-feed=${this.onAddFeed}
              @ik-import-opml=${this.onImportOpml}
              @ik-refresh-feed=${this.onRefreshFeed}
              @ik-remove-feed=${this.onRemoveFeed}
              @ik-refresh=${this.onRefresh}
              @ik-retry-failed=${this.onRetryFailed}
              @ik-remove-failed=${this.onRemoveFailed}
              @ik-open-source=${this.onOpenSource}
            ></ik-sources>
          </ui-tabs-panel>

          <ui-tabs-panel value="history">
            <ik-history
              .entries=${this.historyEntries}
              @ik-open-post=${this.onOpenPost}
            ></ik-history>
          </ui-tabs-panel>
        </main>

        ${this.showFilter && !this.loading ? this.renderFilter() : nothing}

        <ik-post-dialog
          .journalEntries=${this.journalEntries}
          @ik-post-closed=${this.onPostClosed}
          @ik-toggle-save=${this.onToggleSave}
          @ik-journal-add=${this.onJournalAdd}
          @ik-journal-delete=${this.onJournalDelete}
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

  private renderBoardPanel(): TemplateResult {
    if (this.loading) {
      return html`
        <div class="ik-board ik-board--empty">
          <div class="ik-empty">
            <span class="ik-empty__mark">[ SYNCING ]</span>
            <h2>Reading the wires</h2>
            <p>Loading your cached board.</p>
          </div>
        </div>
      `;
    }

    if (this.articles.length === 0) {
      return this.renderEmptyBoard();
    }

    if (this.pagedVisible.length === 0) {
      if (this.scope === "journal" && this.journalEntries.length === 0) {
        return html`
          <div class="ik-board ik-board--empty">
            <div class="ik-empty">
              <span class="ik-empty__mark">[ JOURNAL ]</span>
              <h2>No field notes yet</h2>
              <p>
                Open a post and choose <strong>Write to Journal</strong>. Your
                private field log stays on this device.
              </p>
              <button
                class="ik-empty__button"
                type="button"
                @click=${this.clearFilters}
              >
                Back to the board
              </button>
            </div>
          </div>
        `;
      }

      return html`
        <div class="ik-board ik-board--empty">
          <div class="ik-empty">
            <span class="ik-empty__mark">[ EMPTY ]</span>
            <h2>No posts match this filter</h2>
            <p>
              Clear the source or scope filter to see the rest of the board.
            </p>
            <button
              class="ik-empty__button"
              type="button"
              @click=${this.clearFilters}
            >
              Clear filters
            </button>
          </div>
        </div>
      `;
    }

    return html`
      <ik-board
        .articles=${this.pagedVisible}
        .readOnScroll=${this.readOnScroll && this.scope !== "unread"}
        @ik-mark-read=${this.onMarkRead}
      ></ik-board>
      ${this.renderBoardFoot()}
    `;
  }

  private renderSavedPanel(): TemplateResult {
    if (this.loading) return html``;

    if (this.savedArticles.length === 0) {
      return html`
        <div class="ik-board ik-board--empty">
          <div class="ik-empty">
            <span class="ik-empty__mark">[ EMPTY ]</span>
            <h2>Nothing saved yet</h2>
            <p>Save a post from the reader and it will wait here.</p>
          </div>
        </div>
      `;
    }

    return html`
      <ik-board
        .articles=${this.savedArticles}
        .readOnScroll=${this.readOnScroll && this.scope !== "unread"}
        @ik-mark-read=${this.onMarkRead}
      ></ik-board>
    `;
  }

  private renderEmptyBoard(): TemplateResult {
    const hasFeeds = this.feeds.length > 0;
    const failed = this.feeds.filter((feed) => feed.lastError).length;

    return html`
      <div class="ik-board ik-board--empty">
        <div class="ik-empty">
          <span class="ik-empty__mark">[ NO SIGNAL ]</span>
          <h2>
            ${hasFeeds ? "No readable posts yet" : "Nothing on the board yet"}
          </h2>
          <p>
            ${
              hasFeeds
                ? `${this.feeds.length} ${this.feeds.length === 1 ? "feed is" : "feeds are"} wired up, but ${failed > 0 ? `${failed} could not load.` : "none returned posts."} Check Sources for the exact error.`
                : "Feeds are fetched directly by your browser. Paste a feed URL or import a FreshRSS/OPML export to start. Only feeds that allow cross-origin reads will load until the local proxy lands."
            }
          </p>
          <button
            class="ik-empty__button"
            type="button"
            @click=${this.goToSources}
          >
            ${hasFeeds ? "Open Sources" : "Wire up Sources"}
          </button>
        </div>
      </div>
    `;
  }

  private renderFilter(): TemplateResult {
    const options = SCOPE_OPTIONS;
    const sources = this.filterSources;

    return html`
      <details class="ik-filter">
        <summary class="ik-filter__button">
          <span>${this.filterLabel}</span>
          <i class="ik-filter__chev" aria-hidden="true"></i>
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

            <div class="ik-filter__journal">
              <button
                class="ik-filter__info"
                type="button"
                aria-expanded=${this.journalInfoOpen ? "true" : "false"}
                aria-controls="ik-journal-info"
                @click=${this.toggleJournalInfo}
              >
                ${infoIcon}
                <span>About Journal</span>
              </button>
              ${
                this.journalInfoOpen
                  ? html`
                      <p class="ik-filter__journal-note" id="ik-journal-info">
                        Private field log. Entries stay on this device and are
                        never posted. A dedicated Journal tab is being designed.
                      </p>
                    `
                  : nothing
              }
            </div>
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
              <span class="ik-filter__source-name">All Feeds</span>
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
    return (
      this.feeds.length > 0 &&
      (this.section === "board" || this.section === "saved")
    );
  }

  private get sectionArticles(): Article[] {
    if (this.section === "saved") {
      return this.articles.filter((article) => article.starred);
    }
    return this.articles;
  }

  private get journalIds(): ReadonlySet<string> {
    return journalArticleIds(this.journalEntries);
  }

  private get visible(): Article[] {
    return filterArticles(
      this.articles,
      this.scope,
      this.sourceFilter,
      this.journalIds,
    );
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
      this.journalIds,
    );
  }

  private get filterSources(): SourceSummary[] {
    if (this.section === "saved") return this.summarize(this.sectionArticles);
    return this.sourceSummaries;
  }

  private get sourceSummaries(): SourceSummary[] {
    const sources = new Map<string, SourceSummary>();

    for (const feed of this.feeds) {
      sources.set(feed.id, {
        id: feed.id,
        title: feed.title,
        color: feed.color,
        unread: 0,
        total: 0,
      });
    }

    for (const article of this.articles) {
      const source = sources.get(article.feedId);
      if (!source) continue;
      source.total += 1;
      if (article.unread) source.unread += 1;
    }

    return [...sources.values()].sort((a, b) => a.title.localeCompare(b.title));
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
        this.feeds.find((feed) => feed.id === this.sourceFilter)?.title ??
        this.articles.find((article) => article.feedId === this.sourceFilter)
          ?.feedTitle ??
        "Source"
      );
    }

    if (this.scope === "all") return "All Feeds";

    return (
      SCOPE_OPTIONS.find((option) => option.value === this.scope)?.label ??
      "All Feeds"
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

  private async bootstrap(): Promise<void> {
    const [feeds, cache, reading, journal] = await Promise.all([
      loadFeeds(),
      loadArticleCache(),
      loadReadingState(),
      loadJournal(),
    ]);

    this.feeds = feeds;
    this.cache = cache;
    this.reading = reading;
    this.journalEntries = journal;
    this.openedAt = new Map(Object.entries(reading.openedAt));
    this.articles = applyReadingState(flattenCache(cache), reading);
    this.loading = false;
    await this.updateComplete;
    this.syncPageSize(true);

    const stale = feeds.filter((feed) => isFeedStale(feed));
    if (stale.length > 0) {
      void this.refreshMany(stale);
    }
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

  private goToSources = (): void => {
    this.section = "sources";
    this.pauseMindful();
    this.closeFilter();
    void this.updateComplete.then(() => {
      this.querySelector<IkSources>("ik-sources")?.focusAdd();
    });
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
      this.articles.length > 0 &&
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
    const starredIds = new Set(this.reading.starredIds);
    if (starred) starredIds.add(id);
    else starredIds.delete(id);
    this.reading = { ...this.reading, starredIds: [...starredIds] };
    this.syncArticlesFromState();
    this.persistReading();
  };

  private onMarkRead = (event: CustomEvent<string[]>): void => {
    const readIds = new Set(this.reading.readIds);
    for (const id of event.detail) readIds.add(id);
    this.reading = { ...this.reading, readIds: [...readIds] };
    this.syncArticlesFromState();
    this.persistReading();
  };

  private onReadOnScroll = (event: CustomEvent<boolean>): void => {
    this.readOnScroll = event.detail;
    saveReadOnScroll(this.readOnScroll);
  };

  private markOpened(article: Article): void {
    const readIds = new Set(this.reading.readIds);
    readIds.add(article.id);
    const openedAt = { ...this.reading.openedAt, [article.id]: Date.now() };
    this.reading = { ...this.reading, readIds: [...readIds], openedAt };
    this.openedAt = new Map(Object.entries(openedAt));
    this.syncArticlesFromState();
    this.persistReading();
  }

  private persistReading(): void {
    const state = this.reading;
    this.readingChain = this.readingChain
      .then(() => saveReadingState(state))
      .catch(() => undefined);
  }

  private syncArticlesFromState(): void {
    this.articles = applyReadingState(flattenCache(this.cache), this.reading);
  }

  private retainedIds(): Set<string> {
    // Read IDs are kept in the reading record, not the article cache. Only
    // saved posts and posts the user actually opened need their bodies kept
    // after they rotate out of the feed.
    return new Set([
      ...this.reading.starredIds,
      ...Object.keys(this.reading.openedAt),
    ]);
  }

  private persistState(): void {
    const feeds = this.feeds;
    const cache = this.cache;
    this.persistChain = this.persistChain
      .then(() => Promise.all([saveFeeds(feeds), saveArticleCache(cache)]))
      .then(() => undefined)
      .catch(() => undefined);
  }

  private createFeed(seed: FeedSeed): Feed | null {
    const url = normalizeFeedUrl(seed.xmlUrl);
    if (!url) return null;

    return {
      id: feedIdForUrl(url),
      url,
      title: seed.title.trim() || feedTitleFromUrl(url),
      siteUrl: seed.htmlUrl,
      color: feedColorForUrl(url),
      folder: seed.folder,
      addedAt: new Date().toISOString(),
    };
  }

  private onAddFeed = (event: CustomEvent<string>): void => {
    void this.addFeed(event.detail);
  };

  private async addFeed(raw: string): Promise<void> {
    const token = ++this.statusToken;
    this.addError = null;
    this.importStatus = null;

    const normalized = normalizeFeedUrl(raw);
    if (!normalized) {
      this.addError = "Enter a valid http(s) feed URL.";
      return;
    }
    if (this.feeds.some((feed) => feed.url === normalized)) {
      this.addError = "That feed is already on the board.";
      return;
    }

    const feed = this.createFeed({
      title: feedTitleFromUrl(normalized),
      xmlUrl: normalized,
    });
    if (!feed) {
      this.addError = "Enter a valid http(s) feed URL.";
      return;
    }

    this.feeds = [...this.feeds, feed];
    this.persistState();

    const updated = await this.refreshFeed(feed);
    if (token !== this.statusToken) return;
    if (updated.lastError) {
      this.importStatus = `Feed added, but the direct fetch failed: ${updated.lastError.message}`;
    } else {
      this.importStatus = "Feed added.";
    }
  }

  private onImportOpml = (
    event: CustomEvent<OpmlResult & { fileName?: string }>,
  ): void => {
    void this.importOpml(event.detail);
  };

  private async importOpml(result: OpmlResult): Promise<void> {
    const token = ++this.statusToken;
    this.importing = true;
    this.addError = null;
    this.importStatus = null;

    const existing = new Set(this.feeds.map((feed) => feed.url));
    const imported: Feed[] = [];
    let duplicates = result.duplicates;

    for (const seed of result.feeds) {
      const feed = this.createFeed(seed);
      if (!feed) continue;
      if (existing.has(feed.url)) {
        duplicates += 1;
        continue;
      }
      existing.add(feed.url);
      imported.push(feed);
    }

    if (imported.length === 0) {
      this.importing = false;
      this.importStatus = [
        "No new feeds found.",
        duplicates > 0 ? `${duplicates} duplicate` : "",
        result.skipped > 0 ? `${result.skipped} non-RSS skipped` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return;
    }

    this.feeds = [...this.feeds, ...imported];
    this.persistState();
    this.importStatus = `Importing ${imported.length} feeds…`;

    let done = 0;
    let failed = 0;
    await mapWithConcurrency(imported, REFRESH_CONCURRENCY, async (feed) => {
      const updated = await this.refreshFeed(feed);
      done += 1;
      if (updated.lastError) failed += 1;
      if (token === this.statusToken) {
        this.importStatus = `Importing ${done}/${imported.length}…`;
      }
    });

    this.importing = false;
    if (token !== this.statusToken) return;
    this.importStatus = [
      `${imported.length} imported`,
      `${imported.length - failed} loaded`,
      failed > 0 ? `${failed} failed` : "",
      duplicates > 0 ? `${duplicates} duplicate` : "",
      result.skipped > 0 ? `${result.skipped} non-RSS skipped` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  private onRefresh = (): void => {
    void this.refreshAll();
  };

  private onRefreshFeed = (event: CustomEvent<string>): void => {
    const feed = this.feeds.find((item) => item.id === event.detail);
    if (feed) void this.refreshFeed(feed);
  };

  private onRetryFailed = (): void => {
    const failed = this.feeds.filter((feed) => feed.lastError);
    if (failed.length > 0) void this.refreshMany(failed);
  };

  private onRemoveFeed = (event: CustomEvent<string>): void => {
    this.removeFeed(event.detail);
  };

  private onRemoveFailed = (): void => {
    const failed = this.feeds.filter((feed) => feed.lastError);
    if (failed.length === 0) return;

    const failedIds = new Set(failed.map((feed) => feed.id));
    this.feeds = this.feeds.filter((feed) => !failedIds.has(feed.id));
    for (const id of failedIds) delete this.cache[id];
    if (this.sourceFilter && failedIds.has(this.sourceFilter)) {
      this.sourceFilter = null;
    }
    this.syncArticlesFromState();
    this.persistState();
    this.resetPagination();
  };

  private async refreshAll(): Promise<void> {
    if (this.feeds.length === 0) return;
    await this.refreshMany(this.feeds);
  }

  private async refreshMany(feeds: Feed[]): Promise<void> {
    await mapWithConcurrency(feeds, REFRESH_CONCURRENCY, async (feed) => {
      await this.refreshFeed(feed);
    });
  }

  private async refreshFeed(feed: Feed): Promise<Feed> {
    if (this.busyIds.includes(feed.id)) return feed;

    this.busyIds = [...this.busyIds, feed.id];

    try {
      const response = await fetchFeed(feed.url);
      const parsed = parseFeed(response.body, {
        feedUrl: response.finalUrl,
        contentType: response.contentType,
      });
      if (parsed.items.length === 0) {
        throw new FeedError("empty", "The feed returned no posts.");
      }

      const articles = normalizeFeed(
        parsed,
        {
          ...feed,
          title:
            parsed.title && parsed.title !== "Untitled feed"
              ? parsed.title
              : feed.title,
        },
        response.fetchedAt,
      );
      if (articles.length === 0) {
        throw new FeedError("empty", "The feed returned no readable posts.");
      }

      // The feed may have been removed while the request was in flight.
      if (!this.feeds.some((item) => item.id === feed.id)) return feed;

      this.cache = {
        ...this.cache,
        [feed.id]: mergeArticles(
          this.cache[feed.id] ?? [],
          articles,
          this.retainedIds(),
        ),
      };

      const nextFeed: Feed = {
        ...feed,
        title:
          parsed.title && parsed.title !== "Untitled feed"
            ? parsed.title
            : feed.title,
        siteUrl: parsed.siteUrl ?? feed.siteUrl,
        lastFetchedAt: response.fetchedAt,
        lastCheckedAt: response.fetchedAt,
        lastError: undefined,
      };
      this.feeds = this.feeds.map((item) =>
        item.id === feed.id ? nextFeed : item,
      );
      this.syncArticlesFromState();
      this.persistState();
      return nextFeed;
    } catch (error) {
      const checkedAt = new Date().toISOString();
      const nextFeed: Feed = {
        ...feed,
        lastCheckedAt: checkedAt,
        lastError: {
          code: errorCode(error),
          message: errorMessage(error),
          at: checkedAt,
          status: statusOf(error),
        },
      };
      this.feeds = this.feeds.map((item) =>
        item.id === feed.id ? nextFeed : item,
      );
      this.persistState();
      return nextFeed;
    } finally {
      this.busyIds = this.busyIds.filter((id) => id !== feed.id);
    }
  }

  private removeFeed(id: string): void {
    this.feeds = this.feeds.filter((feed) => feed.id !== id);
    delete this.cache[id];
    const clearedSource = this.sourceFilter === id;
    if (clearedSource) this.sourceFilter = null;
    this.syncArticlesFromState();
    this.persistState();
    if (clearedSource || this.feeds.length === 0) this.resetPagination();
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

  private clearFilters(): void {
    this.scope = "all";
    this.sourceFilter = null;
    this.closeFilter();
    this.resetPagination();
  }

  private toggleJournalInfo = (): void => {
    this.journalInfoOpen = !this.journalInfoOpen;
  };

  private onJournalAdd = (
    event: CustomEvent<{ articleId: string; body: string }>,
  ): void => {
    const article = this.articles.find(
      (item) => item.id === event.detail.articleId,
    );
    if (!article) return;

    const next = addJournalEntry(this.journalEntries, {
      articleId: article.id,
      body: event.detail.body.slice(0, JOURNAL_MAX_LENGTH),
      articleTitle: article.title,
      feedTitle: article.feedTitle,
      articleLink: article.link,
      articlePublishedAt: article.publishedAt,
    });
    if (next === this.journalEntries) return;

    this.journalEntries = next;
    this.persistJournal(next);
  };

  private onJournalDelete = (event: CustomEvent<string>): void => {
    const next = removeJournalEntry(this.journalEntries, event.detail);
    if (next === this.journalEntries) return;
    this.journalEntries = next;
    this.persistJournal(next);
  };

  private persistJournal(entries: JournalEntry[]): void {
    this.journalChain = this.journalChain
      .then(() => saveJournal(entries))
      .catch(() => undefined);
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
