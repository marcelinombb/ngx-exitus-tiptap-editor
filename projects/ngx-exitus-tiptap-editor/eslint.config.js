// @ts-check
const { defineConfig } = require("eslint/config");
const rootConfig = require("../../eslint.config.js");

module.exports = defineConfig([
  ...rootConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "@angular-eslint/directive-selector": "off",
      "@angular-eslint/component-selector": "off",
      "@angular-eslint/no-output-on-prefix": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          "allowShortCircuit": true,
          "allowTernary": true
        }
      ],
      "@typescript-eslint/ban-ts-comment": "warn"
    },
  },
  {
    files: ["**/*.html"],
    rules: {
      "@angular-eslint/template/click-events-have-key-events": "warn",
      "@angular-eslint/template/interactive-supports-focus": "warn",
      "@angular-eslint/template/prefer-control-flow": "warn",
      "@angular-eslint/template/label-has-associated-control": "warn"
    },
  }
]);
