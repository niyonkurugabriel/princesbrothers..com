"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDriverSettings, updateDriverDeliveryStatus } from "@/app/(driver)/actions";
import type { DriverProfile, DriverStop } from "@/features/driver/server/data";
import { ProofCapture } from "@/features/driver/components/proof-capture";
import { ThemeToggle } from "@/features/storefront/components/theme-toggle";
import { ProductImage } from "@/features/storefront/components/product-image";
import { DriverChat } from "@/features/driver/components/driver-chat";

type RouteStatus = DriverStop["status"];
type DeliveryStatus = Exclude<RouteStatus, "AWAITING_PICKUP">;
const labels: Record<RouteStatus, string> = { AWAITING_PICKUP: "Awaiting pickup", PICKED_UP: "Picked up", IN_TRANSIT: "In transit", DELIVERED: "Delivered" };
const deliveryActions: Record<DeliveryStatus, string> = { PICKED_UP: "Approve pickup", IN_TRANSIT: "Start delivery", DELIVERED: "Confirm delivery" };
const deliveryProgress: Record<RouteStatus, number> = { AWAITING_PICKUP: -1, PICKED_UP: 0, IN_TRANSIT: 1, DELIVERED: 2 };
type PayoutAccountDraft = { key: string; provider: string; accountHolder: string; accountPhone: string };

