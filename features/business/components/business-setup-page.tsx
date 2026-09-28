'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  Link2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { InlineAlert } from '@/components/shared/inline-alert';
import { LoadingButton } from '@/components/shared/loading-button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { useBusiness } from '@/features/business/hooks/use-business';
import { createBusiness, getBusinessTypes } from '@/features/business/services/business.service';
import { businessSetupSchema, type BusinessSetupFormData } from '@/features/business/schemas/business-setup.schema';
import { getSetupErrorMessage } from '@/features/business/utils/setup-error';
import type { BusinessType } from '@/types/database';

const workspaceFacts = [
  {
    icon: Link2,
    title: 'Booking identity',
    description: 'A unique booking address',
  },
  {
    icon: CalendarClock,
    title: 'Initial schedule',
    description: 'Monday–Friday, 9:00–17:00',
  },
  {
    icon: Sparkles,
    title: '14-day trial',
    description: 'Starts when your workspace is created',
  },
] as const;

export function BusinessSetupPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const { refresh } = useBusiness();
  const submissionStartedRef = useRef(false);
  const [types, setTypes] = useState<BusinessType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const form = useForm<BusinessSetupFormData>({
    resolver: zodResolver(businessSetupSchema),
    defaultValues: {
      businessName: '',
      businessTypeId: '',
    },
    mode: 'onChange',
  });

  const loadBusinessTypes = useCallback(async () => {
    setTypesLoading(true);
    setTypesError(false);
    try {
      const result = await getBusinessTypes();
      setTypes(result);
      if (result.length === 0) setTypesError(true);
    } catch {
      setTypesError(true);
    } finally {
      setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBusinessTypes();
  }, [loadBusinessTypes]);

  const submit = form.handleSubmit(async (values) => {
    if (!user || submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    setSubmitError(null);

    try {
      await createBusiness({
        name: values.businessName,
        businessTypeId: values.businessTypeId,
      });
      setWorkspaceReady(true);
      await refresh();
      router.replace('/dashboard');
    } catch (cause) {
      submissionStartedRef.current = false;
      setSubmitError(getSetupErrorMessage(cause));
    }
  });

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.24 };

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-primary/[0.055] to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-14 lg:px-8 lg:py-12 xl:py-14">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          aria-labelledby="setup-heading"
          className="min-w-0"
        >
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Workspace setup
            </p>
            <h1 id="setup-heading" className="mt-2.5 text-3xl font-bold tracking-tight text-foreground sm:text-[2.5rem] sm:leading-tight">
              Let’s set up your business
            </h1>
            <p className="mt-2.5 max-w-lg text-base leading-6 text-muted-foreground">
              Add two basics and Calora will prepare your workspace.
            </p>
          </div>

          <div className="mt-7 max-w-2xl">
            {submitError && (
              <InlineAlert variant="error" title="Your workspace was not created" className="mb-5">
                {submitError}
              </InlineAlert>
            )}

            {workspaceReady ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl bg-muted/30 text-center" aria-live="polite">
                <motion.div
                  initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={transition}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success"
                >
                  <Check className="h-6 w-6" aria-hidden="true" />
                </motion.div>
                <h2 className="mt-5 text-xl font-semibold text-foreground">Your workspace is ready</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Opening your Calora dashboard…
                </p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={submit} className="space-y-6" noValidate>
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Business name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="organization"
                            autoFocus
                            maxLength={120}
                            placeholder="e.g. Krishna Clinic"
                            className="h-12 rounded-xl border-border/90 bg-card px-4 text-base shadow-sm transition-shadow focus-visible:shadow-elevation-1"
                            disabled={form.formState.isSubmitting}
                          />
                        </FormControl>
                        <FormDescription className="text-xs leading-5">
                          This is the name customers will see when booking.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="businessTypeId"
                    render={({ field, fieldState }) => (
                      <fieldset>
                        <legend className="text-sm font-semibold text-foreground">Business type</legend>
                        <p id="business-type-description" className="mt-1 text-xs leading-5 text-muted-foreground">
                          Choose the closest fit. You can change business details later.
                        </p>

                        {typesLoading ? (
                          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-label="Loading business types">
                            {Array.from({ length: 6 }, (_, index) => (
                              <Skeleton key={index} className="h-16 rounded-xl" />
                            ))}
                          </div>
                        ) : typesError ? (
                          <InlineAlert variant="warning" title="Business types unavailable" className="mt-4">
                            <span>We couldn’t load the available business types.</span>
                            <button
                              type="button"
                              onClick={() => void loadBusinessTypes()}
                              className="ml-1 font-medium text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Try again
                            </button>
                          </InlineAlert>
                        ) : (
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={form.formState.isSubmitting}
                            aria-describedby="business-type-description business-type-error"
                            className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3"
                          >
                            {types.map((type) => {
                              const selected = field.value === type.id;
                              return (
                                <label
                                  key={type.id}
                                  className={cn(
                                    'relative flex min-h-16 cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 shadow-sm transition-[border-color,background-color,box-shadow,transform]',
                                    'hover:-translate-y-px hover:border-primary/45 hover:shadow-elevation-1',
                                    'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                                    selected && 'border-primary bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary))]',
                                    form.formState.isSubmitting && 'cursor-not-allowed opacity-60'
                                  )}
                                >
                                  <RadioGroupItem value={type.id} aria-label={type.name} />
                                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{type.name}</span>
                                  {selected && (
                                    <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                      <Check className="h-3 w-3" aria-hidden="true" />
                                      <span className="sr-only">Selected</span>
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </RadioGroup>
                        )}
                        {fieldState.error && (
                          <p id="business-type-error" className="mt-2 text-sm font-medium text-destructive">
                            {fieldState.error.message}
                          </p>
                        )}
                      </fieldset>
                    )}
                  />

                  <div className="pt-1">
                    <LoadingButton
                      type="submit"
                      loading={form.formState.isSubmitting}
                      disabled={!form.formState.isValid || typesLoading || typesError}
                      className="h-12 w-full rounded-xl px-6 text-base shadow-elevation-1 transition-shadow hover:shadow-elevation-2 sm:w-auto sm:min-w-60"
                    >
                      {form.formState.isSubmitting ? 'Creating your workspace…' : 'Create my business'}
                      {!form.formState.isSubmitting && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
                    </LoadingButton>
                    <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
                      14-day free trial · No credit card required
                    </p>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </motion.section>

        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...transition, delay: reduceMotion ? 0 : 0.05 }}
          className="self-start border-t border-border/80 pt-6 sm:rounded-2xl sm:border sm:bg-muted/25 sm:p-6 lg:sticky lg:top-8 lg:mt-7"
          aria-labelledby="workspace-preview-heading"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preparing</p>
              <h2 id="workspace-preview-heading" className="mt-0.5 text-base font-semibold text-foreground">
                Your Calora workspace
              </h2>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-border/70 bg-background/75">
            {workspaceFacts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div key={fact.title} className="flex items-center gap-3 border-b border-border/60 px-3.5 py-3 last:border-b-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-muted-foreground">{fact.title}</h3>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">{fact.description}</p>
                  </div>
                  <Check className="ml-auto h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
            Created securely for your account
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
