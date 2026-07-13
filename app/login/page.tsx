"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.");
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand"><span>PC</span> PulseCamp</div>
        <p className="login-eyebrow">Ambiente demonstrativo</p>
        <h1 id="login-title">Acesse o painel de campanhas</h1>
        <p className="login-copy">Use um dos perfis abaixo para avaliar autenticação, papéis e isolamento por empresa.</p>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" defaultValue="admin@pulsecamp.demo" required />
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" defaultValue="PulseCamp2026!" minLength={8} required />
          {error ? <p className="login-error" role="alert">{error}</p> : null}
          <button type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar no PulseCamp"}</button>
        </form>
        <div className="demo-accounts">
          <strong>Perfis para avaliação</strong>
          <span>Admin: admin@pulsecamp.demo / PulseCamp2026!</span>
          <span>Analista: analista@pulsecamp.demo / Demo2026!</span>
        </div>
      </section>
    </main>
  );
}
