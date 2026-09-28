'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  LockKeyhole,
  Save,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { CURRENCIES, TIMEZONES } from '@/constants';
import { useBusiness } from '@/features/business/hooks/use-business';
import { getBookingPageUrl } from '@/features/business/utils/booking-page-url';
import { handleError } from '@/lib/errors/error-handler';
import { settingsSchema, type SettingsFormData } from '../schemas/settings.schema';
import { getBusinessTypeName, updateBusinessSettings } from '../services/settings.service';

interface SettingsFormProps {
  onSaved?: () => void;
}

const emptyValues: SettingsFormData = {
  business_name: '',
  phone: '',
  email: '',
  address: '',
  logo_url: '',
  currency: 'USD',
  timezone: 'UTC',
  booking_page_slug: '',
};

export function SettingsForm({ onSaved }: SettingsFormProps) {
  const {
    business,
    membership,
    settings,
    loading,
    error,
    refresh: refreshBusiness,
  } = useBusiness();
  const [businessTypeName, setBusinessTypeName] = useState<string | null>(null);
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const canEdit = membership?.role === 'owner' || membership?.role === 'admin';

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: emptyValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin);
  }, [origin]);

  useEffect(() => {
    if (!settings) return;
    reset({
      business_name: settings.business_name || '',
      phone: settings.phone || '',
      email: settings.email || '',
      address: settings.address || '',
      logo_url: settings.logo_url || '',
      currency: settings.currency || 'USD',
      timezone: settings.timezone || 'UTC',
      booking_page_slug: settings.booking_page_slug || '',
    });
  }, [reset, settings]);

  useEffect(() => {
    let active = true;
    void getBusinessTypeName(business?.business_type_id ?? null)
      .then((name) => {
        if (active) setBusinessTypeName(name);
      })
      .catch(() => {
        if (active) setBusinessTypeName(null);
      });
    return () => {
      active = false;
    };
  }, [business?.business_type_id]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isDirty]);

  const selectedTimezone = watch('timezone');
  const selectedCurrency = watch('currency');
  const bookingPageSlug = watch('booking_page_slug');
  const bookingUrl = useMemo(
    () => getBookingPageUrl(bookingPageSlug, origin),
    [bookingPageSlug, origin]
  );
  const currency = CURRENCIES.find((item) => item.code === selectedCurrency);

  const handleSave = handleSubmit(async (values) => {
    if (!business?.id || !settings?.updated_at || !canEdit) return;
    setSaveState('idle');

    try {
      const result = await updateBusinessSettings(
        business.id,
        values,
        settings.updated_at
      );
      if (result.error) {
        if (result.error.message.includes('CALORA_BUSINESS_SETTINGS_STALE')) {
          toast.error('These settings changed elsewhere. Your workspace has been refreshed.');
          await refreshBusiness();
          return;
        }
        if ('code' in result.error && result.error.code === '23505') {
          toast.error('That booking page address is already in use.');
          return;
        }
        handleError(result.error, { fallbackMessage: 'Failed to save settings.' });
        return;
      }

      await refreshBusiness();
      setSaveState('saved');
      toast.success('Business settings saved');
      onSaved?.();
    } catch (cause) {
      handleError(cause, { fallbackMessage: 'Failed to save settings.' });
    }
  });

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading business settings">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !business || !settings) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Business settings unavailable</AlertTitle>
        <AlertDescription>
          <p>We could not load the authoritative workspace settings.</p>
          <Button className="mt-3" variant="outline" onClick={() => void refreshBusiness()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="business-settings-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="business-settings-heading" className="text-lg font-semibold text-foreground">
            Business identity
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Customer-facing identity and the regional settings shared across Calora.
          </p>
        </div>
        {businessTypeName && <Badge variant="secondary">{businessTypeName}</Badge>}
      </div>

      {!canEdit && (
        <Alert>
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            Only business owners and administrators can change workspace settings.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
            Customer-facing profile
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            These details are used where Calora already presents your business to customers.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="business_name">Display name</Label>
            <Input
              id="business_name"
              {...register('business_name')}
              disabled={!canEdit || isSubmitting}
              aria-invalid={Boolean(errors.business_name)}
              aria-describedby="business-name-help business-name-error"
            />
            <p id="business-name-help" className="text-xs leading-5 text-muted-foreground">
              Shown on your customer booking experience and notifications.
            </p>
            {errors.business_name && (
              <p id="business-name-error" className="text-sm text-destructive">
                {errors.business_name.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Business phone" id="phone" error={errors.phone?.message}>
              <Input id="phone" type="tel" {...register('phone')} disabled={!canEdit || isSubmitting} />
            </Field>
            <Field label="Business email" id="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} disabled={!canEdit || isSubmitting} />
            </Field>
          </div>

          <Field label="Business address" id="address" error={errors.address?.message}>
            <Textarea id="address" rows={3} {...register('address')} disabled={!canEdit || isSubmitting} />
          </Field>

          <Field
            label="Logo URL"
            id="logo_url"
            error={errors.logo_url?.message}
            help="Used only where the existing customer-facing experience supports a logo."
          >
            <Input id="logo_url" type="url" {...register('logo_url')} disabled={!canEdit || isSubmitting} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Globe2 className="h-5 w-5 text-primary" aria-hidden="true" />
            Regional authority
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Timezone controls business-local dates and times. Currency controls display formatting only.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit || isSubmitting}>
                  <SelectTrigger id="currency" aria-describedby="currency-help">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.label} ({item.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p id="currency-help" className="text-xs leading-5 text-muted-foreground">
              Current display format: {currency?.label ?? selectedCurrency} ({selectedCurrency}).
              No payment processing is enabled.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Business timezone</Label>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit || isSubmitting}>
                  <SelectTrigger id="timezone" aria-describedby="timezone-help">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezone.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p id="timezone-help" className="text-xs leading-5 text-muted-foreground">
              Dashboard, Calendar, Analytics, booking, and reminders use {selectedTimezone}.
              Existing appointment times are not rewritten when this setting changes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Public booking identity</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Set the unique address here, then use the Booking Page workspace to share and preview it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Booking page slug"
            id="booking_page_slug"
            error={errors.booking_page_slug?.message}
            help="Lowercase letters, numbers, and hyphens only."
          >
            <Input
              id="booking_page_slug"
              {...register('booking_page_slug')}
              disabled={!canEdit || isSubmitting}
            />
          </Field>

          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Public URL
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">
              {bookingUrl || 'Choose a valid slug to create your booking URL.'}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={!bookingUrl}
                onClick={async () => {
                  if (!bookingUrl) return;
                  try {
                    await navigator.clipboard.writeText(bookingUrl);
                    toast.success('Booking link copied');
                  } catch {
                    toast.error('Unable to copy the booking link.');
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                Copy link
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link href="/dashboard/booking-page">
                  Open Booking Page workspace
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {isSubmitting
            ? 'Saving authoritative business settings…'
            : saveState === 'saved' && !isDirty
              ? 'Changes saved.'
              : isDirty
                ? 'You have unsaved changes.'
                : 'Business settings are up to date.'}
        </p>
        <Button
          onClick={handleSave}
          disabled={!canEdit || !isDirty || !isValid || isSubmitting}
          className="min-w-36"
        >
          {saveState === 'saved' && !isDirty ? (
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
          ) : (
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {help && <p className="text-xs leading-5 text-muted-foreground">{help}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
