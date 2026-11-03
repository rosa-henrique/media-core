import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  basePath: "/web",
  cacheComponents: true,
  partialPrefetching: true,

  transpilePackages: ["@frontend/ui", "@frontend/api"],

  // Gera uma saída de produção independente para execução em contêiner.
  ...(process.env.NEXT_OUTPUT_STANDALONE === "true" && {
    output: "standalone",
  }),

  // Permite rastrear dependências compartilhadas na raiz do monorepo.
  // Este comando considera que o Next.js é executado a partir de apps/web.
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};

export default nextConfig;
