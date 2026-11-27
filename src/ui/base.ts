import { LitElement } from "lit";

/**
 * Light-DOM Lit element. Keeping our components in the light DOM means the
 * global design tokens, grain, and @ui-sdk/web parts all share one stylesheet.
 */
export abstract class IkElement extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }
}
