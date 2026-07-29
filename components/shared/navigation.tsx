'use client';

import { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-border bg-muted p-0.5',
        className
      )}
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active ? 'bg-background text-foreground shadow-elevation-1' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, currentStep, className, onStepClick }: StepperProps) {
  return (
    <ol className={cn('flex items-center', className)}>
      {steps.map((step, i) => {
        const completed = i < currentStep;
        const active = i === currentStep;
        const isLast = i === steps.length - 1;
        return (
          <li key={i} className={cn('flex items-center', !isLast && 'flex-1')}>
            <button
              type="button"
              onClick={() => onStepClick?.(i)}
              disabled={!onStepClick}
              className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  completed && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary text-primary',
                  !completed && !active && 'border-border text-muted-foreground'
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="hidden text-left sm:block">
                <p className={cn('text-sm font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
            </button>
            {!isLast && (
              <div className={cn('mx-2 h-0.5 flex-1 rounded-full', completed ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrev?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  className?: string;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onFinish,
  prevLabel = 'Back',
  nextLabel = 'Next',
  finishLabel = 'Finish',
  className,
}: WizardNavigationProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <button
        onClick={onPrev}
        disabled={isFirst}
        className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {prevLabel}
      </button>
      <button
        onClick={isLast ? onFinish : onNext}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {isLast ? finishLabel : nextLabel}
      </button>
    </div>
  );
}

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex justify-between">
        {steps.map((label, i) => (
          <span
            key={i}
            className={cn(
              'text-xs font-medium',
              i <= currentStep ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface NavigationPillsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function NavigationPills<T extends string>({
  value,
  onChange,
  options,
  className,
}: NavigationPillsProps<T>) {
  return (
    <nav className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </nav>
  );
}
