"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { consentTypeForPreferences, PRIVACY_POLICY_VERSION } from "@/features/privacy/policy";
import { PRIVACY_CONSENT_STORAGE_KEY } from "@/features/privacy/consent";

type Preferences = { necessary: true; geolocation: boolean; analytics: boolean };

const necessaryOnly: Preferences = { necessary: true, geolocation: false, analytics: false };

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(necessaryOnly);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Preferences> & { version?: string };
        if (parsed.version === PRIVACY_POLICY_VERSION && parsed.necessary === true && typeof parsed.geolocation === "boolean" && typeof parsed.analytics === "boolean") {
          setVisible(false);
          return;
        }
      }
    } catch {
      setVisible(true);
      return;
    }
    setVisible(true);
  }, []);

  async function save(next: Preferences) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/privacy/consent-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: next, consentType: consentTypeForPreferences(next) })
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Your privacy preferences could not be saved.");
      localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify({ version: PRIVACY_POLICY_VERSION, ...next }));
      setVisible(false);
      setCustomizing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Your privacy preferences could not be saved.");
    } finally {
      setPending(false);
    }
  }

  if (!visible) return null;

  return <aside className="privacy-consent-banner fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl rounded-2xl border border-white/70 bg-white/90 p-5 text-slate-800 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:p-6" aria-label="Cookie and privacy preferences">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold">Your privacy choices</h2>
        <p className="mt-1 text-sm leading-6">Necessary cookies keep the storefront working. With your permission, IP-based country detection can localize currency (RWF, KSh, UGX, USD, EUR), and analytics can help us understand site use. See our <Link className="underline" href="/privacy-policy">Privacy Policy</Link>.</p>
        {customizing && <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <label className="flex items-center gap-2"><input checked disabled type="checkbox" /> Necessary cookies (always on)</label>
          <label className="flex items-center gap-2"><input checked={preferences.geolocation} onChange={(event) => setPreferences((current) => ({ ...current, geolocation: event.target.checked }))} type="checkbox" /> IP-based country and currency localization</label>
          <label className="flex items-center gap-2"><input checked={preferences.analytics} onChange={(event) => setPreferences((current) => ({ ...current, analytics: event.target.checked }))} type="checkbox" /> Optional analytics</label>
        </div>}
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      </div>
      <div className="privacy-consent-actions flex shrink-0 flex-wrap gap-2">
        {customizing ? <>
          <button className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 text-sm font-medium disabled:opacity-60" disabled={pending} onClick={() => void save(necessaryOnly)} type="button">Necessary only</button>
          <button className="min-h-11 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={() => void save(preferences)} type="button">{pending ? "Saving…" : "Save preferences"}</button>
        </> : <>
          <button className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 text-sm font-medium" onClick={() => { setPreferences(necessaryOnly); setCustomizing(true); }} type="button">Customize Preferences</button>
          <button className="min-h-11 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={() => void save({ necessary: true, geolocation: true, analytics: true })} type="button">{pending ? "Saving…" : "Accept All"}</button>
        </>}
      </div>
    </div>
  </aside>;
}
