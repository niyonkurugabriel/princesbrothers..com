"use client";

import { useState } from "react";
import type { DriverStop } from "../../lib/driver/data";
import { ProofCapture } from "./proof-capture";

type RouteStatus = DriverStop["status"];
const labels: Record<RouteStatus, string> = { PICKED_UP: "Picked up", IN_TRANSIT: "In transit", DELIVERED: "Delivered" };

export function DriverPortal({ initialStops }: { initialStops: DriverStop[] }) {
  const [stops, setStops] = useState(initialStops);
  const [proofFor, setProofFor] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visibleStops = showAll ? stops : stops.filter((stop) => stop.status !== "DELIVERED");
  const codBalance = stops.reduce((total, stop) => total + (stop.status === "DELIVERED" ? stop.codAmount : 0), 0);

  function changeStatus(id: string, status: RouteStatus) {
    setStops((current) => current.map((stop) => stop.id === id ? { ...stop, status } : stop));
    if (status === "DELIVERED") setProofFor(id);
  }

  return <div className="driver-shell"><header className="driver-header"><div className="driver-logo"><span>P<span>&</span>B</span> Driver</div><div className="driver-header-actions"><span className="driver-online"><i /> Online</span><button className="driver-menu" type="button" aria-label="Open driver menu">•••</button></div></header><section className="driver-summary"><div><p className="driver-eyebrow">Tuesday · September 16</p><h1>Your routes, <em>today.</em></h1><p className="driver-muted">{visibleStops.length} active {visibleStops.length === 1 ? "delivery" : "deliveries"} · Brooklyn</p></div><div className="cod-balance"><span>COD collected</span><strong>${codBalance.toFixed(2)}</strong><small>Today&apos;s balance</small></div></section><div className="driver-toolbar"><span>{showAll ? "All deliveries" : "Active routes"}</span><button className="driver-filter" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Show active" : `Show completed (${stops.filter((stop) => stop.status === "DELIVERED").length})`} <span aria-hidden="true">⌄</span></button></div><section className="route-list">{visibleStops.length ? visibleStops.map((stop, index) => <RouteCard key={stop.id} stop={stop} index={index} onStatusChange={changeStatus} onProof={() => setProofFor(stop.id)} />) : <div className="driver-empty"><span>✓</span><h2>All clear.</h2><p>Every delivery is complete for today.</p></div>}</section>{proofFor && <div className="proof-backdrop"><ProofCapture onComplete={() => { setStops((current) => current.map((stop) => stop.id === proofFor ? { ...stop, status: "DELIVERED" } : stop)); setProofFor(null); }} /></div>}</div>;
}

function RouteCard({ stop, index, onStatusChange, onProof }: { stop: DriverStop; index: number; onStatusChange: (id: string, status: RouteStatus) => void; onProof: () => void }) {
  const encodedAddress = encodeURIComponent(stop.address);
  return <article className="route-card"><div className="route-card-top"><span className="route-number">0{index + 1}</span><span className="route-window">{stop.deliveryWindow}</span><span className={`route-status ${stop.status.toLowerCase()}`}>{labels[stop.status]}</span></div><div className="route-address"><span className="route-pin">⌖</span><div><h2>{stop.address}</h2><p>{stop.orderNumber} · {stop.recipient}</p></div></div><div className="route-actions"><a className="navigate-button" href={`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`} rel="noreferrer" target="_blank"><span aria-hidden="true">↗</span> Navigate</a><a className="call-button" href={`tel:${stop.phone}`} aria-label={`Call ${stop.recipient}`}>☎</a></div><div className="status-toggle" role="group" aria-label={`Update status for ${stop.orderNumber}`}>{(Object.keys(labels) as RouteStatus[]).map((status) => <button className={stop.status === status ? "selected" : ""} key={status} type="button" onClick={() => status === "DELIVERED" ? onProof() : onStatusChange(stop.id, status)}>{labels[status]}</button>)}</div>{stop.status === "DELIVERED" && <button className="proof-again" type="button" onClick={onProof}>View or update proof of delivery →</button>}</article>;
}