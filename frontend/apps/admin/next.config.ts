import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  basePath: "/admin",
  cacheComponents: true,
  partialPrefetching: true,

  transpilePackages: ["@frontend/ui", "@frontend/api"],

  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};

export default nextConfig;
