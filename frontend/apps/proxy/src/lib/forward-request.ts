import type { NextRequest } from "next/server";

import { getAdminOrigin, getProxyPublicOrigin, getWebOrigin } from "./config";

/**
 * Tempo máximo de espera pela resposta da aplicação de destino.
 *
 * Se o backend não responder dentro desse período, a requisição será
 * interrompida e o proxy retornará HTTP 504 (Gateway Timeout).
 */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Cabeçalhos hop-by-hop descrevem aspectos de uma conexão HTTP específica.
 *
 * Eles não devem ser encaminhados indiscriminadamente entre conexões
 * diferentes, como a conexão navegador -> proxy e proxy -> aplicação.
 */
const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

/**
 * Aplicações que podem receber requisições encaminhadas pelo proxy.
 */
type Application = "web" | "admin";

/**
 * Ajusta o cabeçalho Location de um redirecionamento.
 *
 * Quando o destino pertence à própria aplicação, o endereço interno
 * é substituído pelo endereço público do proxy.
 *
 * Exemplo:
 *   http://localhost:3000/web/login
 *   -> http://localhost:3002/web/login
 *
 * Redirecionamentos para outros domínios permanecem inalterados.
 *
 * O pathname, a query string e o fragmento são preservados.
 */
function rewriteRedirectLocation(location: string, application: Application): string {
  const proxyOrigin = getProxyPublicOrigin();

  const internalOrigin = application === "web" ? getWebOrigin() : getAdminOrigin();

  // Resolve Locations relativos ou absolutos usando a aplicação
  // de destino como base.
  const redirectUrl = new URL(location, internalOrigin);
  const proxyUrl = new URL(proxyOrigin);

  // Não modifica redirecionamentos para domínios externos.
  if (redirectUrl.origin !== new URL(internalOrigin).origin) {
    return location;
  }

  // Mantém o caminho e os parâmetros, mas troca a origem interna
  // pela origem pública do proxy.
  return new URL(
    `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`,
    proxyUrl,
  ).toString();
}

/**
 * Identifica uma navegação convencional de página HTML.
 *
 * Essa distinção permite apresentar uma página amigável em falhas
 * de navegação, sem substituir indiscriminadamente respostas de APIs,
 * requisições de dados do Next.js ou prefetches.
 */
function isHtmlNavigation(request: NextRequest): boolean {
  const headers = request.headers;
  const pathname = request.nextUrl.pathname;

  return (
    headers.get("accept")?.includes("text/html") === true &&
    !pathname.includes("/_next/") &&
    !headers.has("rsc") &&
    !headers.has("next-router-prefetch") &&
    !headers.has("next-router-state-tree")
  );
}

/**
 * Cria uma resposta de erro sem expor detalhes técnicos do backend.
 *
 * Navegações HTML recebem uma página simples com opção de tentar
 * novamente. Outras requisições recebem um JSON com a mensagem de erro.
 *
 * O status recebido é preservado para diferenciar, por exemplo,
 * HTTP 502 (falha de comunicação) de HTTP 504 (timeout).
 */
