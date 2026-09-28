'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
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

import { signIn } from '../services/auth.service';
import { AuthError } from '@/lib/auth/errors';
import {
  AUTH_ROUTES,
  getLoginRedirectUrl,
} from '@/lib/auth/redirects';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: LoginValues) => {
    setAuthError(null);

    try {
      await signIn(values.email, values.password);

      toast.success('Welcome back!');

      router.replace(getLoginRedirectUrl(searchParams));
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
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>

        <p className="mt-2 text-body text-muted-foreground">
          Sign in to your Calora workspace.
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

      {/* Login form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-7 space-y-5"
          noValidate
        >
          {/* Email */}
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
                <div className="flex items-baseline justify-between gap-4">
                  <FormLabel>
                    Password
                  </FormLabel>

                  <Link
                    href={AUTH_ROUTES.forgotPassword}
                    className="text-small font-medium text-primary transition-fast hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      className="h-12 rounded-xl bg-background/70 pl-4 pr-12 transition-fast"
                      autoComplete="current-password"
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
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </LoadingButton>
        </form>
      </Form>

      {/* Register */}
      <p className="mt-6 text-center text-small text-muted-foreground">
        {"Don't have an account? "}

        <Link
          href={AUTH_ROUTES.register}
          className="font-medium text-primary transition-fast hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
