export function GET() {
  const proxyPublicOrigin = process.env.PROXY_PUBLIC_ORIGIN ?? "http://localhost:3002";

  return Response.redirect(new URL("/web/proxy-redirect-target", proxyPublicOrigin), 302);
}
