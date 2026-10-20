import type { SVGProps } from "react";

const iconProps: SVGProps<SVGSVGElement> = {
  "aria-hidden": true,
  focusable: false,
  className: "portal-link-icon",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.7,
  viewBox: "0 0 24 24",
};

export function ContributorIcon() {
  return <svg {...iconProps}><path d="M20.5 3.5C12 3.5 5.6 5.2 4.1 10.4c-1 3.5 1.4 6.1 4.7 5.4 5.2-1.1 8.6-7.1 11.7-12.3Z" /><path d="M3.5 21c2.4-5.2 5.8-8.6 10.2-11.4" /></svg>;
}

export function DriverIcon() {
  return <svg {...iconProps}><path d="M3 6.5h11v11H3zM14 10h4l3 3.3v4.2h-7z" /><path d="M17 10v3h4M7 17.5a1.8 1.8 0 1 0 0 .1M18 17.5a1.8 1.8 0 1 0 0 .1" /></svg>;
}
