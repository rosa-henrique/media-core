import type { NextRequest } from "next/server";

import { forwardRequest } from "@/lib/forward-request";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return forwardRequest(request, "admin");
}

export function HEAD(request: NextRequest) {
  return forwardRequest(request, "admin");
}

export function POST(request: NextRequest) {
  return forwardRequest(request, "admin");
}

export function PUT(request: NextRequest) {
  return forwardRequest(request, "admin");
}

export function PATCH(request: NextRequest) {
  return forwardRequest(request, "admin");
}

export function DELETE(request: NextRequest) {
  return forwardRequest(request, "admin");
}

export function OPTIONS(request: NextRequest) {
  return forwardRequest(request, "admin");
}
