'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Lock, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
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
import { updatePassword } from '../services/auth.service';
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
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw: string) => /[0-9]/.test(pw) },
];

export function ResetPasswordPage() {
  const [showPassword,setShowPassword]=useState(false);

  const [showConfirmPassword,setShowConfirmPassword]=useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues:{
        password:"",
        confirmPassword:"",
    }
  })

  const password = form.watch('password');
  const strength = useMemo(() => {
    return PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
  }, [password]);

  const strengthPercent = (strength / PASSWORD_REQUIREMENTS.length) * 100;
  const strengthLabel = strength <= 1 ? 'Weak' : strength <= 2 ? 'Fair' : strength <= 3 ? 'Good' : 'Strong';
  const strengthColor = strength <= 1 ? 'bg-error' : strength <= 2 ? 'bg-warning' : strength <= 3 ? 'bg-info' : 'bg-success';

  const onSubmit = async (values: ResetPasswordValues) => {
    setAuthError(null);
    try {
      await updatePassword(values.password);
      setSuccess(true);
      toast.success('Password updated successfully.');
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
        <span className="text-h5 text-foreground">Calora</span>
      </div>

      {success ? (
        <div className="max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-6 text-h1 text-center text-foreground">Password updated</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Your password has been changed successfully. You can now sign in with your new password.
          </p>
          <Link href={AUTH_ROUTES.login}>
            <Button className="mt-8 h-12 w-full text-body font-medium shadow-elevation-2 transition-base hover:bg-primary/90 hover:shadow-elevation-3 active:scale-[0.99] ">
              Continue to sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-h1 text-foreground">Set a new password</h1>
          <p className="mt-2 text-center text-body text-muted-foreground">
            Choose a strong password for your account.
          </p>

          <div aria-live="polite">
            {authError && (
              <div className="mt-4">
                <InlineAlert variant="error">{authError}</InlineAlert>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="At least 8 characters"
                          className="h-12 pr-12 transition-fast"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />

                    {password.length > 0 && (
                      <div className="mt-3 rounded-lg border border-border bg-muted/40 p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-base ${strengthColor}`}
                              style={{ width: `${strengthPercent}%` }}
                            />
                          </div>
                          <span className="text-caption font-medium text-muted-foreground">{strengthLabel}</span>
                        </div>
                        <ul className="grid grid-cols-2 gap-2">
                          {PASSWORD_REQUIREMENTS.map((req) => {
                            const met = req.test(password);
                            return (
                              <li
                                key={req.label}
                                className={`flex items-center gap-1.5 text-caption ${met ? 'text-success' : 'text-muted-foreground'}`}
                              >
                                <Check className={`h-4 w-4 shrink-0 ${met ? 'opacity-100' : 'opacity-30'}`} />
                                {req.label}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FormControl>
                          <Input
                            {...field}
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Re-enter your password"
                            className="h-12 pr-12 transition-fast"
                            autoComplete="new-password"
                          />
                        </FormControl>

                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(v => !v)}
                          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          aria-pressed={showConfirmPassword}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <LoadingButton type="submit" className="
                                            h-12
                                            w-full
                                            text-body
                                            font-medium
                                            shadow-elevation-2
                                            transition-base
                                            hover:bg-primary/90
                                            hover:shadow-elevation-3
                                            active:scale-[0.99]
                                            " loading={form.formState.isSubmitting}>
                Update password
                {!form.formState.isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </LoadingButton>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
