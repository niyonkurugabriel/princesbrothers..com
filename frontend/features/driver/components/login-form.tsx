"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginDriver } from "@/app/(driver)/actions";
import { PasswordInput } from "@/features/auth/components/password-input";

type DriverAuthMode = "login" | "signup" | "reset";

async function postJson(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
}

export function DriverLoginForm() {
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});
  const [mode, setMode] = useState<DriverAuthMode>("login");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [location, setLocation] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isWorking, setIsWorking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.replace("/driver");
  }, [router, state.success]);

  function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => setState(await loginDriver({}, new FormData(form))));
  }

  async function requestCode() {
    setIsWorking(true);
    setState({});
    setMessage("");
    try {
      await postJson("/api/auth/driver/request", { phone, purpose: "password-reset" });
      setCodeSent(true);
      setMessage("A six-digit code was sent by SMS.");
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : "Could not send the SMS code." });
    } finally {
      setIsWorking(false);
    }
  }

  async function verifyCode() {
    setIsWorking(true);
    setState({});
    setMessage("");
    try {
      await postJson("/api/auth/driver/verify", { phone, code, pin, confirmPin, purpose: "password-reset" });
      setMode("login");
      setCodeSent(false);
      setCode("");
      setPin("");
      setConfirmPin("");
      setMessage("PIN updated. Sign in with your new PIN.");
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : "The driver account could not be updated." });
    } finally {
      setIsWorking(false);
    }
  }

  async function createDriverAccount() {
    setIsWorking(true);
    setState({});
    setMessage("");
    try {
      await postJson("/api/auth/driver/signup", { phone, pin, confirmPin, location });
      setMode("login");
      setPhone("");
      setPin("");
      setConfirmPin("");
      setLocation("");
      setMessage("Driver account created. Sign in with your phone and PIN.");
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : "The driver account could not be created." });
    } finally {
      setIsWorking(false);
    }
  }

  function changeMode(nextMode: DriverAuthMode) {
    setMode(nextMode);
    setCodeSent(false);
    setCode("");
    setPin("");
    setConfirmPin("");
    setState({});
    setMessage("");
  }

  return <section className="driver-login-panel">
    <div className="driver-login-heading"><p className="driver-eyebrow">{mode === "signup" ? "New driver" : mode === "reset" ? "Account recovery" : "Driver portal"}</p><h1>{mode === "signup" ? "Create your driver account" : mode === "reset" ? "Recover your PIN" : "Good to see you."}</h1><p>{mode === "login" ? "Sign in to see your routes and deliveries." : mode === "signup" ? "Enter your phone number and choose a PIN." : "Enter your phone number to receive a recovery code."}</p></div>
    {mode === "login" ? <form className="driver-login-form" onSubmit={submitLogin}>
      <label>Phone number<input name="phone" required autoComplete="tel" inputMode="tel" type="tel" placeholder="+2507..." /></label>
      <label>5-digit PIN<PasswordInput name="pin" required inputMode="numeric" maxLength={5} minLength={5} pattern="[0-9]{5}" placeholder="•••••" /></label>
      {state.error && <p className="driver-error" role="alert">{state.error}</p>}
      {message && <p className="driver-success" role="status">{message}</p>}
      <button className="driver-primary-button" disabled={isPending} type="submit">{isPending ? "Checking…" : "Open my routes"}<span aria-hidden="true">→</span></button>
      <div className="driver-auth-actions"><button type="button" onClick={() => changeMode("signup")}>Create account</button><button type="button" onClick={() => changeMode("reset")}>Forgot PIN?</button></div>
    </form> : <div className="driver-login-form">
      <label>Phone number<input autoComplete="tel" inputMode="tel" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+2507..." /></label>
      {mode === "signup" ? <>
        <label>Choose a 5-digit PIN<PasswordInput autoComplete="new-password" inputMode="numeric" maxLength={5} minLength={5} pattern="[0-9]{5}" required value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} /></label>
        <label>Confirm 5-digit PIN<PasswordInput autoComplete="new-password" inputMode="numeric" maxLength={5} minLength={5} pattern="[0-9]{5}" required value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} /></label>
        <label>Your service location<input autoComplete="address-level2" required maxLength={160} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Kigali" /></label>
        <button className="driver-primary-button" disabled={isWorking || pin.length !== 5 || pin !== confirmPin || !location.trim()} type="button" onClick={createDriverAccount}>{isWorking ? "Creating account…" : "Create driver account"}</button>
      </> : !codeSent ? <button className="driver-primary-button" disabled={isWorking} type="button" onClick={requestCode}>{isWorking ? "Sending SMS…" : "Send recovery code"}</button> : <>
        <label>6-digit SMS code<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></label>
        <label>New 5-digit PIN<PasswordInput autoComplete="new-password" inputMode="numeric" maxLength={5} minLength={5} pattern="[0-9]{5}" required value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} /></label>
        <label>Confirm new PIN<PasswordInput autoComplete="new-password" inputMode="numeric" maxLength={5} minLength={5} pattern="[0-9]{5}" required value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} /></label>
        <button className="driver-primary-button" disabled={isWorking || code.length !== 6 || pin.length !== 5 || pin !== confirmPin} type="button" onClick={verifyCode}>{isWorking ? "Verifying…" : "Verify and update PIN"}</button>
      </>}
      {state.error && <p className="driver-error" role="alert">{state.error}</p>}
      {message && <p className="driver-success" role="status">{message}</p>}
      <button className="driver-auth-back" type="button" onClick={() => changeMode("login")}>Back to sign in</button>
    </div>}
  </section>;
}