/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AKLogoProps {
  className?: string;
  size?: number;
}

export const AKLogo: React.FC<AKLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Rounded Shield / Tile */}
      <rect width="48" height="48" rx="10" fill="url(#akGradient)" />

      {/* 3 Stumps (Wickets) */}
      {/* Left Stump */}
      <rect x="15" y="16" width="2.5" height="24" rx="1.25" fill="#fde68a" />
      {/* Middle Stump */}
      <rect x="21" y="16" width="2.5" height="24" rx="1.25" fill="#fde68a" />
      {/* Right Stump */}
      <rect x="27" y="16" width="2.5" height="24" rx="1.25" fill="#fde68a" />

      {/* 2 Bails across the 3 stumps */}
      <rect x="14" y="14" width="7.5" height="1.8" rx="0.9" fill="#fef08a" />
      <rect x="23" y="14" width="7.5" height="1.8" rx="0.9" fill="#fef08a" />

      {/* Cricket Bat (Crossed diagonally over stumps) */}
      <g transform="rotate(38 25 24)">
        {/* Bat Handle (wrapped cane grip) */}
        <rect x="23.5" y="4" width="2" height="11" rx="1" fill="#e2e8f0" />
        <line x1="23.5" y1="7" x2="25.5" y2="7" stroke="#0f172a" strokeWidth="0.6" />
        <line x1="23.5" y1="10" x2="25.5" y2="10" stroke="#0f172a" strokeWidth="0.6" />
        <line x1="23.5" y1="13" x2="25.5" y2="13" stroke="#0f172a" strokeWidth="0.6" />

        {/* Bat Handle Cone / Shoulder */}
        <path d="M23 15 L26 15 L27 18 L22 18 Z" fill="#d97706" />

        {/* Bat Blade (English Willow) */}
        <rect x="21.5" y="18" width="6" height="24" rx="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
        {/* Bat Spine Curve */}
        <line x1="24.5" y1="20" x2="24.5" y2="39" stroke="#b45309" strokeWidth="0.8" strokeLinecap="round" />
        {/* Colored Grip Toe Guard */}
        <rect x="22" y="39.5" width="5" height="2" rx="0.8" fill="#10b981" />
      </g>

      {/* Cricket Ball (Red/Crimson sphere with prominent stitched white seam) */}
      <g>
        <circle cx="36" cy="33" r="6" fill="url(#ballGradient)" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.5))" />
        {/* Ball Seam stitches */}
        <path
          d="M32 35 C34 33, 38 33, 40 31"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeDasharray="1.2 1"
          strokeLinecap="round"
        />
        {/* Ball Highlight */}
        <ellipse cx="34.5" cy="30.5" rx="1.5" ry="0.9" fill="#ffffff" opacity="0.6" transform="rotate(-30 34.5 30.5)" />
      </g>

      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="akGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" />
          <stop offset="0.6" stopColor="#1e293b" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <radialGradient id="ballGradient" cx="34" cy="31" r="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f87171" />
          <stop offset="0.7" stopColor="#dc2626" />
          <stop offset="1" stopColor="#7f1d1d" />
        </radialGradient>
      </defs>
    </svg>
  );
};
