export function GET() {
  return Response.redirect(new URL("/admin", "http://localhost:3000"), 302);
}
