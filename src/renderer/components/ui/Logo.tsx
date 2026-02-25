import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export function Logo({ size = 'md', showText = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="512" height="512" rx="96" fill="url(#bgGradient)" />

        {/* Stylized B with stacked receipt/bar chart effect */}
        <g fill="white">
          {/* Main B shape */}
          <path d="M160 96h120c44.183 0 80 35.817 80 80 0 26.5-12.9 50-32.7 64.7C355.6 254.8 376 290.4 376 330c0 47.5-38.5 86-86 86H160V96zm60 60v80h60c22.091 0 40-17.909 40-40s-17.909-40-40-40h-60zm0 140v66h70c18.225 0 33-14.775 33-33s-14.775-33-33-33h-70z" />
        </g>

        {/* Accent bar (rising chart effect) */}
        <rect x="376" y="280" width="40" height="136" rx="8" fill="#F59E0B" />
        <rect x="316" y="320" width="40" height="96" rx="8" fill="#F59E0B" opacity="0.7" />
      </svg>

      {showText && (
        <span className={`font-bold text-gray-900 dark:text-white ${textSizes[size]}`}>
          Bigtal
        </span>
      )}
    </div>
  );
}

// Compact icon-only version for favicons and small spaces
export function LogoIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bgGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="url(#bgGradientIcon)" />
      <g fill="white">
        <path d="M160 96h120c44.183 0 80 35.817 80 80 0 26.5-12.9 50-32.7 64.7C355.6 254.8 376 290.4 376 330c0 47.5-38.5 86-86 86H160V96zm60 60v80h60c22.091 0 40-17.909 40-40s-17.909-40-40-40h-60zm0 140v66h70c18.225 0 33-14.775 33-33s-14.775-33-33-33h-70z" />
      </g>
      <rect x="376" y="280" width="40" height="136" rx="8" fill="#F59E0B" />
      <rect x="316" y="320" width="40" height="96" rx="8" fill="#F59E0B" opacity="0.7" />
    </svg>
  );
}
