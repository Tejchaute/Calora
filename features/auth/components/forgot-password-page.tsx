'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MailCheck,
  ArrowLeft,
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

import { resetPassword } from '../services/auth.service';
import { AuthError } from '@/lib/auth/errors';
import { AUTH_ROUTES } from '@/lib/auth/redirects';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const RESEND_COOLDOWN = 30;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: ForgotPasswordValues) => {
    setAuthError(null);

    try {
      await resetPassword(
        values.email,
        `${window.location.origin}${AUTH_ROUTES.resetPassword}`
      );

      setSubmittedEmail(values.email);
      setSent(true);
      setCountdown(RESEND_COOLDOWN);

      toast.success('Password reset link sent.');
    } catch (err) {
      const message =
        err instanceof AuthError
          ? err.message
          : 'An unexpected error occurred.';

      setAuthError(message);
    }
  };

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    setAuthError(null);

    try {
      await resetPassword(
        submittedEmail,
        `${window.location.origin}${AUTH_ROUTES.resetPassword}`
      );

      setCountdown(RESEND_COOLDOWN);

      toast.success('Reset link resent.');
    } catch (err) {
      const message =
        err instanceof AuthError
          ? err.message
          : 'An unexpected error occurred.';

      setAuthError(message);
    } finally {
      setResending(false);
    }
  }, [countdown, resending, submittedEmail]);

  return (
    <div>
      {sent ? (
        /* =====================================================
           SUCCESS STATE
           ===================================================== */
        <div className="text-center">
          {/* Success icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15">
            <MailCheck
              className="h-8 w-8 text-success"
              aria-hidden="true"
            />
          </div>

          {/* Header */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Check your inbox
            </h1>

            <p className="mt-2 text-body text-muted-foreground">
              We&apos;ve sent a password reset link to
            </p>
          </div>

          {/* Email */}
          <div className="mt-4 inline-flex max-w-full rounded-lg border border-border bg-muted/60 px-3 py-2">
            <span className="truncate text-small font-medium text-foreground">
              {submittedEmail}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If you don&apos;t see the email, check your spam folder or
            request another link.
          </p>

          {/* Error */}
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

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <LoadingButton
              type="button"
              className="h-12 w-full rounded-xl text-body font-medium shadow-elevation-2 transition-base hover:bg-primary/90 hover:shadow-elevation-3 active:scale-[0.99] focus-visible:shadow-elevation-3 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-elevation-1"
              loading={resending}
              disabled={countdown > 0 || resending}
              onClick={handleResend}
            >
              {countdown > 0
                ? `Resend in ${countdown}s`
                : 'Resend email'}
            </LoadingButton>

            <Link
              href={AUTH_ROUTES.login}
              className="block"
            >
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-xl text-body font-medium transition-fast"
              >
                <ArrowLeft
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* =====================================================
           INITIAL STATE
           ===================================================== */
        <>
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Forgot your password?
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-body leading-6 text-muted-foreground">
              Enter the email associated with your account and we&apos;ll send you a reset link.
            </p>
          </div>

          {/* Error */}
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
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email address
                    </FormLabel>

                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        className="h-12 rounded-xl bg-background/70 px-4 transition-fast"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        autoFocus
                        disabled={isSubmitting}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <LoadingButton
                type="submit"
                className="h-12 w-full rounded-xl text-body font-medium shadow-elevation-2 transition-base hover:bg-primary/90 hover:shadow-elevation-3 active:scale-[0.99] focus-visible:shadow-elevation-3"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Sending…'
                  : 'Send reset link'}
              </LoadingButton>
            </form>
          </Form>

          {/* Login */}
          <p className="mt-6 text-center text-small text-muted-foreground">
            Remember your password?{' '}
            <Link
              href={AUTH_ROUTES.login}
              className="font-medium text-primary transition-fast hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
