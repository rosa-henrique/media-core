import { defineConfig } from "eslint/config";

import baseConfig from "../../configs/eslint/base.mjs";
import nextConfig from "../../configs/eslint/next.mjs";

export default defineConfig([...baseConfig, ...nextConfig]);
