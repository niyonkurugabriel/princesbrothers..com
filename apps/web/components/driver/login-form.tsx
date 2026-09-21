"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginDriver } from "../../app/(driver)/actions";

export function DriverLoginForm() {
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.replace("/driver");
  }, [router, state.success]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => setState(await loginDriver({}, new FormData(form))));
  }

  return <form className="driver-login-form" onSubmit={submit}>
    <label>Phone number<input name="phone" required inputMode="tel" type="tel" placeholder="(718) 555-0123" /></label>
    <label>Driver PIN<input name="pin" required inputMode="numeric" maxLength={6} minLength={4} pattern="[0-9]{4,6}" type="password" placeholder="••••" /></label>
    {state.error && <p className="driver-error" role="alert">{state.error}</p>}
    <button className="driver-primary-button" disabled={isPending} type="submit">{isPending ? "Checking…" : "Open my routes"}<span aria-hidden="true">→</span></button>
  </form>;
}