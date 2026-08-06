'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, MailCheck, ArrowLeft } from 'lucide-react';
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
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
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
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setAuthError(null);
    try {
      await resetPassword(values.email, `${window.location.origin}${AUTH_ROUTES.resetPassword}`);
      setSubmittedEmail(values.email);
      setSent(true);
      setCountdown(RESEND_COOLDOWN);
      toast.success('Password reset link sent.');
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'An unexpected error occurred.';
      setAuthError(message);
    }
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setAuthError(null);
    try {
      await resetPassword(submittedEmail, `${window.location.origin}${AUTH_ROUTES.resetPassword}`);
      setCountdown(RESEND_COOLDOWN);
      toast.success('Reset link resent.');
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'An unexpected error occurred.';
      setAuthError(message);
    } finally {
      setResending(false);
    }
  }, [countdown, resending, submittedEmail]);

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Calendar className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-h5 text-foreground">Calora</span>
      </div>

      {sent ? (
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
            <MailCheck className="h-6 w-6 text-success" />
          </div>
          <h1 className="mt-4 text-h1 text-foreground">Check your inbox</h1>
          <p className="mt-2 text-body text-muted-foreground">
            {"We've sent a secure password reset link to "}
            <span className="font-medium text-foreground">{submittedEmail}</span>.
          </p>
          <p className="mt-1 text-body text-muted-foreground">
            If you don't see it, check your spam folder.
          </p>

          <div aria-live="polite">
            {authError && (
              <div className="mt-5">
                <InlineAlert variant="error">{authError}</InlineAlert>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-3">
            <LoadingButton
              type="button"
              className="h-12 w-full text-body font-medium shadow-elevation-2 transition-base hover:bg-primary/90 hover:shadow-elevation-3 active:scale-[0.99] focus-visible:shadow-elevation-3"
              loading={resending}
              disabled={countdown > 0}
              onClick={handleResend}
            >
              {countdown > 0
                ? `Resend in ${countdown}s`
                : 'Resend email'}
            </LoadingButton>

            <Link href={AUTH_ROUTES.login} className="block">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-body font-medium transition-fast"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-h1 text-foreground">Reset your password</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Enter the email associated with your account and we'll send you a secure password reset link.
          </p>

          <div aria-live="polite">
            {authError && (
              <div className="mt-5">
                <InlineAlert variant="error">{authError}</InlineAlert>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        className="h-12 transition-fast"
                        autoComplete="email"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <LoadingButton
                type="submit"
                className="h-12 w-full text-body font-medium shadow-elevation-2 transition-base hover:bg-primary/90 hover:shadow-elevation-3 active:scale-[0.99] focus-visible:shadow-elevation-3"
                loading={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
              </LoadingButton>
            </form>
          </Form>

          <p className="mt-8 text-center text-small text-muted-foreground">
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
