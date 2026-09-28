'use client';
import { motion, useReducedMotion } from 'motion/react';

export function TrialProgress({ value, daysRemaining, totalDays, warning }: { value: number; daysRemaining: number; totalDays: number; warning?: boolean }) {
  const reduceMotion = useReducedMotion();
  const label = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining in your ${totalDays}-day trial.`;
  return (
    <div className="space-y-2">
      <div role="progressbar" aria-label="Trial progress" aria-valuetext={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div className={warning ? 'h-full origin-left bg-warning' : 'h-full origin-left bg-primary'} initial={reduceMotion ? false : { scaleX: 0 }} animate={{ scaleX: value / 100 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
