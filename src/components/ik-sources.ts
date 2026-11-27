import { html, nothing, type TemplateResult } from "lit";
import { initials } from "../lib/format";
import { IkElement } from "../ui/base";
import { chevronDownIcon, refreshIcon } from "../ui/icons";

export interface SourceSummary {
  id: string;
  title: string;
  color: string;
  unread: number;
  total: number;
}

export class IkSources extends IkElement {
  static properties = {
    sources: { attribute: false },
  };

  sources: SourceSummary[] = [];

  render(): TemplateResult {
    return html`
      <section class="ik-view ik-sources" aria-labelledby="ik-sources-title">
        <header class="ik-view__head">
          <div>
            <span class="ik-view__mark">[ NETWORK ]</span>
            <h2 id="ik-sources-title">Sources</h2>
            <p>
              The feeds wired into this board. Direct RSS is the next milestone;
              until then these are the demo sources.
            </p>
          </div>
          <button class="ik-view__action" type="button" @click=${this.refresh}>
            ${refreshIcon} Refresh all
          </button>
        </header>

        <div class="ik-view__note">
          <strong>Direct first.</strong>
          Add-feed, discovery, OPML, and the direct transport land in the next
          phase. No hosted proxy and no account.
        </div>

        ${
          this.sources.length > 0
            ? html`
                <ul class="ik-source-list">
                  ${this.sources.map(
                    (source) => html`
                      <li>
                        <button
                          class="ik-source-row"
                          type="button"
                          aria-label=${`Open the board filtered to ${source.title}`}
                          @click=${() => this.openSource(source.id)}
                        >
                          <span
                            class="ik-avatar ik-avatar--source"
                            style=${`--ik-avatar:${source.color}`}
                            >${initials(source.title)}</span
                          >
                          <span class="ik-source-row__body">
                            <strong>${source.title}</strong>
                            <span>${source.id} · ${source.total} posts</span>
                          </span>
                          <span class="ik-source-row__count">
                            ${
                              source.unread > 0
                                ? `${source.unread} unread`
                                : "caught up"
                            }
                          </span>
                          <span class="ik-source-row__chevron"
                            >${chevronDownIcon}</span
                          >
                        </button>
                      </li>
                    `,
                  )}
                </ul>
              `
            : html`
                <div class="ik-view__empty">
                  <span>[ EMPTY ]</span>
                  <h3>No sources yet</h3>
                  <p>The demo board should provide at least one source.</p>
                </div>
              `
        }

        <footer class="ik-view__foot">
          <button class="ik-view__action" type="button" disabled>
            Add source
          </button>
          <button class="ik-view__action" type="button" disabled>
            Import OPML
          </button>
          <span>Available with the direct feed pipeline.</span>
        </footer>
      </section>
    `;
  }

  private refresh = (): void => {
    this.dispatchEvent(
      new CustomEvent("ik-refresh", { bubbles: true, composed: true }),
    );
  };

  private openSource = (id: string): void => {
    this.dispatchEvent(
      new CustomEvent<string>("ik-open-source", {
        detail: id,
        bubbles: true,
        composed: true,
      }),
    );
  };
}

customElements.define("ik-sources", IkSources);
