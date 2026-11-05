// Lint rules (design 10). Next.js's own rules, plus the strict accessibility
// rules from eslint-plugin-jsx-a11y: missing alt text, unlabeled controls,
// bad ARIA and the like fail the PR check.

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{jsx,tsx}"],
    // eslint-config-next already loads the jsx-a11y plugin; turn on its strict set.
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      // Labels here often wrap their text in a span or two (a name plus a hint).
      "jsx-a11y/label-has-associated-control": ["error", { assert: "either", depth: 3 }],
    },
  },
  {
    rules: {
      // A leading underscore marks a value left out on purpose.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
