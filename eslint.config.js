export default [
  {
    ignores: ["dist"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {},
  },
];
