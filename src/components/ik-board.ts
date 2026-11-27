import { html, type TemplateResult } from "lit";
import type { Article } from "../data/types";
import {
  computeBatchSize,
  DEFAULT_SCREENS,
  MAX_BATCH,
  MIN_BATCH,
} from "../lib/pagination";
import { IkElement } from "../ui/base";
import "./ik-card";

export class IkBoard extends IkElement {
  static properties = {
    articles: { attribute: false },
    columns: { state: true },
  };

  articles: Article[] = [];
  columns: Article[][] = [];

  private observer?: ResizeObserver;
  private frame = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.observer = new ResizeObserver(() => this.scheduleLayout());
    this.observer.observe(this);
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("articles")) {
      this.scheduleLayout();
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
}

customElements.define("ik-board", IkBoard);
