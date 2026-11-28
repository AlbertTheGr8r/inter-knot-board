import { html, nothing, type TemplateResult } from "lit";
import type { Article } from "../data/types";
import { initials, relativeTime } from "../lib/format";
import { IkElement } from "../ui/base";
import { badgeClockIcon } from "../ui/icons";
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
        data-article-id=${article.id}
        data-read=${article.unread ? "false" : "true"}
        tabindex="0"
        role="button"
        aria-label=${`Open post: ${article.title}. Posted ${relativeTime(
          article.publishedAt,
        )}.`}
        @click=${this.open}
        @keydown=${this.onKeydown}
      >
        <div class="ik-card__media" style=${`--ik-aspect:${article.aspect}`}>
          <ik-poster .article=${article}></ik-poster>
          <span class="ik-card__time">
            ${badgeClockIcon}
            <span>${relativeTime(article.publishedAt)}</span>
          </span>
        </div>

        <div class="ik-card__info">
          <span
            class="ik-avatar ik-avatar--card"
            style=${`--ik-avatar:${article.authorColor}`}
            >${initials(article.author)}</span
          >
          <span class="ik-card__author">${article.author}</span>
          <i class="ik-card__rule" aria-hidden="true"></i>
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
