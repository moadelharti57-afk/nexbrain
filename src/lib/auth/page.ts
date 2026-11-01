import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";

/** Pour les pages : utilisateur connecté, sinon redirection vers /login. */
export async function pageUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
