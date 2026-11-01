"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const fields = json?.details?.fieldErrors as Record<string, string[]> | undefined;
      const detail = fields && Object.entries(fields).map(([k, v]) => `${k} : ${v[0]}`).join(" · ");
      setError([json?.error ?? "Erreur", detail].filter(Boolean).join(" — "));
      return;
    }
    const next = params.get("next");
    router.push(next?.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  const input = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";
  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
      {mode === "register" && (
        <label className="block space-y-1 text-sm">
          <span>Nom</span>
          <input name="name" className={input} autoComplete="name" />
        </label>
      )}
      <label className="block space-y-1 text-sm">
        <span>E-mail</span>
        <input name="email" type="email" required className={input} autoComplete="email" />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Mot de passe</span>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : 1}
          className={input}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-violet-600 py-2.5 font-medium text-white hover:bg-violet-700 disabled:opacity-50">
        {pending ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
      </button>
      <p className="text-center text-sm text-neutral-500">
        {mode === "login" ? (
          <>Pas de compte ? <Link href="/register" className="text-violet-600">Inscription</Link></>
        ) : (
          <>Déjà inscrit ? <Link href="/login" className="text-violet-600">Connexion</Link></>
        )}
      </p>
    </form>
  );
}
