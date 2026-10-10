import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const companyCookie = request.cookies.get("active_company")?.value;
  const companyHeader = request.headers.get("x-company-id");
  const queryCompany = request.nextUrl.searchParams.get("company");

  const rawCompany = (companyHeader || companyCookie || queryCompany || "TCE").toUpperCase();
  const validCompany = rawCompany === "TECAIR" ? "TECAIR" : "TCE";

  requestHeaders.set("x-company-id", validCompany);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Ensure cookie is in sync if not already set or changed
  if (!companyCookie || companyCookie.toUpperCase() !== validCompany) {
    const isHttps = request.headers.get("x-forwarded-proto") === "https" || request.url.startsWith("https");
    response.cookies.set("active_company", validCompany, {
      path: "/",
      sameSite: "lax",
      secure: isHttps,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, logos)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
