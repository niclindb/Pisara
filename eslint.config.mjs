// Lint for TypeScript and accessibility (design 10: jsx-a11y in strict mode).
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "playwright-report/**", "test-results/**"] },
  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  { files: ["**/*.tsx"], ...jsxA11y.flatConfigs.strict },
  {
    files: ["**/*.tsx"],
    // Labels here wrap their input, with the text a few elements deep.
    rules: { "jsx-a11y/label-has-associated-control": ["error", { assert: "either", depth: 4 }] },
  },
);
