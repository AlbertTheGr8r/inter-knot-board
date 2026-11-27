import { html, nothing, type TemplateResult } from "lit";
import type { Article } from "../data/types";
import { initials, relativeTime } from "../lib/format";
import { IkElement } from "../ui/base";
import { clockIcon } from "../ui/icons";
import "./ik-poster";

export class IkCard extends IkElement {
  static properties = {
    article: { attribute: false },
  };

  article: Article | null = null;

  render(): TemplateResult | typeof nothing {
    const article = this.article;
    if (!article) {
      return nothing;
    }

    const tagClass =
      article.tag === "Urgent" ? "ik-tag ik-tag--urgent" : "ik-tag";

    return html`
      <article
        class="ik-card"
        tabindex="0"
        role="button"
        aria-label=${`Open post: ${article.title}`}
        @click=${this.open}
        @keydown=${this.onKeydown}
      >
        <div class="ik-card__media" style=${`--ik-aspect:${article.aspect}`}>
          <ik-poster .article=${article}></ik-poster>
          <span class="ik-card__time">
            ${clockIcon}
            <span>${relativeTime(article.publishedAt)}</span>
          </span>
          ${article.unread
            ? html`<span class="ik-card__sticker">NEW</span>`
            : nothing}
          ${article.picked
            ? html`<span class="ik-card__pick">PICK</span>`
            : nothing}
          <div class="ik-card__op">
            <span
              class="ik-avatar"
              style=${`--ik-avatar:${article.authorColor}`}
              >${initials(article.author)}</span
            >
            <span class="ik-card__opname">${article.author}</span>
          </div>
        </div>

        <div class="ik-card__body">
          <p class="ik-card__title">
            <span class=${tagClass}>[${article.tag}]</span>
            ${article.title}
          </p>
          <p class="ik-card__excerpt">${article.excerpt}</p>
        </div>
      </article>
    `;
  }

  private open = (): void => {
    if (!this.article) return;
    this.dispatchEvent(
      new CustomEvent<Article>("ik-open-post", {
        detail: this.article,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.open();
  };
}

customElements.define("ik-card", IkCard);
