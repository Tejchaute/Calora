import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FieldWrapperProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  description,
  error,
  required,
  htmlFor,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <FieldLabel htmlFor={htmlFor} required={required}>
          {label}
        </FieldLabel>
      )}
      {children}
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

interface FieldLabelProps {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldLabel({ htmlFor, required, children }: FieldLabelProps) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required && <RequiredIndicator />}
    </Label>
  );
}

export function FieldDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-destructive" role="alert">
      {children}
    </p>
  );
}

export function RequiredIndicator() {
  return (
    <span className="ml-0.5 text-destructive" aria-label="required">
      *
    </span>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      {title && (
        <legend className="text-sm font-semibold text-foreground">
          {title}
          {description && (
            <span className="block text-sm font-normal text-muted-foreground">
              {description}
            </span>
          )}
        </legend>
      )}
      {children}
    </fieldset>
  );
}

interface FormActionsProps {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function FormActions({ children, className, align = 'end' }: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        align === 'start' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'end' && 'justify-end',
        className
      )}
    >
      {children}
    </div>
  );
}

export function ValidationMessage({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {children}
    </p>
  );
}
