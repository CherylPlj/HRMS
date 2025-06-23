import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {},
});

const eslintConfig = [
  {
    ignores: [
      "src/generated/**",
      ".next/**",
      "node_modules/**",
    ],
  },
  ...compat.config({
    extends: ["next/core-web-vitals"],
    parserOptions: {
      project: "./tsconfig.json",
      sourceType: "module",
      ecmaVersion: "latest"
    },
    settings: {
      next: {
        rootDir: __dirname
      }
    }
  }),
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off"
    },
  },
];

export default eslintConfig;

