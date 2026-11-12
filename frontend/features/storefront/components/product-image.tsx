"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const fallbackImage = "/products/fruits.jpg";

export function ProductImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <Image
    className={className}
    src={failed ? fallbackImage : src}
    alt={alt}
    width={1200}
    height={1000}
    unoptimized
    onError={() => setFailed(true)}
  />;
}
