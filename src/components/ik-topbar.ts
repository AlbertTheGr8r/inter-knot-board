import { html, nothing, type TemplateResult } from "lit";
import {
  createMindfulState,
  isMindfulEmpty,
  mindfulCapLabel,
  mindfulCapUnit,
  mindfulRatio,
  mindfulRemainingLabel,
  type MindfulState,
} from "../lib/mindful";
import { IkElement } from "../ui/base";
import { refreshIcon } from "../ui/icons";

export class IkTopbar extends IkElement {
  static properties = {
    unread: { type: Number },
    mindful: { attribute: false },
    busy: { state: true },
  };

  unread = 0;
  mindful: MindfulState = createMindfulState();
  busy = false;

  render(): TemplateResult {
    const ratio = mindfulRatio(this.mindful);
    const empty = isMindfulEmpty(this.mindful);
    const low = ratio <= 0.2;

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

          <button
            class=${`ik-profile${low ? " is-low" : ""}${empty ? " is-empty" : ""}`}
            type="button"
            aria-label=${`Open Proxy menu. ${mindfulRemainingLabel(this.mindful)}.`}
            title=${mindfulRemainingLabel(this.mindful)}
            @click=${this.openProxy}
          >
            <span class="ik-avatar ik-avatar--profile">PX</span>
            <span class="ik-profile__meta">
              <span class="ik-profile__name">Proxy</span>
              <span
                class="ik-profile__bar"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow=${Math.round(ratio * 100)}
                aria-label="Mindful reading time"
              >
                <span style=${`width:${ratio * 100}%`}></span>
              </span>
            </span>
            <span class="ik-profile__cap">
              <strong>${mindfulCapLabel(this.mindful)}</strong>
              <small>${mindfulCapUnit(this.mindful)}</small>
            </span>
          </button>
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

  private openProxy = (): void => {
    this.dispatchEvent(
      new CustomEvent("ik-open-proxy", { bubbles: true, composed: true }),
    );
  };
}

customElements.define("ik-topbar", IkTopbar);
