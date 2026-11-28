import { html, nothing, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { Article, JournalEntry } from "../data/types";
import { compactNumber, initials, relativeTime } from "../lib/format";
import { JOURNAL_MAX_LENGTH, journalForArticle } from "../lib/journal-store";
import {
  mediaFadeState,
  mediaScrollState,
  postLayout,
} from "../lib/post-layout";
import { IkElement } from "../ui/base";
import {
  chevronDownIcon,
  chevronUpIcon,
  clockIcon,
  closeIcon,
  heartIcon,
  infoIcon,
  lockIcon,
  starIcon,
  trashIcon,
  triangleDownIcon,
  triangleUpIcon,
} from "../ui/icons";
import "./ik-poster";

interface DialogElement extends HTMLElement {
  api?: { open: (options?: unknown) => Promise<unknown> };
}

type Rail = "comments" | "journal";

function relativeLabel(iso: string): string {
  const relative = relativeTime(iso);
  if (relative === "now") return "just now";
  if (/^\d+[mhd]$/.test(relative)) return `${relative} ago`;
  return relative;
}

export class IkPostDialog extends IkElement {
  static properties = {
    article: { attribute: false },
    journalEntries: { attribute: false },
    expanded: { state: true },
    saved: { state: true },
    imageFailed: { state: true },
    rail: { state: true },
    journalDraft: { state: true },
    journalComposerOpen: { state: true },
    mediaCanScrollUp: { state: true },
    mediaCanScrollDown: { state: true },
    contentOverflow: { state: true },
  };

  article: Article | null = null;
  journalEntries: JournalEntry[] = [];
  expanded = false;
  saved = false;
  imageFailed = false;
  rail: Rail = "comments";
  journalDraft = "";
  journalComposerOpen = false;
  mediaCanScrollUp = false;
  mediaCanScrollDown = false;
  /** null until the clamped content has been measured. */
  contentOverflow: boolean | null = null;

  private dialogEl: DialogElement | null = null;
  private mediaObserver?: ResizeObserver;
  private mediaFrame = 0;
  private clampFrame = 0;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this.onResize);
  }

  disconnectedCallback(): void {
    window.removeEventListener("resize", this.onResize);
    this.mediaObserver?.disconnect();
    this.mediaObserver = undefined;
    if (this.mediaFrame) cancelAnimationFrame(this.mediaFrame);
    this.mediaFrame = 0;
    if (this.clampFrame) cancelAnimationFrame(this.clampFrame);
    this.clampFrame = 0;
    this.dialogEl?.removeEventListener("openchange", this.onDialogChange);
    super.disconnectedCallback();
  }

  protected async firstUpdated(): Promise<void> {
    await customElements.whenDefined("ui-dialog");
    this.dialogEl = this.querySelector<DialogElement>("ui-dialog");
    this.dialogEl?.addEventListener("openchange", this.onDialogChange);
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    const layoutChanged = [
      "article",
      "journalEntries",
      "rail",
      "journalComposerOpen",
      "expanded",
    ].some((key) => changed.has(key));

    if (layoutChanged) {
      this.scheduleMediaState();
      if (this.contentOverflow !== null) this.contentOverflow = null;
    }

    if (
      this.contentOverflow === null &&
      (layoutChanged || changed.has("contentOverflow"))
    ) {
      this.scheduleClampState();
    }
  }

  async open(article: Article): Promise<void> {
    this.article = article;
    this.expanded = false;
    this.saved = Boolean(article.starred);
    this.imageFailed = false;
    this.journalDraft = "";
    this.journalComposerOpen = false;
    this.mediaCanScrollUp = false;
    this.mediaCanScrollDown = false;
    this.contentOverflow = null;

    const comments = article.comments ?? [];
    const entries = journalForArticle(this.journalEntries, article.id);
    this.rail =
      comments.length === 0 && entries.length > 0 ? "journal" : "comments";

    await this.updateComplete;

    if (!this.dialogEl) {
      await customElements.whenDefined("ui-dialog");
      this.dialogEl = this.querySelector<DialogElement>("ui-dialog");
    }

    void this.dialogEl?.api?.open();
    this.resetMediaScroll();
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
    const entries = journalForArticle(this.journalEntries, article.id);
    const hasComments = comments.length > 0;
    const hasJournal = entries.length > 0 || this.journalComposerOpen;
    const layout = postLayout(hasComments, hasJournal);
    const needsExpand = article.content.join(" ").length > 420;
    const clampable = layout === "two" && needsExpand && !this.expanded;
    const clamped = clampable && this.contentOverflow !== false;
    const showExpand =
      layout === "two" &&
      needsExpand &&
      (this.expanded || this.contentOverflow === true);

    return html`
      <div class="ik-post" data-layout=${layout}>
        ${this.renderHeader(article)}
        ${
          article.systemNote
            ? html`
                <div class="ik-post__note">
                  ${infoIcon}
                  <p>${article.systemNote}</p>
                </div>
              `
            : nothing
        }
        ${
          layout === "three"
            ? html`
                <div class="ik-post__body" data-layout="three">
                  <section class="ik-post__post-card">
                    ${this.renderMedia(article)}
                    ${this.renderContent(article, false, false, false)}
                  </section>
                  ${this.renderRail(article, comments, entries, hasComments, hasJournal)}
                </div>
              `
            : html`
                <div class="ik-post__body" data-layout="two">
                  ${this.renderMedia(article)}
                  <section class="ik-post__content-card">
                    ${this.renderContent(article, clamped, showExpand, true)}
                  </section>
                </div>
              `
        }
      </div>
    `;
  }

  private renderHeader(article: Article): TemplateResult {
    const posted = relativeLabel(article.publishedAt);

    return html`
      <div class="ik-post__bar">
        <span
          class="ik-avatar ik-post__avatar"
          style=${`--ik-avatar:${article.authorColor}`}
          >${initials(article.author)}</span
        >
        <div class="ik-post__identity">
          <strong>${article.author}</strong>
          <span class="ik-post__date">${clockIcon}${posted}</span>
        </div>
        <div class="ik-post__actions">
          <button
            class=${`ik-post__save${this.saved ? " is-saved" : ""}`}
            type="button"
            aria-pressed=${this.saved ? "true" : "false"}
            aria-label=${this.saved ? "Remove from saved" : "Save post"}
            @click=${this.toggleSave}
          >
            ${starIcon}
            <span>${this.saved ? "Saved" : "Save"}</span>
          </button>
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
      </div>
    `;
  }

  private renderMedia(article: Article): TemplateResult {
    const hasImage = Boolean(article.image) && !this.imageFailed;

    return html`
      <figure class="ik-post__figure">
        ${
          hasImage
            ? html`
                <div
                  class="ik-post__media-scroll"
                  tabindex="0"
                  aria-label="Post image. Scroll for more."
                  @scroll=${this.onMediaScroll}
                >
                  <img
                    class="ik-post__image"
                    src=${article.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                    @load=${this.onImageLoad}
                    @error=${this.onImageError}
                  />
                </div>
                <button
                  class="ik-post__media-arrow is-up"
                  type="button"
                  aria-label="Scroll image up"
                  ?hidden=${!this.mediaCanScrollUp}
                  @click=${() => this.scrollMedia(-1)}
                >
                  ${chevronUpIcon}
                </button>
                <button
                  class="ik-post__media-arrow is-down"
                  type="button"
                  aria-label="Scroll image down"
                  ?hidden=${!this.mediaCanScrollDown}
                  @click=${() => this.scrollMedia(1)}
                >
                  ${chevronDownIcon}
                </button>
              `
            : html`<ik-poster .article=${article}></ik-poster>`
        }
        ${
          article.picked
            ? html`<figcaption class="ik-post__pick">Fairy Picks</figcaption>`
            : nothing
        }
      </figure>
    `;
  }

  private renderContent(
    article: Article,
    clamped: boolean,
    showExpand: boolean,
    showJournal: boolean,
  ): TemplateResult {
    return html`
      <div class=${`ik-post__content-scroll${clamped ? " is-collapsed" : ""}`}>
        <ui-dialog-title as-child>
          <h2 class="ik-post__title">
            <span class="ik-tag">[${article.tag}]</span>
            ${article.title}
          </h2>
        </ui-dialog-title>

        <p class="ik-post__meta">
          <strong>${article.feedTitle}</strong>
          <span>·</span> ${article.minutes} min read
        </p>

        <div class=${`ik-post__clamp${clamped ? " is-clamped" : ""}`}>
          <div class=${`ik-post__content${clamped ? " is-clamped" : ""}`}>
            ${
              article.contentHtml
                ? unsafeHTML(article.contentHtml)
                : article.content
                    .filter((paragraph) => paragraph.trim().length > 0)
                    .map((paragraph) => html`<p>${paragraph}</p>`)
            }
          </div>

          ${
            showExpand
              ? html`
                  <button
                    class="ik-post__expand"
                    type="button"
                    @click=${this.toggleExpanded}
                  >
                    ${this.expanded ? triangleUpIcon : triangleDownIcon}
                    <span>${this.expanded ? "Collapse" : "Expand"}</span>
                  </button>
                `
              : nothing
          }
        </div>

        ${
          article.quoted
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
            : nothing
        }

        <div class="ik-post__tags">
          <span class="ik-chip">#${article.tag.toLowerCase()}</span>
          <span class="ik-chip"
            >#${article.feedTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}</span
          >
          ${
            article.picked
              ? html`<span class="ik-chip ik-chip--blue">starred</span>`
              : nothing
          }
        </div>

        <div class="ik-post__content-actions">
          ${
            article.link
              ? html`
                  <a
                    class="ik-post__original"
                    href=${article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open original
                  </a>
                `
              : html`
                  <span
                    class="ik-post__original is-disabled"
                    title="This post has no original link"
                  >
                    Open original
                  </span>
                `
          }
          ${
            showJournal
              ? html`
                  <button
                    class="ik-post__journal"
                    type="button"
                    @click=${this.openJournal}
                  >
                    Write to Journal
                  </button>
                `
              : nothing
          }
        </div>
      </div>
    `;
  }

  private renderRail(
    article: Article,
    comments: NonNullable<Article["comments"]>,
    entries: JournalEntry[],
    hasComments: boolean,
    hasJournal: boolean,
  ): TemplateResult {
    const rail: Rail =
      this.rail === "journal" && !hasJournal ? "comments" : this.rail;

    return html`
      <aside class="ik-post__rail" aria-label="Post discussion and journal">
        ${
          hasJournal
            ? html`
                <header class="ik-post__rail-head">
                  ${
                    hasComments
                      ? html`
                          <div
                            class="ik-post__rail-tabs"
                            role="tablist"
                            aria-label="Comments and journal"
                          >
                            <button
                              type="button"
                              role="tab"
                              aria-selected=${
                                rail === "comments" ? "true" : "false"
                              }
                              @click=${() => this.setRail("comments")}
                            >
                              Comments <span>${comments.length}</span>
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected=${
                                rail === "journal" ? "true" : "false"
                              }
                              @click=${() => this.setRail("journal")}
                            >
                              ${lockIcon} Journal <span>${entries.length}</span>
                            </button>
                          </div>
                        `
                      : html`
                          <h3>Journal</h3>
                          <span class="ik-post__private">
                            ${lockIcon} Private field log
                          </span>
                        `
                  }
                </header>
              `
            : nothing
        }

        <div class="ik-post__rail-scroll">
          ${
            rail === "journal"
              ? this.renderJournalEntries(entries)
              : this.renderComments(comments, entries)
          }
        </div>

        ${
          rail === "journal" && this.journalComposerOpen
            ? this.renderComposer()
            : nothing
        }
      </aside>
    `;
  }

  private renderComments(
    comments: NonNullable<Article["comments"]>,
    entries: JournalEntry[],
  ): TemplateResult {
    if (comments.length === 0) {
      return html`<p class="ik-post__rail-empty">No comments yet.</p>`;
    }

    return html`
      <div class="ik-post__rail-list">
        ${comments.map(
          (comment, index) => html`
            <article class="ik-post__rail-item">
              <span
                class="ik-avatar ik-post__avatar ik-post__avatar--sm"
                style=${`--ik-avatar:${comment.color}`}
                >${initials(comment.author)}</span
              >
              <div class="ik-post__rail-body">
                <header>
                  <strong>${comment.author}</strong>
                  <span class="ik-post__floor">${index + 1}F</span>
                </header>
                <p>${comment.text}</p>
                <span class="ik-post__likes">
                  ${heartIcon}${compactNumber(comment.likes)}
                </span>
              </div>
            </article>
          `,
        )}
      </div>

      <div class="ik-post__rail-footer">
        <p class="ik-post__rail-end">– No more comments –</p>
        <button
          class="ik-post__journal ik-post__rail-action"
          type="button"
          @click=${this.openJournal}
        >
          ${entries.length > 0 ? "Write more entries" : "Write to Journal"}
        </button>
      </div>
    `;
  }

  private renderJournalEntries(entries: JournalEntry[]): TemplateResult {
    return html`
      ${
        entries.length === 0
          ? html`
              <p class="ik-post__rail-empty">
                No notes yet. Add a private note below.
              </p>
            `
          : html`
              <div class="ik-post__rail-list">
                ${entries.map(
                  (entry) => html`
                    <article class="ik-post__rail-item">
                      <span
                        class="ik-avatar ik-post__avatar ik-post__avatar--sm"
                        style="--ik-avatar:#f1d80a"
                        >PX</span
                      >
                      <div class="ik-post__rail-body">
                        <header>
                          <strong>You</strong>
                          <span class="ik-post__floor"
                            >${lockIcon} private</span
                          >
                        </header>
                        <p>${entry.body}</p>
                        <span class="ik-post__rail-date"
                          >${relativeLabel(entry.createdAt)}</span
                        >
                      </div>
                      <button
                        class="ik-post__delete"
                        type="button"
                        aria-label="Delete journal entry"
                        title="Delete note"
                        @click=${() => this.deleteJournal(entry.id)}
                      >
                        ${trashIcon}
                      </button>
                    </article>
                  `,
                )}
              </div>
            `
      }
      ${
        entries.length > 0 && !this.journalComposerOpen
          ? html`
              <div class="ik-post__rail-footer">
                <button
                  class="ik-post__journal ik-post__rail-action"
                  type="button"
                  @click=${this.openJournal}
                >
                  Write more entries
                </button>
              </div>
            `
          : nothing
      }
    `;
  }

  private renderComposer(): TemplateResult {
    return html`
      <form class="ik-post__composer" @submit=${this.addJournal}>
        <label class="ik-post__composer-label" for="ik-journal-entry">
          ${lockIcon} Private note
        </label>
        <textarea
          id="ik-journal-entry"
          class="ik-post__composer-input"
          rows="3"
          maxlength=${JOURNAL_MAX_LENGTH}
          placeholder="Write a private note about this post…"
          .value=${this.journalDraft}
          @input=${this.onJournalInput}
        ></textarea>
        <div class="ik-post__composer-actions">
          <span>Only stored on this device.</span>
          <button
            class="ik-post__composer-cancel"
            type="button"
            @click=${this.cancelJournal}
          >
            Cancel
          </button>
          <button
            class="ik-post__composer-submit"
            type="submit"
            ?disabled=${!this.journalDraft.trim()}
          >
            Add note
          </button>
        </div>
      </form>
    `;
  }

  private setRail(rail: Rail): void {
    this.rail = rail;
  }

  private openJournal = (): void => {
    this.rail = "journal";
    this.journalComposerOpen = true;
    void this.updateComplete.then(() => {
      this.querySelector<HTMLTextAreaElement>("#ik-journal-entry")?.focus();
      this.scheduleMediaState();
    });
  };

  private onJournalInput = (event: Event): void => {
    this.journalDraft = (event.target as HTMLTextAreaElement).value;
  };

  private addJournal = (event: Event): void => {
    event.preventDefault();
    if (!this.article) return;
    const body = this.journalDraft.trim();
    if (!body) return;

    this.dispatchEvent(
      new CustomEvent("ik-journal-add", {
        detail: { articleId: this.article.id, body },
        bubbles: true,
        composed: true,
      }),
    );
    this.journalDraft = "";
    void this.updateComplete.then(() => {
      const scroller = this.querySelector<HTMLElement>(".ik-post__rail-scroll");
      scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
      this.querySelector<HTMLTextAreaElement>("#ik-journal-entry")?.focus();
    });
  };

  private cancelJournal = (): void => {
    this.journalDraft = "";
    this.journalComposerOpen = false;
  };

  private deleteJournal = (id: string): void => {
    this.dispatchEvent(
      new CustomEvent<string>("ik-journal-delete", {
        detail: id,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private toggleExpanded = (): void => {
    this.expanded = !this.expanded;
  };

  private toggleSave = (): void => {
    if (!this.article) return;

    this.saved = !this.saved;
    this.dispatchEvent(
      new CustomEvent("ik-toggle-save", {
        detail: { id: this.article.id, starred: this.saved },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private onImageError = (): void => {
    this.imageFailed = true;
    this.scheduleMediaState();
  };

  private onImageLoad = (): void => {
    this.scheduleMediaState();
  };

  private onMediaScroll = (): void => {
    this.syncMediaState();
  };

  private onResize = (): void => {
    this.scheduleMediaState();
    this.contentOverflow = null;
    this.scheduleClampState();
  };

  private resetMediaScroll(): void {
    const scroller = this.querySelector<HTMLElement>(".ik-post__media-scroll");
    if (scroller) scroller.scrollTop = 0;
    this.scheduleMediaState();
  }

  private scheduleMediaState(): void {
    if (this.mediaFrame) cancelAnimationFrame(this.mediaFrame);
    this.mediaFrame = requestAnimationFrame(() => {
      this.mediaFrame = 0;
      this.observeMedia();
      this.syncMediaState();
    });
  }

  private scheduleClampState(): void {
    if (this.clampFrame) cancelAnimationFrame(this.clampFrame);
    this.clampFrame = requestAnimationFrame(() => {
      this.clampFrame = 0;
      this.measureClamp();
    });
  }

  private measureClamp(): void {
    const content = this.querySelector<HTMLElement>(
      ".ik-post__content.is-clamped",
    );
    if (!content) return;

    const overflows = content.scrollHeight > content.clientHeight + 1;
    if (this.contentOverflow !== overflows) this.contentOverflow = overflows;
  }

  private observeMedia(): void {
    this.mediaObserver?.disconnect();
    const scroller = this.querySelector<HTMLElement>(".ik-post__media-scroll");
    if (!scroller || typeof ResizeObserver === "undefined") return;
    this.mediaObserver = new ResizeObserver(() => this.syncMediaState());
    this.mediaObserver.observe(scroller);
  }

  private syncMediaState(): void {
    const scroller = this.querySelector<HTMLElement>(".ik-post__media-scroll");
    const scrollTop = scroller?.scrollTop ?? 0;
    const clientHeight = scroller?.clientHeight ?? 0;
    const scrollHeight = scroller?.scrollHeight ?? 0;
    const state = mediaScrollState(scrollTop, clientHeight, scrollHeight);
    const fade = mediaFadeState(scrollTop, clientHeight, scrollHeight);
    const figure = this.querySelector<HTMLElement>(".ik-post__figure");

    figure?.style.setProperty("--ik-fade-top", fade.top.toFixed(3));
    figure?.style.setProperty("--ik-fade-bottom", fade.bottom.toFixed(3));

    if (this.mediaCanScrollUp !== state.canScrollUp) {
      this.mediaCanScrollUp = state.canScrollUp;
    }
    if (this.mediaCanScrollDown !== state.canScrollDown) {
      this.mediaCanScrollDown = state.canScrollDown;
    }
  }

  private scrollMedia(direction: -1 | 1): void {
    const scroller = this.querySelector<HTMLElement>(".ik-post__media-scroll");
    if (!scroller) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scroller.scrollBy({
      top: direction * Math.max(140, scroller.clientHeight * 0.72),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  private onDialogChange = (event: Event): void => {
    const detail = (event as CustomEvent<{ value: boolean }>).detail;
    if (detail?.value === false) {
      this.dispatchEvent(
        new CustomEvent("ik-post-closed", {
          bubbles: true,
          composed: true,
        }),
      );
    }
  };
}

customElements.define("ik-post-dialog", IkPostDialog);
