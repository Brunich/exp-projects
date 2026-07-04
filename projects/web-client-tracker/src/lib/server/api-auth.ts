import { NextResponse } from "next/server";
import { getSession } from "../auth";

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Login required",
          },
        },
        { status: 401 },
      ),
    };
  }

  return { session, response: null };
}
