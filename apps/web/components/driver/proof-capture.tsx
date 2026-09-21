"use client";

import { useEffect, useRef, useState } from "react";

export function ProofCapture({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.strokeStyle = "#0F172A";
    context.lineWidth = 2;
    context.lineCap = "round";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext("2d");
    const position = point(event);
    if (!context || !position) return;
    canvasRef.current?.setPointerCapture(event.pointerId);
    context.beginPath(); context.moveTo(position.x, position.y); setDrawing(true); setHasSignature(true);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const context = canvasRef.current?.getContext("2d");
    const position = point(event);
    if (!context || !position) return;
    context.lineTo(position.x, position.y); context.stroke();
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  return <div className="proof-capture"><div className="proof-capture-heading"><div><p className="driver-eyebrow">Final step</p><h3>Capture delivery proof</h3></div><button className="driver-close" type="button" onClick={onComplete} aria-label="Close proof capture">×</button></div><label className="photo-upload"><span className="capture-icon">⌾</span><b>{hasPhoto ? "Delivery photo added ✓" : "Take a delivery photo"}</b><small>Use your camera or choose a photo</small><input accept="image/*" capture="environment" onChange={(event) => setHasPhoto(Boolean(event.target.files?.length))} type="file" /></label><div className="signature-heading"><b>Recipient signature</b><button className="clear-signature" type="button" onClick={clear}>Clear</button></div><div className="signature-box"><canvas ref={canvasRef} height="180" width="600" onPointerDown={start} onPointerMove={move} onPointerUp={() => setDrawing(false)} onPointerLeave={() => setDrawing(false)} /><span>Sign here</span></div><button className="driver-primary-button" disabled={!hasSignature || !hasPhoto} type="button" onClick={onComplete}>Complete delivery <span aria-hidden="true">✓</span></button></div>;
}