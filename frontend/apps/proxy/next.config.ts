import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  /*
   * Encaminhamento das aplicações Web e Admin.
   *
   * Os rewrites abaixo são mantidos apenas como referência da
   * implementação anterior. Não devem ser ativados enquanto
   * o proxy utilizar Route Handlers para encaminhar as requisições.
   *
   * Motivo:
   * Os Route Handlers permitem inspecionar as respostas das aplicações
   * de destino e tratar erros HTTP 5xx e falhas de conectividade.
   *
   * Implementação atual:
   * - apps/proxy/src/app/web/[[...path]]/route.ts
   * - apps/proxy/src/app/admin/[[...path]]/route.ts
   * - apps/proxy/src/lib/forward-request.ts
   *
   * Para cada aplicação, o Route Handler chama forwardRequest(),
   * que encaminha a requisição para WEB_ORIGIN ou ADMIN_ORIGIN.
   *
   * Exemplo da implementação anterior com rewrites:
   *
   * const webOrigin = (
   *   process.env.WEB_ORIGIN ?? "http://localhost:3000"
   * ).replace(/\/$/, "");
   *
   * const adminOrigin = (
   *   process.env.ADMIN_ORIGIN ?? "http://localhost:3001"
   * ).replace(/\/$/, "");
   *
   * async rewrites() {
   *   return [
   *     // Encaminha a raiz da aplicação Web.
   *     {
   *       source: "/web",
   *       destination: `${webOrigin}/web`,
   *     },
   *     // Encaminha todas as subrotas da aplicação Web.
   *     {
   *       source: "/web/:path*",
   *       destination: `${webOrigin}/web/:path*`,
   *     },
   *     // Encaminha a raiz da aplicação Admin.
   *     {
   *       source: "/admin",
   *       destination: `${adminOrigin}/admin`,
   *     },
   *     // Encaminha todas as subrotas da aplicação Admin.
   *     {
   *       source: "/admin/:path*",
   *       destination: `${adminOrigin}/admin/:path*`,
   *     },
   *   ];
   * },
   */
};

export default nextConfig;
