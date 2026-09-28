'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
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

import { signUp } from '../services/auth.service';
import { AuthError } from '@/lib/auth/errors';
import { AUTH_ROUTES } from '@/lib/auth/redirects';

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters'),

    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),

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

type RegisterValues = z.infer<typeof registerSchema>;

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

export function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
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

  const onSubmit = useCallback(
    async (values: RegisterValues) => {
      setAuthError(null);

      try {
        const data = await signUp(
          values.email,
          values.password,
          values.fullName
        );

        if (data.session) {
          toast.success('Account created! Welcome to Calora.');

          router.replace(AUTH_ROUTES.dashboard);
          return;
        }

        toast.success(
          'Account created! Please check your email to verify your account.'
        );

        router.replace(
          `${AUTH_ROUTES.verifyEmail}?email=${encodeURIComponent(
            values.email
          )}`
        );
      } catch (err) {
        const message =
          err instanceof AuthError
            ? err.message
            : 'An unexpected error occurred.';

        setAuthError(message);
      }
    },
    [router]
  );

  return (
    <div>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Create your Calora account
        </h1>

        <p className="mt-2 text-body text-muted-foreground">
          Create your account, then set up your business.
        </p>
        <p className="mt-2 text-xs font-medium text-primary">
          14-day free trial · No credit card required
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

      {/* Registration form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-7 space-y-5"
          noValidate
        >
          {/* Full name */}
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>

                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="Jane Doe"
                    className="h-12 rounded-xl bg-background/70 px-4 transition-fast"
                    autoComplete="name"
                    disabled={isSubmitting}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
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
                    className="h-12 rounded-xl bg-background/70 px-4 transition-fast"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={isSubmitting}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>

                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      className="h-12 rounded-xl bg-background/70 pl-4 pr-12 transition-fast"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                  </FormControl>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((visible) => !visible)
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
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <FormMessage />

                {/* Password requirements */}
                {password.length > 0 && (
                  <div
                    className="mt-3 rounded-xl border border-border/70 bg-muted/25 p-3.5"
                    aria-live="polite"
                  >
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

                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
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
                <FormLabel>Confirm password</FormLabel>

                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Confirm your password"
                      className="h-12 rounded-xl bg-background/70 pl-4 pr-12 transition-fast"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                  </FormControl>

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
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

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
              ? 'Creating your account…'
              : 'Create account'}
          </LoadingButton>
        </form>
      </Form>

      {/* Login */}
      <p className="mt-5 text-center text-small text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={AUTH_ROUTES.login}
          className="font-medium text-primary transition-fast hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
