import { html, nothing, type TemplateResult } from "lit";
import { IkElement } from "../ui/base";
import { refreshIcon } from "../ui/icons";

export class IkTopbar extends IkElement {
  static properties = {
    unread: { type: Number },
    total: { type: Number },
    level: { type: Number },
    busy: { state: true },
  };

  unread = 0;
  total = 0;
  level = 1;
  busy = false;

  render(): TemplateResult {
    const percent =
      this.total > 0 ? Math.round((this.unread / this.total) * 100) : 0;

    return html`
      <header class="ik-topbar">
        <div class="ik-topbar__left">
          <button
            class=${`ik-refresh${this.busy ? " is-busy" : ""}`}
            type="button"
            aria-label="Refresh feeds"
            title="Refresh feeds"
            @click=${this.refresh}
          >
            ${refreshIcon}
          </button>

          <div class="ik-profile">
            <span class="ik-avatar ik-avatar--profile">PX</span>
            <div class="ik-profile__meta">
              <span class="ik-profile__name">Proxy</span>
              <span class="ik-profile__bar">
                <span style=${`width:${percent}%`}></span>
              </span>
            </div>
            <span class="ik-profile__nums">${this.unread}/${this.total}</span>
            <span class="ik-profile__lv"
              >LV ${String(this.level).padStart(2, "0")}</span
            >
          </div>
        </div>

        <ui-tabs-list aria-label="Inter-Knot sections" class="ik-tabs">
          <ui-tabs-tab value="board">
            <button
              type="button"
              aria-label=${
                this.unread > 0 ? `Board, ${this.unread} unread` : "Board"
              }
            >
              ${
                this.unread > 0
                  ? html`<span class="ik-tab-alert" aria-hidden="true">!</span>`
                  : nothing
              }
              <span>Board</span>
            </button>
          </ui-tabs-tab>
          <ui-tabs-tab value="saved">
            <button type="button">Saved</button>
          </ui-tabs-tab>
          <ui-tabs-tab value="sources">
            <button type="button">Sources</button>
          </ui-tabs-tab>
          <ui-tabs-tab value="history">
            <button type="button">History</button>
          </ui-tabs-tab>
        </ui-tabs-list>

        <div class="ik-topbar__right"></div>
      </header>
    `;
  }

  private refresh = (): void => {
    if (this.busy) return;
    this.busy = true;
    this.dispatchEvent(
      new CustomEvent("ik-refresh", { bubbles: true, composed: true }),
    );
    window.setTimeout(() => {
      this.busy = false;
    }, 900);
  };
}

customElements.define("ik-topbar", IkTopbar);
