import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
  ...compat.extends("next/core-web-vitals"),
  {
    // Inline mock components in tests routinely skip displayName — it's harmless
    // for the purposes of the React rule and adds noise.
    files: ["tests/**/*.{js,jsx}"],
    rules: {
      "react/display-name": "off",
    },
  },
  {
    // jest.setup.js mocks next/image with a bare <img> — the LCP warning does
    // not apply in jsdom and the mock must stay primitive.
    files: ["jest.setup.js"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
