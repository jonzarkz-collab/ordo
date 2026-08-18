// Ordo icon set — hand-tuned stroke icons (Lucide-style, 1.8px, round caps).
// House rule: never emoji as icons. Everything inherits currentColor.
import React from "react";

const I = ({ children, size = 18, viewBox = "0 0 24 24", ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const CameraIcon = (p) => (
  <I {...p}>
    <path d="M4 7h2.2l1.2-1.8A1.5 1.5 0 0 1 8.65 4.5h6.7a1.5 1.5 0 0 1 1.25.7L17.8 7H20a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V8.5A1.5 1.5 0 0 1 4 7Z" />
    <circle cx="12" cy="13" r="3.4" />
  </I>
);

export const ClipboardIcon = (p) => (
  <I {...p}>
    <rect x="5" y="4.5" width="14" height="16" rx="2" />
    <path d="M9 4.5a3 3 0 0 1 6 0" />
    <path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4.5" />
  </I>
);

export const SparkIcon = (p) => (
  <I {...p}>
    <path d="M12 3.5c.55 3.9 2.6 5.95 6.5 6.5-3.9.55-5.95 2.6-6.5 6.5-.55-3.9-2.6-5.95-6.5-6.5 3.9-.55 5.95-2.6 6.5-6.5Z" />
    <path d="M18.8 15.5c.26 1.84 1.16 2.74 3 3-1.84.26-2.74 1.16-3 3-.26-1.84-1.16-2.74-3-3 1.84-.26 2.74-1.16 3-3Z" />
  </I>
);

export const LeafIcon = (p) => (
  <I {...p}>
    <path d="M5.5 18.5C4 12 8 5.5 19.5 4.5c.5 12-5 16.5-11.5 15" />
    <path d="M5.5 18.5C7.5 13.5 10.5 10 15.5 8" />
  </I>
);

export const FlameIcon = (p) => (
  <I {...p}>
    <path d="M12 20.5a6 6 0 0 0 6-6c0-2.5-1.4-4.6-2.8-6.2-.7-.8-2-.3-2.1.75-.05.6-.2 1.2-.55 1.65C11.6 9 12.5 5.5 10 3.5c-.3 2.5-1.6 3.9-2.8 5.4A7.6 7.6 0 0 0 6 14.5a6 6 0 0 0 6 6Z" />
  </I>
);

export const LayersIcon = (p) => (
  <I {...p}>
    <path d="m12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5Z" />
    <path d="m4.5 12.5 7.5 4 7.5-4" />
    <path d="m6 16 6 3.2 6-3.2" />
  </I>
);

export const TagIcon = (p) => (
  <I {...p}>
    <path d="M4 4h6.6a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8l-4.6 4.6a2 2 0 0 1-2.8 0L4.6 12A2 2 0 0 1 4 10.6V4Z" />
    <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
  </I>
);

export const CheckIcon = (p) => (
  <I {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </I>
);

export const AlertIcon = (p) => (
  <I {...p}>
    <path d="M12 4 2.8 19.5h18.4L12 4Z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="16.9" r=".4" fill="currentColor" stroke="none" />
  </I>
);

export const ReceiptIcon = (p) => (
  <I {...p}>
    <path d="M6 3.5h12V20l-2.4-1.5L13.2 20l-2.4-1.5L8.4 20 6 18.5V3.5Z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </I>
);

export const BoltIcon = (p) => (
  <I {...p}>
    <path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5L13 3Z" />
  </I>
);

export const ChevronIcon = (p) => (
  <I {...p}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
  </I>
);

// Rank medal — thin metallic ring with the rank number.
const MEDAL_COLORS = ["#E3C55C", "#C4CDD3", "#C98F5F"];
export function Medal({ rank }) {
  const c = MEDAL_COLORS[rank - 1] || "#5c7270";
  return (
    <span className="medal2" style={{ borderColor: c, color: c }}>
      {rank}
    </span>
  );
}

// Tier dot — replaces the colored emoji circles from v1.
export function TierDot({ color }) {
  return <span className="tier-dot" style={{ background: color }} />;
}
