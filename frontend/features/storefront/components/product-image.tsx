"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const productFallbackImage = "/products/fruits.jpg";

export function ProductImage({ src, alt, className, fallbackSrc = productFallbackImage }: { src: string; alt: string; className: string; fallbackSrc?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <Image
    className={className}
    src={failed ? fallbackSrc : src}
    alt={alt}
    width={1200}
    height={1000}
    unoptimized
    onError={() => setFailed(true)}
  />;
}
