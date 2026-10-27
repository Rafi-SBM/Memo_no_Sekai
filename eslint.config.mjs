import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    files: ["app/page.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "data/**", "public/**"],
  },
];
