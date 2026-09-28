'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Check,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { InlineAlert } from '@/components/shared/inline-alert';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { setNewPassword } from '../services/auth.service';
import { AuthError } from '@/lib/auth/errors';
import { AUTH_ROUTES } from '@/lib/auth/redirects';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),

    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const PASSWORD_REQUIREMENTS = [
  {
    label: 'At least 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    label: 'One uppercase letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: 'One lowercase letter',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: 'One number',
    test: (password: string) => /[0-9]/.test(password),
  },
];

export function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password');
  const isSubmitting = form.formState.isSubmitting;

  const strength = useMemo(() => {
    return PASSWORD_REQUIREMENTS.filter((requirement) =>
      requirement.test(password)
    ).length;
  }, [password]);

  const strengthPercent =
    (strength / PASSWORD_REQUIREMENTS.length) * 100;

  const strengthLabel =
    strength <= 1
      ? 'Weak'
      : strength === 2
        ? 'Fair'
        : strength === 3
          ? 'Good'
          : 'Strong';

  const strengthColor =
    strength <= 1
      ? 'bg-error'
      : strength === 2
        ? 'bg-warning'
        : strength === 3
          ? 'bg-info'
          : 'bg-success';

  const onSubmit = async (values: ResetPasswordValues) => {
    setAuthError(null);

    try {
      await setNewPassword(values.password);

      setSuccess(true);

      toast.success('Password updated successfully.');
    } catch (err) {
      const message =
        err instanceof AuthError
          ? err.message
          : 'An unexpected error occurred.';

      setAuthError(message);
    }
  };

  return (
    <div>
      {success ? (
        /* =====================================================
           SUCCESS STATE
           ===================================================== */
        <div className="text-center">
          {/* Success icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15">
            <Check
              className="h-8 w-8 text-success"
              aria-hidden="true"
            />
          </div>

          {/* Header */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Password updated
            </h1>

            <p className="mt-2 text-body text-muted-foreground">
              Your password has been changed successfully. You
              can now sign in with your new password.
            </p>
          </div>

          {/* Continue */}
          <Link
            href={AUTH_ROUTES.login}
            className="block"
          >
            <Button
              className="mt-8 h-12 w-full rounded-xl text-body font-medium shadow-elevation-2 transition-base hover:bg-primary/90 hover:shadow-elevation-3 active:scale-[0.99] focus-visible:shadow-elevation-3"
            >
              Continue to sign in

              <ArrowRight
                className="ml-2 h-4 w-4"
                aria-hidden="true"
              />
            </Button>
          </Link>
        </div>
      ) : (
        /* =====================================================
           RESET FORM
           ===================================================== */
        <>
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Create a new password
            </h1>

            <p className="mt-2 text-body text-muted-foreground">
              Choose a strong password for your Calora account.
            </p>
          </div>

          {/* Authentication error */}
          <div
            aria-live="polite"
            aria-atomic="true"
          >
            {authError && (
              <div className="mt-5">
                <InlineAlert variant="error">
                  {authError}
                </InlineAlert>
              </div>
            )}
          </div>

          {/* Form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-7 space-y-5"
              noValidate
            >
              {/* New password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      New password
                    </FormLabel>

                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={
                            showPassword
                              ? 'text'
                              : 'password'
                          }
                          placeholder="Create a password"
                          className="h-12 rounded-xl bg-background/70 pl-4 pr-12 transition-fast"
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          autoFocus
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(
                              (visible) => !visible
                            )
                          }
                          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                          aria-label={
                            showPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          aria-pressed={showPassword}
                          disabled={isSubmitting}
                        >
                          {showPassword ? (
                            <EyeOff
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          ) : (
                            <Eye
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </div>
                    </FormControl>

                    <FormMessage />

                    {/* Password requirements */}
                    {password.length > 0 && (
                      <div
                        className="mt-3 space-y-4 rounded-xl border border-border/70 bg-muted/25 p-3.5"
                        aria-live="polite"
                      >
                        {/* Strength */}
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                              style={{
                                width: `${strengthPercent}%`,
                              }}
                            />
                          </div>

                          <span className="min-w-[42px] text-right text-small font-medium text-muted-foreground">
                            {strengthLabel}
                          </span>
                        </div>

                        {/* Requirements */}
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {PASSWORD_REQUIREMENTS.map(
                            (requirement) => {
                              const met =
                                requirement.test(password);

                              return (
                                <li
                                  key={requirement.label}
                                  className={`flex items-center gap-1.5 text-small transition-fast ${met
                                    ? 'text-success'
                                    : 'text-muted-foreground'
                                    }`}
                                >
                                  <Check
                                    className={`h-3.5 w-3.5 shrink-0 transition-fast ${met
                                      ? 'opacity-100'
                                      : 'opacity-30'
                                      }`}
                                    aria-hidden="true"
                                  />

                                  <span>
                                    {requirement.label}
                                  </span>
                                </li>
                              );
                            }
                          )}
                        </ul>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Confirm password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Confirm new password
                    </FormLabel>

                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={
                            showConfirmPassword
                              ? 'text'
                              : 'password'
                          }
                          placeholder="Re-enter your password"
                          className="h-12 rounded-xl bg-background/70 pl-4 pr-12 transition-fast"
                          autoComplete="new-password"
                          disabled={isSubmitting}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(
                              (visible) => !visible
                            )
                          }
                          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          aria-pressed={showConfirmPassword}
                          disabled={isSubmitting}
                        >
                          {showConfirmPassword ? (
                            <EyeOff
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          ) : (
                            <Eye
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </div>
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <LoadingButton
                type="submit"
                className="h-12 w-full rounded-xl text-body font-medium shadow-elevation-2 transition-base hover:bg-primary/90 hover:shadow-elevation-3 active:scale-[0.99] focus-visible:shadow-elevation-3"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Updating password…'
                  : 'Update password'}

                {!isSubmitting && (
                  <ArrowRight
                    className="ml-2 h-4 w-4"
                    aria-hidden="true"
                  />
                )}
              </LoadingButton>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
