import { html, type TemplateResult } from "lit";
import type { Article } from "../data/types";
import {
  computeBatchSize,
  DEFAULT_SCREENS,
  MAX_BATCH,
  MIN_BATCH,
} from "../lib/pagination";
import {
  isCardFullyVisible,
  READ_ON_SCROLL_DWELL_MS,
} from "../lib/read-on-scroll";
import { IkElement } from "../ui/base";
import "./ik-card";

export class IkBoard extends IkElement {
  static properties = {
    articles: { attribute: false },
    readOnScroll: { type: Boolean },
    columns: { state: true },
  };

  articles: Article[] = [];
  readOnScroll = false;
  columns: Article[][] = [];

  private observer?: ResizeObserver;
  private readObserver?: IntersectionObserver;
  private readTimers = new Map<Element, number>();
  private pendingRead = new Set<string>();
  private readFrame = 0;
  private readFlush = 0;
  private interacted = false;
  private frame = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.observer = new ResizeObserver(() => this.scheduleLayout());
    this.observer.observe(this);
    window.addEventListener("scroll", this.onUserActivity, { passive: true });
    window.addEventListener("keydown", this.onUserActivity);
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.stopReadObserver();
    window.removeEventListener("scroll", this.onUserActivity);
    window.removeEventListener("keydown", this.onUserActivity);
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.readFrame) cancelAnimationFrame(this.readFrame);
    if (this.readFlush) window.clearTimeout(this.readFlush);
    this.frame = 0;
    this.readFrame = 0;
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("articles")) {
      this.scheduleLayout();
    }
    if (
      changed.has("articles") ||
      changed.has("columns") ||
      changed.has("readOnScroll")
    ) {
      this.scheduleReadObserver();
    }
  }

  render(): TemplateResult {
    if (this.articles.length === 0) {
      return html`
        <div class="ik-board ik-board--empty">
          <div class="ik-empty">
            <span class="ik-empty__mark">[ EMPTY ]</span>
            <h2>Nothing on this board yet</h2>
            <p>
              Add a feed, or switch back to <strong>Board</strong> to see
              everything.
            </p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="ik-board" role="list">
        ${this.columns.map(
          (column) => html`
            <div class="ik-board__col" role="presentation">
              ${column.map(
                (article) => html`
                  <ik-card role="listitem" .article=${article}></ik-card>
                `,
              )}
            </div>
          `,
        )}
      </div>
    `;
  }

  private scheduleLayout(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.layout();
    });
  }

  /**
   * How many cards make roughly five screens at the current column count.
   * The app uses this for both the first page and each Load more click.
   */
  getBatchSize(screens = DEFAULT_SCREENS): number {
    const width = this.clientWidth || window.innerWidth;
    const columns = this.columnsForWidth(width);
    const viewport = Math.max(
      360,
      (window.visualViewport?.height ?? window.innerHeight) - 110,
    );
    const cards = [...this.querySelectorAll<HTMLElement>(".ik-card")];
    const heights = cards
      .map((card) => card.getBoundingClientRect().height)
      .filter((height) => height > 0);
    const averageCardHeight =
      heights.length > 0
        ? heights.reduce((sum, height) => sum + height, 0) / heights.length
        : this.articles[0]
          ? this.estimate(this.articles[0])
          : 420;

    return computeBatchSize({
      columns,
      viewportHeight: viewport,
      averageCardHeight,
      gap: 16,
      screens,
      min: MIN_BATCH,
      max: MAX_BATCH,
    });
  }

  private columnsForWidth(width: number): number {
    return width >= 1480 ? 4 : width >= 1080 ? 3 : width >= 720 ? 2 : 1;
  }

  private layout(): void {
    const width = this.clientWidth;
    if (!width || this.articles.length === 0) return;

    const count = this.columnsForWidth(width);

    const columns = Array.from({ length: count }, (): Article[] => []);
    const heights = new Array<number>(count).fill(0);

    for (const article of this.articles) {
      let target = 0;
      for (let index = 1; index < count; index += 1) {
        if (heights[index]! < heights[target]!) target = index;
      }
      columns[target]!.push(article);
      heights[target]! += this.estimate(article);
    }

    if (this.sameLayout(columns)) return;
    this.columns = columns;
  }

  private estimate(article: Article): number {
    const mediaHeight = 330 / Math.max(0.6, article.aspect);
    const titleLines = Math.min(3, Math.ceil(article.title.length / 27));
    const excerptLines = Math.min(2, Math.ceil(article.excerpt.length / 36));
    return mediaHeight + 58 + titleLines * 20 + excerptLines * 16;
  }

  private sameLayout(next: Article[][]): boolean {
    if (this.columns.length !== next.length) return false;

    return this.columns.every((column, index) => {
      const other = next[index]!;
      return (
        column.length === other.length &&
        column.every((article, item) => article.id === other[item]!.id)
      );
    });
  }

  private onUserActivity = (): void => {
    this.interacted = true;
  };

  private scheduleReadObserver(): void {
    if (this.readFrame) return;
    this.readFrame = requestAnimationFrame(() => {
      this.readFrame = 0;
      this.syncReadObserver();
    });
  }

  private syncReadObserver(): void {
    this.stopReadObserver();
    if (!this.readOnScroll || this.articles.length === 0) return;

    this.readObserver = new IntersectionObserver(this.onIntersection, {
      threshold: [0, 0.5, 0.98, 1],
      rootMargin: "-84px 0px -40px 0px",
    });

    for (const card of this.querySelectorAll(".ik-card")) {
      this.readObserver.observe(card);
    }
  }

  private stopReadObserver(): void {
    this.readObserver?.disconnect();
    this.readObserver = undefined;
    for (const timer of this.readTimers.values()) {
      window.clearTimeout(timer);
    }
    this.readTimers.clear();
  }

  private onIntersection = (entries: IntersectionObserverEntry[]): void => {
    if (!this.readOnScroll || document.visibilityState !== "visible") return;

    for (const entry of entries) {
      const card = entry.target;
      const id = card.getAttribute("data-article-id");
      if (!id) continue;

      const fullyVisible = isCardFullyVisible({
        cardHeight: entry.boundingClientRect.height,
        visibleHeight: entry.intersectionRect.height,
        rootHeight: entry.rootBounds?.height ?? window.innerHeight,
      });

      if (!entry.isIntersecting || !fullyVisible || !this.interacted) {
        const timer = this.readTimers.get(card);
        if (timer) window.clearTimeout(timer);
        this.readTimers.delete(card);
        continue;
      }

      if (this.readTimers.has(card)) continue;

      const timer = window.setTimeout(() => {
        this.readTimers.delete(card);
        this.queueRead(id);
      }, READ_ON_SCROLL_DWELL_MS);
      this.readTimers.set(card, timer);
    }
  };

  private queueRead(id: string): void {
    const article = this.articles.find((item) => item.id === id);
    if (!article || !article.unread) return;

    this.pendingRead.add(id);
    if (this.readFlush) window.clearTimeout(this.readFlush);
    this.readFlush = window.setTimeout(() => {
      this.readFlush = 0;
      if (this.pendingRead.size === 0) return;
      const ids = [...this.pendingRead];
      this.pendingRead.clear();
      this.dispatchEvent(
        new CustomEvent<string[]>("ik-mark-read", {
          detail: ids,
          bubbles: true,
          composed: true,
        }),
      );
    }, 120);
  }
}

customElements.define("ik-board", IkBoard);
