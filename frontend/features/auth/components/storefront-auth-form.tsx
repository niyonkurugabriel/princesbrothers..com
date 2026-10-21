"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/features/auth/components/password-input";

type AuthMode = "password" | "signup" | "reset";

async function postJson(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  if (!result) throw new Error(`The server returned an invalid response (${response.status}). Please try again.`);
  if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
  return result;
}

export function StorefrontAuthForm({ returnTo, initialMode = "password" }: { returnTo: string; initialMode?: "password" | "signup" }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestPasswordReset() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await postJson("/api/auth/forgot-password", { email });
      setMessage(result.message ?? "If an active account uses that email, password reset instructions will arrive shortly.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not request a password reset.");
    } finally {
      setPending(false);
    }
  }

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await postJson("/api/auth/password/login", { email, password });
      router.replace(returnTo);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign in failed.");
    } finally {
      setPending(false);
    }
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await postJson("/api/auth/password/signup", { email, firstName, lastName, phone, password, confirmPassword });
      router.replace(returnTo);
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Account creation failed.");
    } finally {
      setPending(false);
    }
  }

  function chooseMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  const headings: Record<AuthMode, string> = {
    password: "Welcome back",
    signup: "Create your account",
    reset: "Reset your password",
  };

  return <section className="auth-panel organic-glass organic-water">
    <p className="eyebrow">Princess &amp; Brothers account</p>
    <h1>{headings[mode]}</h1>
    <p className="auth-intro">Sign in to manage your account and keep your orders together.</p>
    <div className="auth-mode-tabs" role="tablist" aria-label="Sign-in methods">
      <button className={mode === "password" ? "selected" : ""} type="button" onClick={() => chooseMode("password")}>Email</button>
      <button className={mode === "signup" ? "selected" : ""} type="button" onClick={() => chooseMode("signup")}>Create account</button>
    </div>

    {mode === "password" && <form className="auth-form" onSubmit={signInWithPassword}>
      <label>Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<PasswordInput autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="button button-navy btn-3d btn-3d-green" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button>
      <button className="auth-text-button" type="button" onClick={() => chooseMode("reset")}>Forgot password?</button>
    </form>}

    {mode === "signup" && <form className="auth-form" onSubmit={createAccount}>
      <div className="auth-name-grid">
        <label>First name<input autoComplete="given-name" required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
        <label>Last name<input autoComplete="family-name" required value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
        <label className="auth-wide">Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      </div>
      <label>Phone number<input autoComplete="tel" type="tel" required placeholder="+2507…" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label>Password<PasswordInput autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label>Confirm password<PasswordInput autoComplete="new-password" minLength={8} maxLength={72} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      <button className="button button-navy btn-3d btn-3d-green" disabled={pending} type="submit">{pending ? "Creating account…" : "Create account"}</button>
    </form>}

    {mode === "reset" && <div className="auth-form">
      <p>Enter the email address on your account and we&apos;ll send a secure password reset link if it matches.</p>
      <label>Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <button className="button button-navy btn-3d btn-3d-green" type="button" disabled={pending || !email.trim()} onClick={requestPasswordReset}>{pending ? "Sending link…" : "Send reset link"}</button>
    </div>}

    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p className="auth-message" role="status">{message}</p>}
    <a className="google-auth-button" href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}><span aria-hidden="true">G</span> Continue with Google</a>
    <p className="auth-legal">By continuing, you agree to the store&apos;s terms and privacy policy.</p>
    <Link className="auth-back-link" href="/">Continue shopping</Link>
  </section>;
}
