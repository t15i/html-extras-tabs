import { TAB_PANEL } from "./names";

/**
 * The style sheet the library puts into every root a panel is in.
 */
export const styles: CSSStyleSheet = new CSSStyleSheet();

styles.replaceSync(`
${TAB_PANEL}[hidden]:not([hidden="until-found" i]) {
  display: none;
}

${TAB_PANEL}[hidden="until-found" i] {
  display: block;
  margin: 0;
  border-width: 0;
  padding: 0;
  min-inline-size: 0;
  min-block-size: 0;
  inline-size: 0;
  block-size: 0;
}
`);
