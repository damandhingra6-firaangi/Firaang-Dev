import { cookies } from "next/headers";

export const ACCOUNT_SESSION_COOKIE_NAME = "firaangi_account_session";

export async function getAccountSessionTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCOUNT_SESSION_COOKIE_NAME)?.value ?? null;
}