export function DriverPortal({ profile, initialStops }: { profile: DriverProfile; initialStops: DriverStop[] }) {
  const [stops, setStops] = useState(initialStops);
  const [proofFor, setProofFor] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState(profile.vehicleInfo);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);
  const [locations, setLocations] = useState(profile.locations);
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccountDraft[]>(
    profile.payoutAccounts.map((account) => ({ ...account, key: account.id })),
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [statusError, setStatusError] = useState("");
  const router = useRouter();
  const visibleStops = showAll ? stops : stops.filter((stop) => stop.status !== "DELIVERED");
  const codBalance = stops.reduce((total, stop) => total + (stop.status === "DELIVERED" ? stop.codAmount : 0), 0);

  async function changeStatus(id: string, status: DeliveryStatus, buyerOrderNumber?: string): Promise<{ ok: boolean; error?: string }> {
    setStatusError("");
    const result = await updateDriverDeliveryStatus(id, status, buyerOrderNumber);
    if (!result.ok) {
      const error = result.error ?? "Delivery status could not be saved.";
      setStatusError(error);
      return { ok: false, error };
    }
    setStops((current) => current.map((stop) => stop.id === id ? { ...stop, status } : stop));
    return { ok: true };
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    const result = await saveDriverSettings({
      vehicleInfo,
      photoUrl,
      locations,
      payoutAccounts: payoutAccounts.map(({ provider, accountHolder, accountPhone }) => ({ provider, accountHolder, accountPhone })),
    });
    setIsSaving(false);
    if (!result.ok) {
      setMessage(result.error ?? "Settings could not be saved.");
      return;
    }
    setMessage("Driver settings saved.");
    router.refresh();
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setIsUploadingPhoto(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("image", file);
      const response = await fetch("/api/driver/profile/image", { method: "POST", body: form });
      const result = await response.json() as { photoUrl?: string; error?: string };
      if (!response.ok || !result.photoUrl) throw new Error(result.error ?? "Driver photo upload failed.");
      setPhotoUrl(result.photoUrl);
      setMessage("Driver photo uploaded. Save settings to keep it on your profile.");
    } catch (error) {
      console.error("Driver photo upload failed.", error);
      setMessage(error instanceof Error ? error.message : "Driver photo upload failed.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function signOut() {
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign out failed.");
      router.replace("/driver/login");
      router.refresh();
    } catch {
      setMessage("Could not sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return <div className="driver-shell">
    <header className="driver-header">
      <div className="driver-logo"><span>P<span>&</span>B</span> Driver</div>
      <div className="driver-header-actions"><span className="driver-online"><i /> Online</span><ThemeToggle /><button className="driver-menu" type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>{settingsOpen ? "Close" : "Settings"}</button><button className="driver-menu" type="button" disabled={isSigningOut} onClick={() => void signOut()}>{isSigningOut ? "Signing out…" : "Sign out"}</button></div>
    </header>
    <section className="driver-summary">
      <ProductImage className="driver-profile-photo" src={photoUrl || "/driver-avatar.svg"} fallbackSrc="/driver-avatar.svg" alt={`${profile.name} profile`} />
      <div><p className="driver-eyebrow">Driver dashboard</p><h1>Your routes, <em>today.</em></h1><p className="driver-muted">Welcome, {profile.name}{profile.phone ? ` · ${profile.phone}` : ""} · {visibleStops.length} active {visibleStops.length === 1 ? "delivery" : "deliveries"}</p><p className="driver-muted">{profile.driveCount} completed {profile.driveCount === 1 ? "delivery" : "deliveries"} this month</p></div>
      <div className="cod-balance"><span>COD collected</span><strong>${codBalance.toFixed(2)}</strong><small>Today&apos;s balance</small></div>
    </section>
    {settingsOpen && <form className="driver-settings" onSubmit={(event) => void saveSettings(event)}>
      <h2>Driver settings</h2>
      <p className="driver-muted">Manage your service areas, vehicle, and payout accounts.</p>
      <label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploadingPhoto || isSaving} onChange={(event) => void uploadPhoto(event.target.files?.[0])} /><small>{isUploadingPhoto ? "Uploading photo…" : "JPEG, PNG, or WebP; maximum 5 MB."}</small></label>
      <label>Vehicle details<input maxLength={191} value={vehicleInfo} onChange={(event) => setVehicleInfo(event.target.value)} placeholder="e.g. Toyota Hiace · RAE 123A" /></label>
      <div className="driver-settings-section"><h3>Service locations</h3><p className="driver-muted">Add every area where dispatch can call you to collect products.</p>
        {locations.map((location, index) => <div className="driver-setting-row" key={`location-${index}`}><input required maxLength={160} aria-label={`Service location ${index + 1}`} value={location} onChange={(event) => setLocations((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><button type="button" onClick={() => setLocations((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove service location ${index + 1}`}>Remove</button></div>)}
        <button className="driver-setting-add" type="button" onClick={() => setLocations((current) => [...current, ""])}>+ Add location</button>
      </div>
      <div className="driver-settings-section"><h3>Payout accounts</h3>
        {payoutAccounts.map((account, index) => <div className="driver-payout-edit" key={account.key}>
          <div className="driver-setting-row"><label>Provider<input required maxLength={100} value={account.provider} onChange={(event) => setPayoutAccounts((current) => current.map((item) => item.key === account.key ? { ...item, provider: event.target.value } : item))} placeholder="Mobile money or bank" /></label><button type="button" onClick={() => setPayoutAccounts((current) => current.filter((item) => item.key !== account.key))} aria-label={`Remove payout account ${index + 1}`}>Remove</button></div>
          <div className="driver-setting-grid"><label>Account holder<input required maxLength={150} value={account.accountHolder} onChange={(event) => setPayoutAccounts((current) => current.map((item) => item.key === account.key ? { ...item, accountHolder: event.target.value } : item))} /></label><label>Account phone<input required type="tel" autoComplete="tel" value={account.accountPhone} onChange={(event) => setPayoutAccounts((current) => current.map((item) => item.key === account.key ? { ...item, accountPhone: event.target.value } : item))} /></label></div>
        </div>)}
        <button className="driver-setting-add" type="button" disabled={payoutAccounts.length >= 5} onClick={() => setPayoutAccounts((current) => [...current, { key: `new-${Date.now()}`, provider: "", accountHolder: "", accountPhone: "" }])}>+ Add payout account</button>
      </div>
      {message && <p className={message.includes("saved") ? "driver-success" : "driver-error"} role="status">{message}</p>}
      <button className="driver-primary-button" disabled={isSaving} type="submit">{isSaving ? "Saving settings…" : "Save settings"}<span aria-hidden="true">→</span></button>
    </form>}
    <div className="driver-toolbar"><span>{showAll ? "All deliveries" : "Active routes"}</span><button className="driver-filter" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Show active" : `Show completed (${stops.filter((stop) => stop.status === "DELIVERED").length})`} <span aria-hidden="true">⌄</span></button></div>
    {statusError && <p className="driver-error driver-status-error" role="alert">{statusError}</p>}
    <section className="route-list">{visibleStops.length ? visibleStops.map((stop, index) => <RouteCard key={stop.id} stop={stop} index={index} onStatusChange={(id, status) => void changeStatus(id, status)} onProof={() => setProofFor(stop.id)} />) : <div className="driver-empty"><span>✓</span><h2>All clear.</h2><p>Every delivery is complete for today.</p></div>}</section>
    {proofFor && <div className="proof-backdrop"><ProofCapture onCancel={() => setProofFor(null)} onComplete={(buyerOrderNumber) => changeStatus(proofFor, "DELIVERED", buyerOrderNumber)} /></div>}
  </div>;
}

function RouteCard({ stop, index, onStatusChange, onProof }: { stop: DriverStop; index: number; onStatusChange: (id: string, status: DeliveryStatus) => void; onProof: () => void }) {
  const encodedAddress = encodeURIComponent(stop.address);
  return <article className="route-card">
    <div className="route-card-top"><span className="route-number">0{index + 1}</span><span className="route-window">{stop.deliveryWindow}</span><span className={`route-status ${stop.status.toLowerCase()}`}>{labels[stop.status]}</span></div>
    <div className="route-address"><span className="route-pin">⌖</span><div><h2>{stop.address}</h2><p>{stop.orderNumber} · {stop.recipient}</p></div></div>
    <div className="route-actions"><a className="navigate-button" href={`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`} rel="noreferrer" target="_blank"><span aria-hidden="true">↗</span> Navigate</a><a className="call-button" href={`tel:${stop.phone}`} aria-label={`Call ${stop.recipient}`}>☎</a></div>
    <div className="status-toggle" role="group" aria-label={`Update status for ${stop.orderNumber}`}>
      {(Object.keys(deliveryActions) as DeliveryStatus[]).map((status) => {
        const isNextStep = deliveryProgress[status] === deliveryProgress[stop.status] + 1;
        return <button className={stop.status === status ? "selected" : ""} disabled={!isNextStep} key={status} type="button" onClick={() => status === "DELIVERED" ? onProof() : onStatusChange(stop.id, status)}>{deliveryActions[status]}</button>;
      })}
    </div>
    {stop.status === "DELIVERED" && <button className="proof-again" type="button" onClick={onProof}>View delivery details →</button>}
    <DriverChat audience="driver" orderNumber={stop.orderNumber} isOrderDelivered={stop.status === "DELIVERED"} />
  </article>;
}