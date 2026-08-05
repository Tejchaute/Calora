'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save, Building2, Globe, Link as LinkIcon, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CURRENCIES, TIMEZONES } from '@/constants';
import { settingsSchema } from '../schemas/settings.schema';
import { getBusinessSettings, updateBusinessSettings } from '../services/settings.service';
import { handleError } from '@/lib/errors/error-handler';
import type { BusinessSettings } from '@/types/database';

type SettingsFormValues = {
  business_name: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  currency: string;
  timezone: string;
  booking_page_slug: string;
};

interface SettingsFormProps {
  onSaved?: () => void;
}

export function SettingsForm({ onSaved }: SettingsFormProps) {
  const [settingsId, setSettingsId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: '',
      phone: '',
      email: '',
      address: '',
      logo_url: '',
      currency: 'USD',
      timezone: 'UTC',
      booking_page_slug: '',
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await getBusinessSettings();
      if (error) {
        handleError(error, { fallbackMessage: 'Failed to load settings' });
        return;
      }
      if (data) {
        setSettingsId(data.id);
        reset({
          business_name: data.business_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          logo_url: data.logo_url || '',
          currency: data.currency || 'USD',
          timezone: data.timezone || 'UTC',
          booking_page_slug: data.booking_page_slug || '',
        });
      }
    } catch (error) {
      handleError(error, { fallbackMessage: 'Unexpected error while loading settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      const { error } = await updateBusinessSettings(settingsId, values);
      if (error) {
        handleError(error, { fallbackMessage: 'Failed to save settings' });
        return;
      }
      toast.success('Settings saved');
      onSaved?.();
    } catch (error) {
      handleError(error, { fallbackMessage: 'Failed to save settings.' });
    }
  });

  const bookingUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/book` : '/book';

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-10 w-full animate-pulse rounded bg-muted" />
            <div className="mt-4 h-10 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input {...register('business_name')} placeholder="My Business" />
            {errors.business_name && (
              <p className="text-sm text-destructive">{errors.business_name.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register('phone')} placeholder="+1 234 567 890" />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register('email')} placeholder="contact@business.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea rows={2} {...register('address')} placeholder="123 Main St, City, State, ZIP" />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input {...register('logo_url')} placeholder="https://..." />
            {errors.logo_url && (
              <p className="text-sm text-destructive">{errors.logo_url.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Globe className="h-5 w-5 text-primary" />
            Regional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label} ({c.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <LinkIcon className="h-5 w-5 text-primary" />
            Booking Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Booking page URL</Label>
            <div className="flex items-center gap-2">
              <Input value={bookingUrl} readOnly className="flex-1 bg-muted/50" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(bookingUrl);
                  toast.success('Link copied to clipboard');
                }}
                title="Copy link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with your customers so they can book appointments online.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
