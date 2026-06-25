import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

// ─── Animated count-up ──────────────────────────────────────────────────────

export const useCountUp = (target: number, duration = 900): number => {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = 0;
    let start: number | null = null;

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
};

export const CountUp: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const display = useCountUp(value);
  return <span className={className}>{display.toLocaleString()}</span>;
};

// ─── Stat card ──────────────────────────────────────────────────────────────

export interface StatTone {
  bg: string;
  icon: string;
  bar: string;
}

export const TONES: Record<string, StatTone> = {
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-700',  bar: 'bg-amber-500' },
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-700',   bar: 'bg-blue-500' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-700',  bar: 'bg-green-600' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    bar: 'bg-red-500' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-700', bar: 'bg-orange-500' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-700', bar: 'bg-purple-500' },
};

export const AnimatedStatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: StatTone;
  index?: number;
  hint?: string;
}> = ({ label, value, icon: Icon, tone, index = 0, hint }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.07, ease: 'easeOut' }}
    className="relative bg-white rounded-xl border border-gray-200 p-4 overflow-hidden"
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${tone.bg} ${tone.icon}`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">
      <CountUp value={value} />
    </p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    <motion.div
      className={`absolute bottom-0 left-0 h-1 ${tone.bar}`}
      initial={{ width: 0 }}
      animate={{ width: '100%' }}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.07, ease: 'easeOut' }}
    />
  </motion.div>
);

// ─── Generic animated card (for chart panels) ───────────────────────────────

export const AnimatedCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  index?: number;
}> = ({ children, className = '', index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
    className={`bg-white rounded-xl border border-gray-200 ${className}`}
  >
    {children}
  </motion.div>
);
