import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

const productionFiles = ["src/**/*.{ts,tsx}", "scripts/**/*.{js,mjs}", "*.config.{ts,mjs}"];
const testFiles = ["src/**/*.{test,spec}.{ts,tsx}", "e2e/**/*.ts"];
const functionLimits = {
  "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: false }],
  complexity: ["error", 10],
  "sonarjs/cognitive-complexity": ["error", 15],
};

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    plugins: { sonarjs },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["scripts/**/*.{js,mjs}"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: ["src/main.tsx"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
    },
  },
  {
    files: productionFiles,
    rules: functionLimits,
  },
  {
    files: testFiles,
    rules: {
      ...functionLimits,
      "max-lines-per-function": ["error", { max: 100, skipBlankLines: true, skipComments: false }],
    },
  },
);
