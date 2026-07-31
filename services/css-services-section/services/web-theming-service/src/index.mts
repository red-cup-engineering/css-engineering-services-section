/**
 * web-theming-service — a certified web-theming design system: pure,
 * deterministic palette derivation and contrast certification
 * (theming-computer) plus the theme shape, HTML chrome, and CSS assembly
 * built on it (theming).
 *
 * Extracted from @red-cup-engineering/organizing-with-the-web (src/theming,
 * src/theming-computer via `git mv`), which now re-exports this surface
 * unchanged so its 13 dependents keep working.
 */
export * as theming from "./theming/index.mjs";
export * as themingComputer from "./theming-computer/index.mjs";
