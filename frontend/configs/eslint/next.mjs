import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const nextFiles = ["**/*.{js,jsx,ts,tsx}"];

const nextConfig = [
  ...nextVitals.map((config) => ({
    ...config,
    files: nextFiles,
  })),

  ...nextTs.map((config) => ({
    ...config,
    files: nextFiles,
  })),
];

export default nextConfig;
