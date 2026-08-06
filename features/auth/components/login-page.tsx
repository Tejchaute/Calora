'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { AUTH_ROUTES, getLoginRedirectUrl } from '@/lib/auth/redirects';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
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
    defaultValues: { email: '', password: '', remember: false },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: LoginValues) => {
    setAuthError(null);
    try {
      await signIn(values.email, values.password);
      toast.success('Welcome back!');
      router.push(getLoginRedirectUrl(searchParams));
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

      <h1 className="text-h2 text-foreground sm:text-h1">Welcome back</h1>
      <p className="mt-2 text-body text-muted-foreground">
        Sign in to your account to continue.
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
                    className="h-12 transition-fast hover:border-foreground/20"
                    autoComplete="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-baseline justify-between gap-4 text-small leading-none">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href={AUTH_ROUTES.forgotPassword}
                    className="rounded-sm font-medium text-primary transition-fast hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      className="h-12 pr-12 transition-fast hover:border-foreground/20"
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="-my-2 flex cursor-pointer items-center gap-3 py-2 text-small font-normal text-muted-foreground transition-fast hover:text-foreground">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  Keep me signed in
                </FormLabel>
              </FormItem>
            )}
          />

          <LoadingButton
            type="submit"
            className="h-12 w-full text-body font-medium shadow-elevation-2 transition-base hover:bg-primary/90 hover:shadow-elevation-3"
            loading={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </LoadingButton>
        </form>
      </Form>

      <p className="mt-8 text-center text-small text-muted-foreground">
        {"Don't have an account? "}
        <Link
          href={AUTH_ROUTES.register}
          className="rounded-sm font-medium text-primary transition-fast hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
