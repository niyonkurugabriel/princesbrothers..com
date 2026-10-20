"use client";

import { Lottie } from "lottie-react";
import harvestAnimation from "./assets/harvest-leaf.json";

export function AnimatedIcon() {
  return <Lottie src={harvestAnimation} autoplay aria-hidden="true" className="harvest-animation" style={{ width: 42, height: 42 }} />;
}
