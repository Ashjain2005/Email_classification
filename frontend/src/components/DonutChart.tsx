import React, { useEffect, useState } from 'react';

interface DonutChartProps {
  spamCount: number;
  hamCount: number;
  size?: number;
  strokeWidth?: number;
  isDark?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  spamCount,
  hamCount,
  size = 160,
  strokeWidth = 18,
  isDark = true
}) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const total = spamCount + hamCount;
  const spamPct = total > 0 ? spamCount / total : 0;
  const hamPct = total > 0 ? hamCount / total : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Ham arc: starts at top (12 o'clock = -90deg)
  const hamDash = mounted ? hamPct * circumference : 0;
  const hamGap = circumference - hamDash;

  // Spam arc starts after ham
  const spamDash = mounted ? spamPct * circumference : 0;
  const spamGap = circumference - spamDash;

  const hamRotation = -90;
  const spamRotation = -90 + hamPct * 360;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="donut-chart-svg"
        style={{ filter: isDark ? 'drop-shadow(0 0 16px rgba(6,182,212,0.15))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.06))' }}
      >
        <defs>
          <linearGradient id="cyberHamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5a0" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="cyberSpamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff3366" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>

        {/* Outer Tech Ring */}
        <circle
          cx={center}
          cy={center}
          r={radius + 8}
          fill="none"
          stroke={isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(203, 213, 225, 0.4)'}
          strokeWidth="1"
          strokeDasharray="4 6"
        />

        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isDark ? '#0f172a' : '#f1f5f9'}
          strokeWidth={strokeWidth}
        />

        {/* Ham Arc (Cyber Emerald) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#cyberHamGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${hamDash} ${hamGap}`}
          strokeDashoffset={0}
          transform={`rotate(${hamRotation}, ${center}, ${center})`}
          style={{
            transition: 'stroke-dasharray 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))'
          }}
        />

        {/* Spam Arc (Cyber Rose/Crimson) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#cyberSpamGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${spamDash} ${spamGap}`}
          strokeDashoffset={0}
          transform={`rotate(${spamRotation}, ${center}, ${center})`}
          style={{
            transition: 'stroke-dasharray 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            filter: 'drop-shadow(0 0 6px rgba(244, 63, 94, 0.5))'
          }}
        />
      </svg>

      {/* Center Label */}
      <div className="absolute flex flex-col items-center pointer-events-none">
        <span className={`text-2xl font-black font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {total > 0 ? `${Math.round(spamPct * 100)}%` : '—'}
        </span>
        <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Spam Ratio
        </span>
      </div>
    </div>
  );
};
