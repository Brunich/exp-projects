import { NextResponse } from "next/server";
import {
  buildSessionCookie,
  getUserFromEmail,
  isValidDemoLogin,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/clients");

  if (!isValidDemoLogin(email, password)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "invalid");
    if (next !== "/clients") redirectUrl.searchParams.set("next", next);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const user = getUserFromEmail(email);
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), {
      status: 303,
    });
  }

  const response = NextResponse.redirect(new URL(next, request.url), {
    status: 303,
  });

  response.cookies.set(SESSION_COOKIE, buildSessionCookie(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
