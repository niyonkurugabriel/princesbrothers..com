"use client";

import { useState } from "react";

const harvestImages = [
  { src: "/products/red apple1.jpg", label: "red apple" },
  { src: "/products/pavuloo%202.jpg", label: "ball pepper" },
  { src: "/products/ibinyomoro2.jpg", label: "ibinyomoro" },
  { src: "/products/fruits.jpg", label: "fruits" },
  { src: "/products/fruit.jpg", label: "fruits" }
];

export function ProduceGallery() {
  const [active, setActive] = useState(0);

  function trackPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const progress = Math.max(0, Math.min(0.999, (event.clientX - bounds.left) / bounds.width));
    setActive(Math.floor(progress * harvestImages.length));
  }

  return <div
    className="hero-art produce-gallery"
    role="img"
    aria-label={`${harvestImages[active].label} from Princess & Brothers contributors`}
    style={{ backgroundImage: `linear-gradient(100deg,rgba(15,23,42,.1),rgba(15,23,42,.05)),url("${harvestImages[active].src}")` }}
    onPointerMove={trackPointer}
  >
    <div className="produce-gallery-controls" role="group" aria-label="Choose a produce image">
      {harvestImages.map((image, index) => <button
        aria-label={image.label}
        aria-pressed={active === index}
        className={active === index ? "selected" : ""}
        key={image.src}
        onClick={() => setActive(index)}
        onPointerEnter={() => setActive(index)}
        type="button"
      />)}
    </div>
  </div>;
}
