"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/app/login/admin/actions";

export function AdminLoginForm() {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string }>({});
  const [pending, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; startTransition(async () => { const result = await loginAdmin({}, new FormData(form)); if (result.success) router.push("/admin/dashboard"); else setState(result); }); }
  return <form className="admin-login-form" onSubmit={submit}><label>Username<input name="username" autoComplete="username" required placeholder="Admin username" /></label><label>Password<input name="password" autoComplete="current-password" required type="password" placeholder="Enter password" /></label>{state.error && <p className="admin-login-error">{state.error}</p>}<button className="admin-primary-button" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in to admin"}<span aria-hidden="true">→</span></button></form>;
}