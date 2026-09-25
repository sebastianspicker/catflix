import standard from "stylelint-config-standard";

export default {
  ...standard,
  ignoreFiles: ["dist/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**", ".agents/**", ".claude/**", ".codex/**", "tmp/**"],
  rules: {
    ...standard.rules,
    "alpha-value-notation": null,
    "at-rule-empty-line-before": null,
    "color-function-alias-notation": null,
    "color-function-notation": null,
    "declaration-block-single-line-max-declarations": null,
    "media-feature-range-notation": null,
    "no-descending-specificity": null,
    "no-duplicate-selectors": null,
    "property-no-deprecated": null,
    "property-no-vendor-prefix": null,
    "shorthand-property-no-redundant-values": null,
    "value-keyword-case": null,
  },
};
