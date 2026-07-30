'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
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

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setAuthError(null);
    try {
      await resetPassword(values.email, `${window.location.origin}${AUTH_ROUTES.resetPassword}`);
      setSubmittedEmail(values.email);
      setSent(true);
      toast.success('Password reset link sent.');
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'An unexpected error occurred.';
      setAuthError(message);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Calendar className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-foreground">Calora</span>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
            <Mail className="h-6 w-6 text-success" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {"We've sent a password reset link to "}
            <span className="font-medium text-foreground">{submittedEmail}</span>.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            If you don't see it, check your spam folder.
          </p>
          <Link href={AUTH_ROUTES.login}>
            <Button variant="outline" className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {"Enter your email and we'll send you a link to reset your password."}
          </p>

          {authError && (
            <div className="mt-4">
              <InlineAlert variant="error">{authError}</InlineAlert>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          autoComplete="email"
                          aria-describedby={undefined}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <LoadingButton type="submit" className="w-full" loading={form.formState.isSubmitting}>
                Send reset link
                {!form.formState.isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </LoadingButton>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link href={AUTH_ROUTES.login} className="font-medium text-primary hover:text-primary">
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
