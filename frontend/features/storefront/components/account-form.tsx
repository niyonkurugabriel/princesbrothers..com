"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateAccountDetails } from "@/app/(storefront)/account/actions";

type AccountFormValues = { email: string; firstName: string; lastName: string; phone: string | null; profileImageUrl: string | null; line1?: string; city?: string; state?: string | null; postalCode?: string; countryCode?: string };

export function AccountForm({ initialValues }: { initialValues: AccountFormValues }) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});
  const [profileImageUrl, setProfileImageUrl] = useState(initialValues.profileImageUrl ?? "");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setState(await updateAccountDetails({}, formData)));
  }

  if (!editing) return <button className="button button-navy" type="button" onClick={() => setEditing(true)}>Edit account details <span aria-hidden="true">→</span></button>;

  return <form className="account-edit-form" onSubmit={submit}>
    <div className="account-profile-picture">{profileImageUrl ? <img src={profileImageUrl} alt="Profile preview" /> : <span>{initialValues.firstName.slice(0, 1)}{initialValues.lastName.slice(0, 1)}</span>}<label>Profile photo URL<input name="profileImageUrl" type="url" maxLength={191} value={profileImageUrl} onChange={(event) => setProfileImageUrl(event.target.value)} placeholder="https://example.com/photo.jpg" /></label></div>
    <div className="account-input-grid">
      <label>First name<input name="firstName" required defaultValue={initialValues.firstName} placeholder="First name" /></label>
      <label>Last name<input name="lastName" required defaultValue={initialValues.lastName} placeholder="Last name" /></label>
    </div>
    <label>Email<input name="email" required type="email" defaultValue={initialValues.email} placeholder="you@example.com" /></label>
    <label>Phone<input name="phone" type="tel" defaultValue={initialValues.phone ?? ""} placeholder="+250 788 000 000" /></label>
    <label>New password<input name="password" minLength={8} type="password" placeholder="Leave blank to keep current password" /></label>
    <p className="account-form-heading">Saved delivery information</p>
    <label>Address<input name="line1" defaultValue={initialValues.line1 ?? ""} placeholder="Street and number" /></label>
    <div className="account-input-grid">
      <label>City<input name="city" defaultValue={initialValues.city ?? ""} placeholder="Kigali" /></label>
      <label>State or province<input name="state" defaultValue={initialValues.state ?? ""} placeholder="Optional" /></label>
    </div>
    <div className="account-input-grid">
      <label>Postal code<input name="postalCode" defaultValue={initialValues.postalCode ?? ""} placeholder="00000" /></label>
      <label>Country code<input name="countryCode" maxLength={2} defaultValue={initialValues.countryCode ?? ""} placeholder="RW" /></label>
    </div>
    {state.error && <p className="form-error" role="alert">{state.error} {state.error.includes("Sign in") && <Link href="/api/auth/google/start?returnTo=%2Faccount">Sign in with Google</Link>}</p>}
    {state.success && <p className="driver-success" role="status">Account details updated.</p>}
    <div className="account-form-actions"><button className="button button-navy" disabled={isPending} type="submit">{isPending ? "Saving…" : "Save changes"} <span aria-hidden="true">→</span></button><button className="text-link" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
  </form>;
}