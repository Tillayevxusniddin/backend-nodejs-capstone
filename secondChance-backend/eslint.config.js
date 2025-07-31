/** @type {import('eslint').Linter.Config} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    ignores: ["dist/", "node_modules/"],
    rules: {
      "no-unused-vars": "error",
      // "no-console": "warn",
      // Add more rules as needed
    },
  },
];
