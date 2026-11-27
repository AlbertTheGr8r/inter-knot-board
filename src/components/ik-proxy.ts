import { html, type TemplateResult } from "lit";
import {
  MINDFUL_CAP_MINUTES,
  createMindfulState,
  isMindfulEmpty,
  mindfulMinutesLeft,
  mindfulRatio,
  mindfulRemainingLabel,
  type MindfulMode,
  type MindfulState,
} from "../lib/mindful";
import { IkElement } from "../ui/base";
import { closeIcon } from "../ui/icons";

interface DialogElement extends HTMLElement {
  api?: { open: (options?: unknown) => Promise<unknown> };
}

export class IkProxy extends IkElement {
  static properties = {
    mindful: { attribute: false },
    compact: { type: Boolean },
    readOnScroll: { type: Boolean },
  };

  mindful: MindfulState = createMindfulState();
  compact = false;
  readOnScroll = false;

  private dialogEl: DialogElement | null = null;

  protected async firstUpdated(): Promise<void> {
    await customElements.whenDefined("ui-dialog");
    this.dialogEl = this.querySelector<DialogElement>("ui-dialog");
    this.dialogEl?.addEventListener("openchange", this.onDialogChange);
  }

  disconnectedCallback(): void {
    this.dialogEl?.removeEventListener("openchange", this.onDialogChange);
    super.disconnectedCallback();
  }

  async open(): Promise<void> {
    await this.updateComplete;

    if (!this.dialogEl) {
      await customElements.whenDefined("ui-dialog");
      this.dialogEl = this.querySelector<DialogElement>("ui-dialog");
    }

    void this.dialogEl?.api?.open();
  }

  render(): TemplateResult {
    const ratio = mindfulRatio(this.mindful);
    const empty = isMindfulEmpty(this.mindful);
    const unlimited = this.mindful.mode === "unlimited";

    return html`
      <ui-dialog>
        <ui-dialog-backdrop hidden></ui-dialog-backdrop>
        <ui-dialog-content
          class="ik-proxy-dialog"
          hidden
          initial-focus="content"
        >
          <div class="ik-proxy">
            <header class="ik-proxy__head">
              <span class="ik-avatar ik-avatar--profile">PX</span>
              <div class="ik-proxy__identity">
                <ui-dialog-title as-child>
                  <h2>Proxy</h2>
                </ui-dialog-title>
                <p>Local profile · mindful reading</p>
              </div>
              <ui-dialog-close>
                <button
                  class="ik-proxy__close"
                  type="button"
                  aria-label="Close Proxy menu"
                >
                  ${closeIcon}
                </button>
              </ui-dialog-close>
            </header>

            <div class="ik-proxy__body">
              <section class="ik-proxy__section">
                <div class="ik-proxy__section-head">
                  <h3>Mindful reading</h3>
                  <span class=${`ik-proxy__status${empty ? " is-empty" : ""}`}>
                    ${
                      unlimited
                        ? "Unlimited"
                        : empty
                          ? "Recharge needed"
                          : `${mindfulMinutesLeft(this.mindful)}m left`
                    }
                  </span>
                </div>

                <div class="ik-proxy__meter" aria-hidden="true">
                  <span style=${`width:${ratio * 100}%`}></span>
                </div>

                <p class="ik-proxy__hint">
                  ${mindfulRemainingLabel(this.mindful)}. The timer only runs
                  while you browse the board. Leave for a few minutes and it
                  recharges.
                </p>

                <div
                  class="ik-proxy__caps"
                  role="group"
                  aria-label="Reading cap"
                >
                  ${MINDFUL_CAP_MINUTES.map(
                    (cap) => html`
                      <button
                        type="button"
                        aria-pressed=${
                          !unlimited && this.mindful.capMinutes === cap
                            ? "true"
                            : "false"
                        }
                        @click=${() => this.setCap(cap)}
                      >
                        ${cap}m
                      </button>
                    `,
                  )}
                  <button
                    type="button"
                    aria-pressed=${unlimited ? "true" : "false"}
                    @click=${() => this.setMode("unlimited")}
                  >
                    ∞
                  </button>
                </div>

                <div class="ik-proxy__row">
                  <span>Reset this session</span>
                  <button
                    class="ik-proxy__text-button"
                    type="button"
                    @click=${this.reset}
                  >
                    Refill
                  </button>
                </div>

                <p class="ik-proxy__fine">
                  Changing the cap starts a fresh session. Unlimited is the
                  weekend switch; it is never the default.
                </p>
              </section>

              <section class="ik-proxy__section">
                <div class="ik-proxy__section-head">
                  <h3>Appearance</h3>
                </div>
                <label class="ik-proxy__toggle">
                  <input
                    type="checkbox"
                    .checked=${this.compact}
                    @change=${this.toggleCompact}
                  />
                  <span>
                    <strong>Compact cards</strong>
                    <small>Hide excerpts and tighten the wall.</small>
                  </span>
                </label>
                <label class="ik-proxy__toggle">
                  <input
                    type="checkbox"
                    .checked=${this.readOnScroll}
                    @change=${this.toggleReadOnScroll}
                  />
                  <span>
                    <strong>Mark cards read on scroll</strong>
                    <small>
                      Requires the whole card for 1.5s. Unread stays a queue.
                    </small>
                  </span>
                </label>
              </section>

              <section class="ik-proxy__section">
                <div class="ik-proxy__section-head">
                  <h3>This build</h3>
                </div>
                <p class="ik-proxy__fine">
                  The board is a static demo. Reading state, the timer, and the
                  cap stay in this browser. No account, no telemetry, no hosted
                  proxy.
                </p>
              </section>
            </div>
          </div>
        </ui-dialog-content>
      </ui-dialog>
    `;
  }

  private setCap(cap: number): void {
    this.dispatchEvent(
      new CustomEvent<number>("ik-mindful-cap", {
        detail: cap,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private setMode(mode: MindfulMode): void {
    this.dispatchEvent(
      new CustomEvent<MindfulMode>("ik-mindful-mode", {
        detail: mode,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private reset = (): void => {
    this.dispatchEvent(
      new CustomEvent("ik-mindful-reset", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private toggleCompact = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    this.dispatchEvent(
      new CustomEvent<boolean>("ik-density", {
        detail: input.checked,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private toggleReadOnScroll = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    this.dispatchEvent(
      new CustomEvent<boolean>("ik-read-on-scroll", {
        detail: input.checked,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private onDialogChange = (event: Event): void => {
    const detail = (event as CustomEvent<{ value: boolean }>).detail;
    if (detail?.value === false) {
      this.dispatchEvent(
        new CustomEvent("ik-proxy-closed", {
          bubbles: true,
          composed: true,
        }),
      );
    }
  };
}

customElements.define("ik-proxy", IkProxy);
