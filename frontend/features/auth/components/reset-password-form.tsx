"use client";

import Link from "next/link";
import { useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      if (!result) throw new Error(`The server returned an invalid response (${response.status}).`);
      if (!response.ok) throw new Error(result.error ?? "The password could not be reset.");
      setComplete(true);
      setMessage(result.message ?? "Your password has been reset.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "The password could not be reset.");
    } finally {
      setPending(false);
    }
  }

  return <section className="auth-panel organic-glass organic-water">
    <p className="eyebrow">Princess &amp; Brothers account</p>
    <h1>Choose a new password</h1>
    <p className="auth-intro">Enter a new password for your account.</p>
    {token ? complete ? <p className="auth-message" role="status">{message}</p> : <form className="auth-form" onSubmit={resetPassword}>
      <label>New password<input autoComplete="new-password" minLength={8} maxLength={72} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label>Confirm new password<input autoComplete="new-password" minLength={8} maxLength={72} required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      <button className="button button-navy btn-3d btn-3d-green" disabled={pending} type="submit">{pending ? "Updating password…" : "Reset password"}</button>
    </form> : <p className="auth-error" role="alert">This password reset link is invalid or expired. Request another link from the sign-in page.</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && !complete && <p className="auth-message" role="status">{message}</p>}
    {complete ? <Link className="auth-back-link" href="/login">Return to sign in</Link> : <Link className="auth-back-link" href="/login?mode=reset">Request another reset link</Link>}
  </section>;
}
