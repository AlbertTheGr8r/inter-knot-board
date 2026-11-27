import { html, nothing, type TemplateResult } from "lit";
import type { Article } from "../data/types";
import { compactNumber, initials, relativeTime } from "../lib/format";
import { IkElement } from "../ui/base";
import {
  clockIcon,
  closeIcon,
  externalIcon,
  heartIcon,
  infoIcon,
} from "../ui/icons";
import "./ik-poster";

interface DialogElement extends HTMLElement {
  api?: { open: (options?: unknown) => Promise<unknown> };
}

export class IkPostDialog extends IkElement {
  static properties = {
    article: { attribute: false },
    expanded: { state: true },
  };

  article: Article | null = null;
  expanded = false;

  private dialogEl: DialogElement | null = null;

  protected async firstUpdated(): Promise<void> {
    await customElements.whenDefined("ui-dialog");
    this.dialogEl = this.querySelector<DialogElement>("ui-dialog");
  }

  async open(article: Article): Promise<void> {
    this.article = article;
    this.expanded = false;
    await this.updateComplete;

    if (!this.dialogEl) {
      await customElements.whenDefined("ui-dialog");
      this.dialogEl = this.querySelector<DialogElement>("ui-dialog");
    }

    void this.dialogEl?.api?.open();
  }

  render(): TemplateResult {
    return html`
      <ui-dialog>
        <ui-dialog-backdrop hidden></ui-dialog-backdrop>
        <ui-dialog-content hidden initial-focus="content">
          ${this.article ? this.renderPost(this.article) : nothing}
        </ui-dialog-content>
      </ui-dialog>
    `;
  }

  private renderPost(article: Article): TemplateResult {
    const comments = article.comments ?? [];
    const needsExpand = article.content.join(" ").length > 420;
    const clamped = needsExpand && !this.expanded;

    return html`
      <div class="ik-post">
        <div class="ik-post__bar">
          <span
            class="ik-avatar ik-avatar--lg"
            style=${`--ik-avatar:${article.feedColor}`}
            >${initials(article.feedTitle)}</span
          >
          <div class="ik-post__source">
            <strong>${article.feedTitle}</strong>
            <span class="ik-post__stat">
              ${article.likes !== undefined
                ? html`${heartIcon} ${compactNumber(article.likes)}`
                : html`${clockIcon} ${article.minutes} min`}
            </span>
          </div>
          <ui-dialog-close>
            <button
              class="ik-post__close"
              type="button"
              aria-label="Close post"
            >
              ${closeIcon}
            </button>
          </ui-dialog-close>
        </div>

        ${article.systemNote
          ? html`
              <div class="ik-post__note">
                ${infoIcon}
                <p>${article.systemNote}</p>
              </div>
            `
          : nothing}

        <div class="ik-post__body">
          <figure class="ik-post__figure">
            <ik-poster .article=${article}></ik-poster>
            ${article.picked
              ? html`<figcaption class="ik-post__pick">
                  Fairy Picks
                </figcaption>`
              : nothing}
          </figure>

          <div class="ik-post__scroll">
            <ui-dialog-title as-child>
              <h2 class="ik-post__title">
                <span class="ik-tag">[${article.tag}]</span>
                ${article.title}
              </h2>
            </ui-dialog-title>

            <p class="ik-post__meta">
              by <strong>${article.author}</strong>
              <span>·</span> ${relativeTime(article.publishedAt)}
              <span>·</span> ${article.minutes} min read
            </p>

            <div
              class=${`ik-post__content${clamped ? " is-clamped" : ""}`}
            >
              ${article.content.map(
                (paragraph) => html`<p>${paragraph}</p>`,
              )}
            </div>

            ${needsExpand
              ? html`
                  <button
                    class="ik-post__expand"
                    type="button"
                    @click=${this.toggleExpanded}
                  >
                    ${this.expanded ? "Collapse" : "Expand"}
                  </button>
                `
              : nothing}

            ${article.quoted
              ? html`
                  <blockquote class="ik-quote">
                    <div class="ik-quote__head">
                      <span class="ik-quote__label"
                        >▸ ${article.quoted.feedTitle}</span
                      >
                      <span class="ik-tag">[${article.quoted.tag}]</span>
                    </div>
                    <strong>${article.quoted.title}</strong>
                    <p>${article.quoted.excerpt}</p>
                  </blockquote>
                `
              : nothing}

            <div class="ik-post__tags">
              <span class="ik-chip">#${article.tag.toLowerCase()}</span>
              <span class="ik-chip">#${article.feedId}</span>
              ${article.picked
                ? html`<span class="ik-chip ik-chip--blue">starred</span>`
                : nothing}
            </div>

            ${article.link
              ? html`
                  <a
                    class="ik-post__original"
                    href=${article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open original ${externalIcon}
                  </a>
                `
              : html`
                  <span
                    class="ik-post__original is-disabled"
                    title="Connect a real feed to open the source"
                  >
                    Open original ${externalIcon}
                  </span>
                `}
            ${comments.length > 0 ? this.renderComments(comments) : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderComments(
    comments: NonNullable<Article["comments"]>,
  ): TemplateResult {
    return html`
      <section class="ik-comments" aria-label="Replies">
        <h3>${comments.length} replies</h3>
        ${comments.map(
          (comment, index) => html`
            <article class="ik-comment">
              <span
                class="ik-avatar"
                style=${`--ik-avatar:${comment.color}`}
                >${initials(comment.author)}</span
              >
              <div class="ik-comment__body">
                <header>
                  <strong>${comment.author}</strong>
                  <span class="ik-comment__floor">${index + 1}F</span>
                </header>
                <p>${comment.text}</p>
              </div>
              <span class="ik-comment__likes">
                ${heartIcon}${compactNumber(comment.likes)}
              </span>
            </article>
          `,
        )}
      </section>
    `;
  }

  private toggleExpanded = (): void => {
    this.expanded = !this.expanded;
  };
}

customElements.define("ik-post-dialog", IkPostDialog);
