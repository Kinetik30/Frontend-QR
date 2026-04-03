import React from 'react';

const QvovLogoDark = ({ width = 400, className = "" }) => (
  <svg 
    viewBox="0 0 400 120" 
    width={width} 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Icon Section */}
    <g transform="translate(10, 10)">
      {/* Connector Lines */}
      <rect x="18" y="15" width="44" height="6" fill="#F5F5F5" />
      <rect x="15" y="18" width="6" height="44" fill="#F5F5F5" />
      <rect x="59" y="18" width="6" height="44" fill="#F5F5F5" />
      
      {/* Squares */}
      <rect x="0" y="0" width="36" height="36" rx="6" fill="#F5F5F5" />
      <rect x="44" y="0" width="36" height="36" rx="6" fill="#F5F5F5" />
      <rect x="0" y="44" width="36" height="36" rx="6" fill="#F5F5F5" />
      
      {/* Blue Intelligence Square */}
      <rect x="44" y="44" width="36" height="36" rx="6" fill="#3B82F6" />
      <path d="M52 52h8v4h-8v-4zm12 0h8v8h-8v-8zm-12 12h8v8h-8v-8zm12 4h8v4h-8v-4z" fill="white" fillOpacity="0.8"/>
    </g>

    {/* Text Section */}
    <text x="110" y="55" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="48" fill="#F5F5F5">Qvoy</text>
    <text x="110" y="85" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="16" letterSpacing="4" fill="#3B82F6">QR INTELLIGENCE</text>
  </svg>
);

export default QvovLogoDark;