function createErrorResponse(request: NextRequest, status: number): Response {
  const message =
    status === 504
      ? "O serviço demorou para responder. Tente novamente."
      : "O serviço está temporariamente indisponível. Tente novamente.";

  if (isHtmlNavigation(request)) {
    return new Response(
      `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Serviço indisponível</title>
  </head>
  <body>
    <main>
      <h1>Não foi possível concluir sua solicitação</h1>
      <p>${message}</p>
      <button onclick="window.location.reload()">Tentar novamente</button>
    </main>
  </body>
</html>`,
      {
        status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Encaminha uma requisição recebida pelo proxy para Web ou Admin.
 *
 * Responsabilidades:
 * - Construir a URL da aplicação de destino.
 * - Encaminhar método, cabeçalhos e corpo da requisição.
 * - Aplicar timeout à comunicação com o destino.
 * - Apresentar erros amigáveis em navegações HTML.
 * - Reescrever redirecionamentos internos para o endereço público.
 * - Remover cabeçalhos que não devem atravessar o proxy.
 * - Preservar o status e o corpo da resposta de destino.
 *
 * Este encaminhamento não substitui autenticação, autorização,
 * validação de permissões ou políticas específicas de cada aplicação.
 */
export async function forwardRequest(
  request: NextRequest,
  application: Application,
): Promise<Response> {
  // Seleciona a origem interna da aplicação solicitada.
  const origin = application === "web" ? getWebOrigin() : getAdminOrigin();

  // Preserva o caminho e a query string recebidos pelo proxy.
  const pathname = request.nextUrl.pathname;

  const destination = new URL(
    `${pathname}${request.nextUrl.search}`,
    origin.endsWith("/") ? origin : `${origin}/`,
  );

  // Cria uma cópia mutável dos cabeçalhos da requisição.
  const headers = new Headers(request.headers);

  // Remove cabeçalhos específicos da conexão original.
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  // O host deve ser determinado pela URL de destino, não pelo
  // host utilizado pelo navegador para acessar o proxy.
  headers.delete("host");

  try {
    // Configura a requisição HTTP para a aplicação de destino.
    const init: RequestInit & { duplex: "half" } = {
      method: request.method,
      headers,

      // GET e HEAD não devem enviar corpo.
      // Para os demais métodos, encaminha o stream recebido.
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,

      // Não segue redirecionamentos automaticamente. Precisamos
      // inspecionar o status e o Location para preservar o proxy
      // como ponto de entrada das navegações internas.
      redirect: "manual",

      // Interrompe a requisição caso ultrapasse o tempo limite.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),

      // Necessário para encaminhar um corpo em stream neste runtime.
      duplex: "half",
    };

    const upstreamResponse = await fetch(destination, init);

    // Em navegações HTML, substitui erros 5xx por uma página amigável.
    // Para outras requisições, a resposta original será encaminhada.
    if (
      upstreamResponse.status >= 500 &&
      upstreamResponse.status <= 599 &&
      isHtmlNavigation(request)
    ) {
      return createErrorResponse(request, upstreamResponse.status);
    }

    // Copia os cabeçalhos da resposta para um objeto mutável.
    // Não alteramos diretamente upstreamResponse.headers, pois esses
    // cabeçalhos podem ser imutáveis no resultado do fetch.
    const responseHeaders = new Headers(upstreamResponse.headers);

    const location = responseHeaders.get("location");

    // Redirecionamentos internos devem continuar passando pelo proxy.
    // Redirecionamentos externos devem manter seu destino original.
    if (location && [301, 302, 303, 307, 308].includes(upstreamResponse.status)) {
      responseHeaders.set("location", rewriteRedirectLocation(location, application));
    }

    // Remove cabeçalhos específicos da conexão do backend.
    for (const header of HOP_BY_HOP_HEADERS) {
      responseHeaders.delete(header);
    }

    // O fetch pode descomprimir o corpo da resposta.
    // Por isso, os cabeçalhos originais de compressão e tamanho
    // podem deixar de corresponder ao corpo encaminhado.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    // HEAD retorna os mesmos metadados que GET, mas sem corpo.
    // Para os demais métodos, encaminha o corpo recebido.
    return new Response(request.method === "HEAD" ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    // Registra os detalhes técnicos no servidor para facilitar
    // o diagnóstico. Em produção, considere utilizar o logger
    // estruturado e a plataforma de observabilidade do projeto.
    console.error("Erro ao encaminhar requisição pelo proxy:", error);

    // Diferencia timeout de outras falhas de comunicação.
    const isTimeout =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

    // 504: tempo limite excedido.
    // 502: falha de comunicação ou outra exceção no encaminhamento.
    return createErrorResponse(request, isTimeout ? 504 : 502);
  }
}
