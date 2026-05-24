import React from "react";

export const PillIcon: React.FC<{ size?: number; rotation?: number; colorA?: string; colorB?: string }> = ({
  size = 120,
  rotation = -25,
  colorA = "#FF5A4E",
  colorB = "#FFFFFF",
}) => (
  <svg width={size} height={size * 0.55} viewBox="0 0 200 110" style={{ transform: `rotate(${rotation}deg)` }}>
    <defs>
      <linearGradient id={`pa-${colorA}`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor={colorA} />
        <stop offset="1" stopColor={colorA} stopOpacity={0.8} />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="196" height="106" rx="53" fill={colorB} stroke="#0B1B2B" strokeWidth="4" />
    <path d="M 100 4 L 100 106 A 53 53 0 0 1 100 4 Z" fill={`url(#pa-${colorA})`} />
    <rect x="2" y="2" width="196" height="106" rx="53" fill="none" stroke="#0B1B2B" strokeWidth="4" />
  </svg>
);