'use client';

import { useEffect, useState } from 'react';
import { Save, Building2, Globe, DollarSign, Link as LinkIcon, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { CURRENCIES, TIMEZONES } from '@/lib/constants';
import type { BusinessSettings } from '@/types/database';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('business_settings')
      .select('*')
      .maybeSingle();
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('business_settings')
      .update({
        business_name: settings.business_name,
        logo_url: settings.logo_url,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        currency: settings.currency,
        timezone: settings.timezone,
        booking_page_slug: settings.booking_page_slug,
      })
      .eq('id', settings.id);
    if (error) {
      toast.error('Failed to save settings');
      setSaving(false);
      return;
    }
    toast.success('Settings saved');
    setSaving(false);
  };

  const bookingUrl = settings?.booking_page_slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book`
    : '';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure your business information and preferences.</p>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-blue-600" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input
              value={settings?.business_name || ''}
              onChange={(e) => setSettings({ ...settings!, business_name: e.target.value })}
              placeholder="My Business"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={settings?.phone || ''}
                onChange={(e) => setSettings({ ...settings!, phone: e.target.value })}
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={settings?.email || ''}
                onChange={(e) => setSettings({ ...settings!, email: e.target.value })}
                placeholder="contact@business.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              rows={2}
              value={settings?.address || ''}
              onChange={(e) => setSettings({ ...settings!, address: e.target.value })}
              placeholder="123 Main St, City, State, ZIP"
            />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              value={settings?.logo_url || ''}
              onChange={(e) => setSettings({ ...settings!, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Regional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Globe className="h-5 w-5 text-blue-600" />
            Regional Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                Currency
              </Label>
              <Select
                value={settings?.currency || 'USD'}
                onValueChange={(v) => setSettings({ ...settings!, currency: v })}
              >
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
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={settings?.timezone || 'UTC'}
                onValueChange={(v) => setSettings({ ...settings!, timezone: v })}
              >
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <LinkIcon className="h-5 w-5 text-blue-600" />
            Booking Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Booking page URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={bookingUrl}
                readOnly
                className="flex-1 bg-slate-50"
              />
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
            <p className="text-xs text-slate-500">
              Share this link with your customers so they can book appointments online.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !settings}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
