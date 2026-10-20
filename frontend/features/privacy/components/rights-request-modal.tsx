"use client";

import { useState } from "react";

type Role = "CUSTOMER" | "CONTRIBUTOR" | "DRIVER" | "GUEST";
type RequestType = "ACCESS" | "RECTIFICATION" | "ERASURE" | "CONSENT_WITHDRAWAL";

async function postJson(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  if (!result) throw new Error(`The server returned an invalid response (${response.status}).`);
  if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
  return result;
}

export function RightsRequestModal({ onClose }: { onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState<Role>("CUSTOMER");
  const [requestType, setRequestType] = useState<RequestType>("ACCESS");
  const [verificationCode, setVerificationCode] = useState("");
  const [reason, setReason] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function sendCode() {
    setError("");
    setPending(true);
    try {
      const result = await postJson("/api/v1/privacy/verification-code", { contact });
      setCodeSent(true);
      setSuccess(result.message ?? "A verification code has been sent to your contact.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send a verification code.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const result = await postJson("/api/v1/privacy/rights-request", {
        fullName,
        contact,
        role,
        requestType,
        verificationCode,
        reason
      });
      setSuccess(result.message ?? "Your request has been securely submitted.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your request could not be submitted.");
    } finally {
      setPending(false);
    }
  }

  return <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section aria-labelledby="rights-title" aria-modal="true" className="my-auto max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-800 shadow-2xl sm:p-8" role="dialog">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Data protection</p><h2 className="mt-1 text-2xl font-bold" id="rights-title">Exercise your data rights</h2></div>
        <button aria-label="Close form" className="rounded-md px-3 py-1 text-2xl leading-none hover:bg-slate-100" onClick={onClose} type="button">×</button>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">We use a one-time code to verify your contact before recording a request. Do not include passwords or payment-card details.</p>
      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium">Full name<input autoComplete="name" className="rounded-lg border border-slate-300 px-3 py-2" maxLength={255} onChange={(event) => setFullName(event.target.value)} required value={fullName} /></label>
        <label className="grid gap-1 text-sm font-medium">Email address or phone number<input autoComplete="email" className="rounded-lg border border-slate-300 px-3 py-2" maxLength={255} onChange={(event) => { setContact(event.target.value); setCodeSent(false); setVerificationCode(""); }} placeholder="name@example.com or +250..." required value={contact} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">Portal role<select className="rounded-lg border border-slate-300 px-3 py-2" onChange={(event) => setRole(event.target.value as Role)} value={role}><option value="CUSTOMER">Customer</option><option value="CONTRIBUTOR">Contributor</option><option value="DRIVER">Driver</option><option value="GUEST">Guest</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Request type<select className="rounded-lg border border-slate-300 px-3 py-2" onChange={(event) => setRequestType(event.target.value as RequestType)} value={requestType}><option value="ACCESS">Data Access (SAR)</option><option value="RECTIFICATION">Rectification</option><option value="ERASURE">Account Deletion / Erasure</option><option value="CONSENT_WITHDRAWAL">Opt-Out / Consent Withdrawal</option></select></label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="grid flex-1 gap-1 text-sm font-medium">Verification code<input autoComplete="one-time-code" className="rounded-lg border border-slate-300 px-3 py-2" inputMode="numeric" maxLength={6} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} pattern="[0-9]{6}" required value={verificationCode} /></label>
          <button className="self-end rounded-lg border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-60" disabled={pending || !contact.trim()} onClick={() => void sendCode()} type="button">{pending ? "Please wait…" : codeSent ? "Send another code" : "Send verification code"}</button>
        </div>
        <label className="grid gap-1 text-sm font-medium">Reason or request details (optional)<textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2" maxLength={3000} onChange={(event) => setReason(event.target.value)} value={reason} /></label>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        {success && <p className="text-sm text-emerald-800" role="status">{success}</p>}
        {success.startsWith("Your request has been") ? <button className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white" onClick={onClose} type="button">Done</button> : <button className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={pending || verificationCode.length !== 6 || !codeSent} type="submit">{pending ? "Submitting…" : "Submit request"}</button>}
      </form>
    </section>
  </div>;
}
