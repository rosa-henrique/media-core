/*
 * nome do arquivo deveria ser proxy.ts
 * Proteção opcional de rotas do Admin.
 *
 * No exemplo abaixo, /admin/internal e suas subrotas seriam bloqueadas
 * com HTTP 403.
 *
 * Para ativar a proteção:
 * 1. Descomente os imports, a função proxy e o config abaixo.
 * 2. Ajuste os caminhos conforme as regras desejadas.
 *
 * No Next.js 16, utiliza-se proxy.ts e a função proxy().
 * Em versões anteriores, a convenção era middleware.ts e middleware().
 *
 * IMPORTANTE:
 * Esta proteção controla o acesso às rotas no proxy.
 * Ela não substitui autenticação e autorização nos serviços responsáveis
 * pelos dados.
 */

// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export function proxy(request: NextRequest) {
//   const pathname = request.nextUrl.pathname;

//   // Exemplo: bloqueia uma rota específica e suas subrotas.
//   if (
//     pathname === "/admin/internal" ||
//     pathname.startsWith("/admin/internal/")
//   ) {
//     return new NextResponse("Forbidden", { status: 403 });
//   }

//   // Permite que as demais requisições continuem normalmente.
//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/admin/:path*"],
// };
