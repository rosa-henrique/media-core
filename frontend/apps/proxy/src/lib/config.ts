import type { NextRequest } from "next/server";

export function getProxyPublicOrigin(request: NextRequest): string {
  return (process.env.PROXY_PUBLIC_ORIGIN ?? request.nextUrl.origin).replace(/\/$/, "");
}
export function getWebOrigin(): string {
  return (process.env.WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getAdminOrigin(): string {
  return (process.env.ADMIN_ORIGIN ?? "http://localhost:3001").replace(/\/$/, "");
}
