import { NextResponse, type NextRequest } from "next/server";

/**
 * Vérification « optimiste » : redirige vers /login si aucun cookie de session.
 * La vraie vérification (session valide + propriété) est faite côté serveur.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("nb_session")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/brainstorms/:path*", "/ideas/:path*", "/compare/:path*", "/history/:path*", "/settings/:path*", "/report/:path*"] };
