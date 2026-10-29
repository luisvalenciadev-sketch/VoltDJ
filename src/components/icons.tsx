import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const WhatsAppIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1Z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2Z" fill="currentColor" stroke="none" />
  </svg>
);
export const CartIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M3 4h2.5l2.2 11h10.6L20.5 8H7" />
    <circle cx="9" cy="19.5" r="1.4" />
    <circle cx="17" cy="19.5" r="1.4" />
  </svg>
);
export const SearchIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);
export const TruckIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.6} {...p}>
    <path d="M2 6h12v10H2zM14 9h4l3 3v4h-7z" />
    <circle cx="6" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
);
export const ShieldIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.6} {...p}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
);
export const ChatIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.6} {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </svg>
);
export const FilterIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);
export const InfoIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </svg>
);
export const WarnIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3 2 20h20z" />
    <path d="M12 10v4.5M12 17v.5" />
  </svg>
);
export const OkIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </svg>
);

/** Símbolo de marca: fader de mezclador visto desde arriba. */
export const LogoMark = (p: P) => (
  <svg viewBox="0 0 28 28" aria-hidden="true" {...p}>
    <rect x="1" y="1" width="26" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="12.5" y="5" width="3" height="18" rx="1.5" fill="var(--border)" />
    <rect x="8" y="9" width="12" height="5" rx="1" fill="var(--accent)" />
  </svg>
);
