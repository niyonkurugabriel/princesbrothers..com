"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function postJson(url: string, body: Record<string, string>) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
}

export function ContributorLoginForm() {
  const router = useRouter();
  const [reset, setReset] = useState(false);
  const [resetMethod, setResetMethod] = useState<"email" | "phone">("email");
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await postJson("/api/auth/contributor/login", { email, password });
      router.replace("/partner/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign in failed.");
    } finally {
      setPending(false);
    }
  }

  async function recoverPassword() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (resetMethod === "email") {
        await postJson("/api/auth/forgot-password", { email });
        setMessage("If an active account uses that email, password reset instructions will arrive shortly.");
      } else {
        await postJson("/api/auth/phone/request", { phone, purpose: "password-reset" });
        setCodeSent(true);
        setMessage("A recovery code was sent to your phone.");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send a recovery code.");
    } finally {
      setPending(false);
    }
  }

  async function resetPassword() {
    setPending(true);
    setError("");
    try {
      await postJson("/api/auth/phone/verify", { phone, code, purpose: "password-reset", password });
      setReset(false);
      setCodeSent(false);
      setCode("");
      setPassword("");
      setMessage("Password updated. Sign in with your new password.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Password recovery failed.");
    } finally {
      setPending(false);
    }
  }

  return <section className="auth-panel organic-glass organic-water">
    <p className="eyebrow">Contributor portal</p>
    <h2>{reset ? "Recover your password" : "Already a contributor?"}</h2>
    {!reset ? <form className="auth-form" onSubmit={signIn}>
      <label>Business email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="button button-navy" disabled={pending} type="submit">{pending ? "Signing in..." : "Sign in"}</button>
      <button className="auth-text-button" type="button" onClick={() => { setReset(true); setError(""); setMessage(""); }}>Forgot password?</button>
    </form> : <div className="auth-form">
      <div className="auth-mode-tabs recovery-method-tabs" role="group" aria-label="Password recovery method">
        <button className={resetMethod === "email" ? "selected" : ""} type="button" onClick={() => { setResetMethod("email"); setCodeSent(false); setError(""); setMessage(""); }}>Email</button>
        <button className={resetMethod === "phone" ? "selected" : ""} type="button" onClick={() => { setResetMethod("phone"); setCodeSent(false); setError(""); setMessage(""); }}>Phone</button>
      </div>
      {resetMethod === "email" ? <>
        <p>Enter the email address on your account and we&apos;ll send a secure reset link if it matches.</p>
        <label>Business email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button className="button button-navy" disabled={pending || !email.trim()} type="button" onClick={recoverPassword}>{pending ? "Sending link..." : "Send reset link"}</button>
      </> : <>
        <label>Phone number<input autoComplete="tel" required type="tel" placeholder="+2507..." value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        {!codeSent ? <button className="button button-navy" disabled={pending || !phone.trim()} type="button" onClick={recoverPassword}>{pending ? "Sending code..." : "Send recovery code"}</button> : <>
          <label>6-digit code<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label>
          <label>New password<input autoComplete="new-password" minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="button button-navy" disabled={pending || code.length !== 6} type="button" onClick={resetPassword}>{pending ? "Updating..." : "Verify and reset password"}</button>
        </>}
      </>}
      <button className="auth-text-button" type="button" onClick={() => { setReset(false); setCodeSent(false); setError(""); setMessage(""); }}>Back to sign in</button>
    </div>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p className="auth-message" role="status">{message}</p>}
  </section>;
}